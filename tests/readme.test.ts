import { describe, expect, it } from 'vitest'
import { parseManifest } from '../src/shared/manifest'
import { extractReadmeImages, MAX_SCREENSHOTS } from '../src/main/readme'
import { StoreInfoService, storeRepoOf } from '../src/main/storeInfo'

const README = 'https://raw.githubusercontent.com/Dono/Jogo/main/README.md'
const RAW = 'https://raw.githubusercontent.com/Dono/Jogo/main'

describe('screenshots do README', () => {
  it('resolve caminhos relativos à pasta do README e à raiz do repositório', () => {
    const md = ['![Tela 1](docs/tela1.png)', '![Tela 2](./docs/tela2.jpg)', '![Tela 3](/img/tela3.webp)'].join('\n')
    expect(extractReadmeImages(md, README)).toEqual([`${RAW}/docs/tela1.png`, `${RAW}/docs/tela2.jpg`, `${RAW}/img/tela3.webp`])
  })

  it('usa a pasta do README como base quando ele não está na raiz', () => {
    expect(extractReadmeImages('![x](shot.png)', 'https://raw.githubusercontent.com/Dono/Jogo/main/docs/README.md')).toEqual([`${RAW}/docs/shot.png`])
    expect(extractReadmeImages('![x](/shot.png)', 'https://raw.githubusercontent.com/Dono/Jogo/main/docs/README.md')).toEqual([`${RAW}/shot.png`])
  })

  it('lê <img>, imagens por referência e anexos do GitHub, na ordem do texto', () => {
    const md = [
      '<p align="center"><img src="docs/a.png" alt="Gameplay"></p>',
      '![b][fig]',
      '<img src="https://github.com/user-attachments/assets/1234-abcd">',
      '',
      '[fig]: https://raw.githubusercontent.com/Dono/Jogo/main/b.gif'
    ].join('\n')
    expect(extractReadmeImages(md, README)).toEqual([`${RAW}/docs/a.png`, `${RAW}/b.gif`, 'https://github.com/user-attachments/assets/1234-abcd'])
  })

  it('converte links "blob" do GitHub para o arquivo bruto', () => {
    expect(extractReadmeImages('![x](https://github.com/Dono/Jogo/blob/main/docs/x.png)', README)).toEqual([`${RAW}/docs/x.png`])
  })

  it('descarta selos, logos, ícones, SVG e imagens pequenas', () => {
    const md = [
      '[![CI](https://github.com/Dono/Jogo/actions/workflows/ci.yml/badge.svg)](https://github.com/Dono/Jogo)',
      '![Discord](https://img.shields.io/discord/123.png)',
      '![Logo](docs/logo.png)',
      '<img src="docs/icon-256.png">',
      '<img src="docs/pequena.png" width="64">',
      '![diagrama](docs/fluxo.svg)',
      '![Jogando](docs/jogando.png)'
    ].join('\n')
    expect(extractReadmeImages(md, README)).toEqual([`${RAW}/docs/jogando.png`])
  })

  it('só aceita imagens do próprio GitHub (as origens liberadas pela CSP) e via HTTPS', () => {
    const md = [
      '![a](https://i.imgur.com/abc.png)',
      '![b](http://raw.githubusercontent.com/Dono/Jogo/main/b.png)',
      '![c](https://evil.githubusercontent.com.example.org/c.png)',
      '![d](data:image/png;base64,AAAA)'
    ].join('\n')
    expect(extractReadmeImages(md, README)).toEqual([])
  })

  it('ignora exemplos em blocos de código, repetições e respeita o limite', () => {
    const md = ['```md', '![exemplo](docs/exemplo.png)', '```', '![a](a.png)', '![a de novo](a.png)'].join('\n')
    expect(extractReadmeImages(md, README)).toEqual([`${RAW}/a.png`])
    const many = Array.from({ length: MAX_SCREENSHOTS + 5 }, (_, i) => `![s](s${i}.png)`).join('\n')
    expect(extractReadmeImages(many, README)).toHaveLength(MAX_SCREENSHOTS)
  })
})

function manifest(extra: Record<string, unknown>) {
  return parseManifest({
    id: 'jogo',
    name: 'Jogo',
    repoUrl: 'https://github.com/Dono/Jogo',
    description: 'Descrição do manifesto.',
    executables: { win32: ['jogo.exe'], linux: ['jogo'] },
    updates: { source: 'github-releases', repo: 'Dono/Jogo', assetPatterns: { win32: ['*.zip'], linux: ['*.zip'] } },
    ...extra
  })
}

describe('vitrine da página do jogo', () => {
  it('não mostra imagens do emulador num jogo que roda por emulador', () => {
    const m = manifest({ runner: { manifest: 'emulador', args: ['{gameFile}'] }, updates: { source: 'none' } })
    expect(storeRepoOf(m)).toBeNull()
  })

  it('junta a descrição do manifesto com as imagens do README e guarda o resultado', async () => {
    let readmeCalls = 0
    const service = new StoreInfoService(
      {
        getReadme: async () => (readmeCalls++, { markdown: '![tela](docs/tela.png)', url: README }),
        getRepoDescription: async () => 'não deveria ser usada'
      },
      () => manifest({})
    )
    const first = await service.details('jogo')
    expect(first).toEqual({ description: 'Descrição do manifesto.', screenshots: [`${RAW}/docs/tela.png`], readmeUrl: 'https://github.com/Dono/Jogo#readme' })
    await service.details('jogo')
    expect(readmeCalls).toBe(1)
  })

  it('usa a descrição do GitHub quando o manifesto não tem uma', async () => {
    const service = new StoreInfoService({ getReadme: async () => null, getRepoDescription: async () => 'Sobre do GitHub' }, () =>
      manifest({ description: undefined })
    )
    expect((await service.details('jogo')).description).toBe('Sobre do GitHub')
  })

  it('sem rede, mostra o que o manifesto tem e tenta de novo na próxima vez', async () => {
    let calls = 0
    const service = new StoreInfoService(
      {
        getReadme: async () => {
          calls++
          throw new Error('offline')
        },
        getRepoDescription: async () => null
      },
      () => manifest({})
    )
    expect(await service.details('jogo')).toEqual({ description: 'Descrição do manifesto.', screenshots: [], readmeUrl: 'https://github.com/Dono/Jogo#readme' })
    await new Promise((r) => setTimeout(r, 0))
    await service.details('jogo')
    expect(calls).toBe(2)
  })
})
