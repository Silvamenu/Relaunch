import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GameLauncher } from '../src/main/launcher'
import { countProcessesIn } from '../src/main/processes'
import { tempDir } from './helpers/fs'

const platform = process.platform === 'win32' ? 'win32' : 'linux'
const plan = (ms: number) => ({ exe: process.execPath, args: ['-e', `setTimeout(() => {}, ${ms})`], cwd: process.cwd(), env: {} })

describe('sessão de jogo', () => {
  it('o jogo só fecha quando nenhum programa da pasta dele continua aberto (launcher próprio do port)', async () => {
    // O programa aberto pelo Relaunch fecha logo; o "jogo" de verdade segue aberto até `stillOpen` virar false.
    let stillOpen = true
    const countProcessesIn = vi.fn(async () => (stillOpen ? 1 : 0))
    const exits: string[] = []
    const launcher = new GameLauncher(platform, { onStart: () => undefined, onExit: (id) => exits.push(id) }, { countProcessesIn, pollMs: 20 })

    await launcher.launch('g1', plan(10))
    await vi.waitFor(() => expect(countProcessesIn.mock.calls.length).toBeGreaterThanOrEqual(3), { timeout: 5000 })
    expect(exits).toEqual([])
    expect(launcher.isRunning('g1')).toBe(true)
    expect(countProcessesIn).toHaveBeenCalledWith(process.cwd())

    stillOpen = false
    await vi.waitFor(() => expect(exits).toEqual(['g1']), { timeout: 5000 })
    expect(launcher.isRunning('g1')).toBe(false)
    expect(launcher.anyRunning()).toBe(false)
  })

  it('dois jogos no mesmo emulador: fechar um não espera o outro', async () => {
    // A contagem da pasta vê só o emulador do jogo 2, que o próprio Relaunch abriu.
    let secondOpen = true
    const countProcessesIn = vi.fn(async () => (secondOpen ? 1 : 0))
    const exits: string[] = []
    const launcher = new GameLauncher(platform, { onStart: () => undefined, onExit: (id) => exits.push(id) }, { countProcessesIn, pollMs: 20 })

    await launcher.launch('g1', plan(10))
    await launcher.launch('g2', plan(3000))
    await vi.waitFor(() => expect(exits).toEqual(['g1']), { timeout: 2000 })
    expect(launcher.anyRunning()).toBe(true)

    secondOpen = false
    await vi.waitFor(() => expect(exits).toEqual(['g1', 'g2']), { timeout: 5000 })
    expect(launcher.anyRunning()).toBe(false)
  })

  it.runIf(process.platform === 'linux')('conta os programas que rodam a partir da pasta do jogo', async () => {
    const dir = await tempDir()
    const exe = path.join(dir, 'jogo')
    await fs.copyFile('/bin/sleep', exe)
    await fs.chmod(exe, 0o755)
    expect(await countProcessesIn(dir, 'linux')).toBe(0)
    const child = spawn(exe, ['30'], { stdio: 'ignore' })
    await new Promise((resolve) => child.once('spawn', resolve))
    expect(await countProcessesIn(dir, 'linux')).toBe(1)
    // Outra pasta com o mesmo começo de nome não conta.
    expect(await countProcessesIn(`${dir}-outra`, 'linux')).toBe(0)
    child.kill()
    await new Promise((resolve) => child.once('exit', resolve))
    expect(await countProcessesIn(dir, 'linux')).toBe(0)
  })
})
