import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import type { Platform } from '../shared/manifest'

const execFileAsync = promisify(execFile)

/** Nomes de processos em execução (minúsculos). */
export async function listProcessNames(platform: NodeJS.Platform = process.platform): Promise<Set<string>> {
  const names = new Set<string>()
  if (platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
      for (const line of stdout.split(/\r?\n/)) {
        const match = /^"([^"]+)"/.exec(line)
        if (match) names.add(match[1].toLowerCase())
      }
    } catch {
      // Sem tasklist (ambiente restrito): seguimos apenas com os processos que nós iniciamos.
    }
    return names
  }
  // Linux: /proc/<pid>/comm (até 15 caracteres) e argv[0].
  let pids: string[]
  try {
    pids = (await fs.readdir('/proc')).filter((p) => /^\d+$/.test(p))
  } catch {
    return names
  }
  await Promise.all(
    pids.map(async (pid) => {
      try {
        const comm = (await fs.readFile(`/proc/${pid}/comm`, 'utf8')).trim()
        if (comm) names.add(comm.toLowerCase())
        const cmdline = await fs.readFile(`/proc/${pid}/cmdline`, 'utf8')
        const argv0 = cmdline.split('\0')[0]
        if (argv0) names.add(path.basename(argv0).toLowerCase())
      } catch {
        // processo terminou durante a leitura
      }
    })
  )
  return names
}

/** Verifica se algum dos executáveis (por nome de arquivo) está rodando. */
export async function isAnyRunning(executables: string[], platform: NodeJS.Platform = process.platform): Promise<boolean> {
  if (executables.length === 0) return false
  const running = await listProcessNames(platform)
  return executables.some((exe) => {
    const base = path.basename(exe).toLowerCase()
    const noExt = base.replace(/\.(exe|appimage)$/i, '')
    // /proc/<pid>/comm é truncado em 15 caracteres
    return running.has(base) || running.has(noExt) || running.has(base.slice(0, 15)) || running.has(noExt.slice(0, 15))
  })
}

// A pasta vai por variável de ambiente, nunca montada dentro do comando.
const WINDOWS_COUNT_SCRIPT =
  '$d = $env:RELAUNCH_WATCH_DIR; ' +
  '@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($d, [StringComparison]::OrdinalIgnoreCase) }).Count'

async function countOnWindows(prefix: string): Promise<number> {
  // Caminho completo: não depende do PATH para achar o PowerShell.
  const shell = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  try {
    const { stdout } = await execFileAsync(shell, ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_COUNT_SCRIPT], {
      env: { ...process.env, RELAUNCH_WATCH_DIR: prefix },
      windowsHide: true,
      timeout: 15_000
    })
    return Number.parseInt(stdout.trim(), 10) || 0
  } catch {
    return 0
  }
}

async function countOnLinux(prefix: string): Promise<number> {
  const pids = (await fs.readdir('/proc').catch(() => [] as string[])).filter((p) => /^\d+$/.test(p) && Number(p) !== process.pid)
  let count = 0
  for (const pid of pids) {
    // Um AppImage aberto mantém o próprio arquivo como processo enquanto o programa roda.
    const exe = await fs.readlink(`/proc/${pid}/exe`).catch(() => '')
    if (exe.startsWith(prefix)) count++
  }
  return count
}

/**
 * Quantos programas estão rodando a partir de `dir` (executável dentro da pasta). Serve para saber se o
 * jogo continua aberto depois que o programa que o Relaunch abriu fechou (launchers próprios dos ports).
 * Se não der para consultar, responde 0, e o jogo conta como fechado, como antes.
 */
export async function countProcessesIn(dir: string, platform: Platform): Promise<number> {
  const prefix = path.resolve(dir) + path.sep
  if (platform === 'win32') return countOnWindows(prefix)
  if (platform === 'linux') return countOnLinux(prefix)
  return 0
}
