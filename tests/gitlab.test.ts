import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitLabClient, gitlabReleaseInfo } from '../src/main/gitlab'
import { runUpdateFlow, type UpdateFlowDeps } from '../src/main/updateCore'
import { parseManifest, type ReleaseUpdates } from '../src/shared/manifest'
import { fileNameFromDisposition, isAllowedGitlabAssetUrl, isAllowedRedirectHost, isAllowedReleaseAssetUrl } from '../src/shared/patterns'
import type { ReleaseInfo } from '../src/shared/types'
import { makeZip, readTree, tempDir, writeTree } from './helpers/fs'

const project = 'sonicdcer/MarioKart64Recomp'
const pkg = (id: number) => `https://gitlab.com/${project}/-/package_files/${id}/download`

describe('downloads do GitLab: só do próprio projeto no gitlab.com', () => {
  it('aceita arquivos de pacote, downloads de release, anexos e pacotes genéricos do projeto', () => {
    expect(isAllowedGitlabAssetUrl(pkg(333130840), project)).toBe(true)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project.toLowerCase()}/-/package_files/1/download`, project)).toBe(true)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project}/-/releases/v0.9.2/downloads/x.zip`, project)).toBe(true)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project}/uploads/abc/x.zip`, project)).toBe(true)
    expect(
      isAllowedGitlabAssetUrl(
        'https://gitlab.com/api/v4/projects/ethan4love%2Fpsx-recomp-port/packages/generic/digimon-world/0.3.5/digimon-world-0.3.5-win-x64.zip',
        'ethan4love/psx-recomp-port'
      )
    ).toBe(true)
    expect(isAllowedGitlabAssetUrl('https://gitlab.com/grupo/sub/jogo/-/package_files/1/download', 'grupo/sub/jogo')).toBe(true)
  })

  it('recusa outros sites, outros projetos, http, credenciais e caminhos fora dos arquivos de release', () => {
    expect(isAllowedGitlabAssetUrl('https://pixeldrain.com/u/LwGmaQg9', project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`http://gitlab.com/${project}/-/package_files/1/download`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com.evil.com/${project}/-/package_files/1/download`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`https://user:pw@gitlab.com/${project}/-/package_files/1/download`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl('https://gitlab.com/outro/projeto/-/package_files/1/download', project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project}Fake/-/package_files/1/download`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project}/-/jobs/1/artifacts/download`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl(`https://gitlab.com/${project}/-/package_files/../../../outro/x`, project)).toBe(false)
    expect(isAllowedGitlabAssetUrl('https://gitlab.com/api/v4/projects/outro%2Fprojeto/packages/generic/x/1/x.zip', project)).toBe(false)
  })

  it('cada fonte só aceita os próprios endereços e redirecionamentos', () => {
    const gitlab = { source: 'gitlab-releases' as const, repo: project }
    const github = { source: 'github-releases' as const, repo: 'HarbourMasters/Shipwright' }
    expect(isAllowedReleaseAssetUrl(pkg(1), gitlab)).toBe(true)
    expect(isAllowedReleaseAssetUrl(pkg(1), github)).toBe(false)
    expect(isAllowedReleaseAssetUrl('https://github.com/HarbourMasters/Shipwright/releases/download/1/x.zip', gitlab)).toBe(false)
    expect(isAllowedRedirectHost('https://gitlab.com/x', 'gitlab-releases')).toBe(true)
    expect(isAllowedRedirectHost('https://storage.googleapis.com/x', 'gitlab-releases')).toBe(false)
    expect(isAllowedRedirectHost('https://objects.githubusercontent.com/x', 'gitlab-releases')).toBe(false)
    expect(isAllowedRedirectHost('https://gitlab.com/x')).toBe(false)
  })

  it('lê o nome do arquivo informado pelo servidor, sem pastas', () => {
    expect(fileNameFromDisposition('attachment; filename="Jogo-Windows.zip"; filename*=UTF-8\'\'Jogo-Windows.zip')).toBe('Jogo-Windows.zip')
    expect(fileNameFromDisposition("attachment; filename*=UTF-8''Jogo%20HD.7z")).toBe('Jogo HD.7z')
    expect(fileNameFromDisposition('attachment; filename=jogo.tar.gz')).toBe('jogo.tar.gz')
    expect(fileNameFromDisposition('attachment; filename="../../evil.zip"')).toBe('evil.zip')
    expect(fileNameFromDisposition('attachment; filename="..\\\\..\\\\evil.exe"')).toBe('evil.exe')
    expect(fileNameFromDisposition('attachment; filename=".."')).toBeNull()
    expect(fileNameFromDisposition('inline')).toBeNull()
    expect(fileNameFromDisposition(null)).toBeNull()
  })
})

describe('releases do GitLab', () => {
  const raw = (tag: string, date: string, links: { name: string; url: string }[], upcoming = false) => ({
    tag_name: tag,
    name: null,
    description: 'notas',
    released_at: date,
    upcoming_release: upcoming,
    assets: { links },
    _links: { self: `https://gitlab.com/${project}/-/releases/${tag}` }
  })

  it('só oferece links do próprio projeto (o que está em outro site some da lista)', () => {
    const info = gitlabReleaseInfo(
      raw('v1', '2026-01-01T00:00:00Z', [
        { name: 'Jogo-Windows', url: pkg(1) },
        { name: 'Jogo-Windows-Completo', url: 'https://pixeldrain.com/u/abc' }
      ]),
      project
    )
    expect(info).toMatchObject({ tag: 'v1', name: 'v1', body: 'notas', prerelease: false, htmlUrl: `https://gitlab.com/${project}/-/releases/v1` })
    expect(info.assets).toEqual([{ name: 'Jogo-Windows', size: 0, url: pkg(1), digest: null }])
  })

  it('pega o mais novo que sirva, ignora os com data no futuro e trata projeto inexistente como sem releases', async () => {
    const requested: string[] = []
    const body = [
      raw('v2', '2026-03-01T00:00:00Z', [{ name: 'Jogo-Linux', url: pkg(2) }]),
      raw('v3', '2026-12-01T00:00:00Z', [{ name: 'Jogo-Windows', url: pkg(3) }], true),
      raw('v1', '2026-01-01T00:00:00Z', [{ name: 'Jogo-Windows', url: pkg(1) }])
    ]
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input)
      requested.push(url)
      return url.includes('inexistente') ? new Response('{}', { status: 404 }) : new Response(JSON.stringify(body), { status: 200 })
    }) as typeof fetch
    const client = new GitLabClient(fetchImpl)
    const windows = await client.getLatestRelease(project, false, (r) => r.assets.some((a) => a.name.includes('Windows')))
    expect(windows?.tag).toBe('v1')
    expect((await client.getLatestRelease(project, true))?.tag).toBe('v3')
    expect(requested[0]).toBe(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/releases?per_page=15`)
    expect(await client.getLatestRelease('dono/inexistente', false)).toBeNull()
  })
})

describe('instalação a partir do GitLab', () => {
  async function setup(servedName: string | null) {
    const game = await tempDir('game-')
    await writeTree(game, { 'saves/slot1.sav': 'SAVE' })
    const work = await tempDir('pkg-')
    const zipFile = path.join(work, 'pacote.zip')
    await makeZip(zipFile, { 'MarioKart64Recompiled.exe': 'v1' })
    const bytes = await fs.readFile(zipFile)
    const url = pkg(333130840)
    const release: ReleaseInfo = {
      tag: 'v0.9.2',
      name: 'v0.9.2',
      body: '',
      publishedAt: '2026-02-13T03:00:00Z',
      prerelease: false,
      htmlUrl: '',
      // Nome do link sem extensão, como no GitLab.
      assets: [{ name: 'MarioKart64Recompiled-v0.9.2-Windows-RelWithDebInfo', size: 0, url, digest: null }]
    }
    const parsed = parseManifest({
      id: 'mk64',
      name: 'Mario Kart 64 Recompiled',
      repoUrl: `https://gitlab.com/${project}`,
      executables: { win32: ['MarioKart64Recompiled.exe'] },
      detectFiles: ['MarioKart64Recompiled.exe'],
      updates: { source: 'gitlab-releases', repo: project, assetPatterns: { win32: '*-Windows-*' }, preserve: ['saves/**'] }
    })
    if (!parsed.ok) throw new Error(parsed.error)
    const updates = parsed.manifest.updates as ReleaseUpdates
    const requested: string[] = []
    const fetchImpl = (async (input: string | URL | Request) => {
      requested.push(String(input))
      const headers: Record<string, string> = { 'content-length': String(bytes.length) }
      if (servedName) headers['content-disposition'] = `attachment; filename="${servedName}"`
      const res = new Response(bytes, { status: 200, headers })
      Object.defineProperty(res, 'url', { value: url })
      return res
    }) as typeof fetch
    const deps: UpdateFlowDeps = {
      fetchImpl,
      tmpRoot: await tempDir('tmp-'),
      backupsDir: path.join(await tempDir('bk-'), 'mk64'),
      isGameRunning: async () => false,
      onStage: () => undefined,
      signal: new AbortController().signal
    }
    const params = { entryId: 'e1', manifestId: 'mk64', updates, gameDir: game, installedVersion: null, release, platform: 'win32' as const }
    return { game, deps, params, requested }
  }

  it('usa o nome informado pelo servidor para abrir o pacote e preserva os saves', async () => {
    const { game, deps, params, requested } = await setup('MarioKart64Recompiled-v0.9.2-Windows-RelWithDebInfo.zip')
    const result = await runUpdateFlow(params, deps)
    expect(result.version).toBe('v0.9.2')
    expect(await readTree(game)).toEqual({ 'MarioKart64Recompiled.exe': 'v1', 'saves/slot1.sav': 'SAVE' })
    expect(requested).toEqual([pkg(333130840)])
  })

  it('sem um nome de pacote conhecido, nada é instalado', async () => {
    const { game, deps, params } = await setup('MarioKart64Recompiled.rar')
    await expect(runUpdateFlow(params, deps)).rejects.toMatchObject({ code: 'UNSUPPORTED_ARCHIVE' })
    expect(await readTree(game)).toEqual({ 'saves/slot1.sav': 'SAVE' })
    const noName = await setup(null)
    await expect(runUpdateFlow(noName.params, noName.deps)).rejects.toMatchObject({ code: 'UNSUPPORTED_ARCHIVE' })
  })

  it('recusa o download se o link apontar para fora do projeto', async () => {
    const { deps, params, requested } = await setup('x.zip')
    params.release.assets[0].url = 'https://pixeldrain.com/u/abc'
    await expect(runUpdateFlow(params, deps)).rejects.toMatchObject({ code: 'UNTRUSTED_URL' })
    expect(requested).toEqual([])
  })
})
