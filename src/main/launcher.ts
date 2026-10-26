import { spawn } from 'node:child_process'
import { constants as fsConstants, promises as fs } from 'node:fs'
import path from 'node:path'
import { AppError } from '../shared/errors'
import type { Manifest, Platform } from '../shared/manifest'
import { launchArgsFor, launchEnvFor } from '../shared/manifestUtils'
import type { GameEntry } from '../shared/types'
import { expandVariables } from './pathVars'
import { countProcessesIn } from './processes'

export interface LaunchCallbacks {
  onStart: (entryId: string) => void
  /** Chamado ao fechar o jogo com a duração da sessão em segundos. */
  onExit: (entryId: string, seconds: number) => void
}

/** O que é executado ao abrir um jogo. */
export interface LaunchPlan {
  exe: string
  args: string[]
  cwd: string
  env: Record<string, string>
}

/** Jogo comum: o executável dele, com a pasta do jogo como diretório de trabalho. */
export function directPlan(manifest: Manifest, entry: GameEntry, exeRel: string, platform: Platform): LaunchPlan {
  const ctx = { gameDir: entry.path, platform }
  return {
    exe: path.join(entry.path, exeRel),
    args: launchArgsFor(manifest, platform).map((a) => expandVariables(a, ctx)),
    cwd: entry.path,
    env: Object.fromEntries(Object.entries(launchEnvFor(manifest, platform)).map(([k, v]) => [k, expandVariables(v, ctx)]))
  }
}

/**
 * Jogo via emulador: o emulador abre o arquivo do jogo do usuário. Roda na pasta do emulador (onde
 * ficam as configurações dele); {gameFile} e {gameDir} nos argumentos são o arquivo e a pasta do jogo.
 */
export function runnerPlan(
  game: { manifest: Manifest; entry: GameEntry; gameFile: string },
  emulator: { manifest: Manifest; entry: GameEntry; exe: string },
  platform: Platform
): LaunchPlan {
  const runner = game.manifest.runner
  const args = !runner ? [] : Array.isArray(runner.args) ? runner.args : (runner.args[platform] ?? ['{gameFile}'])
  const gameCtx = { gameDir: game.entry.path, platform }
  const emulatorCtx = { gameDir: emulator.entry.path, platform }
  return {
    exe: emulator.exe,
    args: args.map((a) => expandVariables(a, gameCtx, { gameFile: game.gameFile })),
    cwd: emulator.entry.path,
    env: Object.fromEntries(Object.entries(launchEnvFor(emulator.manifest, platform)).map(([k, v]) => [k, expandVariables(v, emulatorCtx)]))
  }
}

export interface LauncherOptions {
  /** Quantos programas rodam a partir de uma pasta (padrão: consulta o sistema). */
  countProcessesIn?: (dir: string) => Promise<number>
  /** Intervalo entre as consultas enquanto algum programa da pasta do jogo segue aberto. */
  pollMs?: number
}

/** Inicia os jogos e mede o tempo jogado. */
export class GameLauncher {
  /** Quantas sessões usam cada entrada agora (um emulador pode estar rodando vários jogos). */
  private readonly running = new Map<string, number>()
  /** Programas abertos pelo Relaunch que ainda rodam, por pasta (dois jogos no mesmo emulador). */
  private readonly liveIn = new Map<string, number>()
  private readonly countProcessesIn: (dir: string) => Promise<number>
  private readonly pollMs: number

  constructor(
    private readonly platform: Platform,
    private readonly callbacks: LaunchCallbacks,
    options: LauncherOptions = {}
  ) {
    this.countProcessesIn = options.countProcessesIn ?? ((dir) => countProcessesIn(dir, platform))
    this.pollMs = options.pollMs ?? 3000
  }

  isRunning(entryId: string): boolean {
    return (this.running.get(entryId) ?? 0) > 0
  }

  /** Algum jogo aberto agora. */
  anyRunning(): boolean {
    return this.running.size > 0
  }

  /**
   * Muitos ports abrem primeiro um launcher próprio, que fecha e deixa o jogo rodando. A sessão só
   * termina quando nenhum programa da pasta de onde o jogo foi aberto continua rodando, fora os de
   * outras sessões abertas pelo Relaunch na mesma pasta.
   */
  private async waitFolderIdle(dir: string): Promise<void> {
    while ((await this.countProcessesIn(dir)) > (this.liveIn.get(dir) ?? 0)) {
      await new Promise((resolve) => setTimeout(resolve, this.pollMs))
    }
  }

  /** `alsoBusy`: entradas usadas pelo jogo enquanto ele roda (o emulador não pode ser atualizado no meio). */
  async launch(entryId: string, plan: LaunchPlan, alsoBusy: string[] = []): Promise<void> {
    if (this.isRunning(entryId)) throw new AppError('ALREADY_RUNNING')
    const exe = plan.exe

    // AppImages e binários Linux precisam do bit de execução.
    if (this.platform !== 'win32') {
      try {
        await fs.access(exe, fsConstants.X_OK)
      } catch {
        await fs.chmod(exe, 0o755).catch(() => {
          throw new AppError('PERMISSION_DENIED', exe, { path: exe })
        })
      }
    }

    const child = spawn(exe, plan.args, {
      cwd: plan.cwd,
      env: { ...process.env, ...plan.env },
      stdio: 'ignore',
      windowsHide: false,
      detached: false
    })

    await new Promise<void>((resolve, reject) => {
      child.once('spawn', () => resolve())
      child.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') reject(new AppError('EXE_NOT_FOUND', exe, { path: exe }))
        else if (err.code === 'EACCES' || err.code === 'EPERM') reject(new AppError('PERMISSION_DENIED', exe, { path: exe }))
        else reject(new AppError('UNKNOWN', err.message))
      })
    })

    const startedAt = Date.now()
    const ids = [entryId, ...alsoBusy.filter((id) => id !== entryId)]
    ids.forEach((id) => this.running.set(id, (this.running.get(id) ?? 0) + 1))
    this.liveIn.set(plan.cwd, (this.liveIn.get(plan.cwd) ?? 0) + 1)
    this.callbacks.onStart(entryId)
    child.once('exit', () => {
      const live = (this.liveIn.get(plan.cwd) ?? 1) - 1
      if (live > 0) this.liveIn.set(plan.cwd, live)
      else this.liveIn.delete(plan.cwd)
      void this.waitFolderIdle(plan.cwd).finally(() => {
        for (const id of ids) {
          const left = (this.running.get(id) ?? 1) - 1
          if (left > 0) this.running.set(id, left)
          else this.running.delete(id)
        }
        this.callbacks.onExit(entryId, Math.round((Date.now() - startedAt) / 1000))
      })
    })
  }
}
