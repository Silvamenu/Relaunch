import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { AppUpdater as Updater } from 'electron-updater'
import { AppUpdater } from '../src/main/appUpdater'
import type { AppContext } from '../src/main/context'

// Como na versão instalada: só nela o launcher procura atualizações.
vi.mock('electron', () => ({ app: { isPackaged: true }, net: {}, Notification: class {} }))

function setup() {
  const fake = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    logger: null,
    checkForUpdates: vi.fn(async () => null),
    quitAndInstall: vi.fn()
  })
  const ctx = { emit: vi.fn(), store: { setReleaseNotes: vi.fn() } }
  const updater = new AppUpdater(ctx as unknown as AppContext, () => fake as unknown as Updater)
  return { fake, updater }
}

const tick = () => new Promise((resolve) => setImmediate(resolve))

describe('atualização do launcher', () => {
  it('baixa sozinha, mas fechar o app não instala nada', async () => {
    const { fake, updater } = setup()
    await updater.check()
    expect(fake.checkForUpdates).toHaveBeenCalledOnce()
    expect(fake.autoDownload).toBe(true)
    expect(fake.autoInstallOnAppQuit).toBe(false)
  })

  it('só instala quando o usuário clica em "Atualizar", sem as telas do instalador, e reabre o app', async () => {
    const { fake, updater } = setup()
    await updater.check()

    // Ainda baixando: o clique não faz nada.
    fake.emit('update-available', { version: '0.1.3' })
    updater.install()
    await tick()
    expect(fake.quitAndInstall).not.toHaveBeenCalled()

    fake.emit('update-downloaded', { version: '0.1.3', releaseNotes: '', releaseDate: '2026-10-26T00:00:00Z' })
    expect(updater.getState()).toMatchObject({ status: 'downloaded', version: '0.1.3' })
    await tick()
    expect(fake.quitAndInstall).not.toHaveBeenCalled()

    updater.install()
    await tick()
    // isSilent=true (sem telas), isForceRunAfter=true (reabre o app).
    expect(fake.quitAndInstall).toHaveBeenCalledExactlyOnceWith(true, true)
  })
})
