import type { Manifest } from '../shared/manifest'
import type { StoreDetails } from '../shared/types'
import type { GitHubClient } from './github'
import { extractReadmeImages } from './readme'
import { parseRepoUrl } from './repoInstall'

type StoreClient = Pick<GitHubClient, 'getReadme' | 'getRepoDescription'>
/** `failed`: a leitura do GitHub falhou e o resultado não deve ficar guardado. */
type LoadedDetails = StoreDetails & { failed?: boolean }

/** Repositório do qual sai a vitrine do jogo; null quando não faz sentido mostrar o README. */
export function storeRepoOf(manifest: Manifest): string | null {
  // Jogo via emulador: o repositório é o do emulador, e as imagens dele não são do jogo.
  if (manifest.runner) return null
  if (manifest.updates.source === 'github-releases') return manifest.updates.repo
  return parseRepoUrl(manifest.repoUrl)
}

/**
 * Descrição e screenshots da página do jogo, no estilo de uma loja.
 * O resultado fica guardado durante a sessão: abrir o mesmo jogo de novo não gasta o limite da API.
 * Sem internet ou sem cota, a página mostra só o que o manifesto já tem.
 */
export class StoreInfoService {
  private readonly cache = new Map<string, Promise<LoadedDetails>>()

  constructor(
    private readonly client: StoreClient,
    private readonly getManifest: (id: string) => Manifest | null
  ) {}

  details(manifestId: string): Promise<StoreDetails> {
    const manifest = this.getManifest(manifestId)
    if (!manifest) return Promise.resolve({ description: null, screenshots: [], readmeUrl: null })
    const key = `${manifest.id}|${manifest.updates.source === 'github-releases' ? manifest.updates.repo : manifest.repoUrl}`
    let pending = this.cache.get(key)
    if (!pending) {
      pending = this.load(manifest)
      this.cache.set(key, pending)
      // Uma falha (rede, limite) não fica guardada: a próxima abertura tenta de novo.
      void pending.then((r) => r.failed && this.cache.delete(key))
    }
    return pending.then(({ failed: _failed, ...details }) => details)
  }

  private async load(manifest: Manifest): Promise<LoadedDetails> {
    const own = manifest.description?.trim() || null
    const repo = storeRepoOf(manifest)
    if (!repo) return { description: own, screenshots: [], readmeUrl: null }
    try {
      const [readme, description] = await Promise.all([this.client.getReadme(repo), own ? Promise.resolve(own) : this.client.getRepoDescription(repo)])
      return {
        description,
        screenshots: readme ? extractReadmeImages(readme.markdown, readme.url) : [],
        readmeUrl: `https://github.com/${repo}#readme`
      }
    } catch (err) {
      console.warn(`[loja] não foi possível ler o README de ${repo}`, err)
      return { description: own, screenshots: [], readmeUrl: `https://github.com/${repo}#readme`, failed: true }
    }
  }
}
