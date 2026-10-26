import { AppError } from '../shared/errors'
import { isAllowedGitlabAssetUrl } from '../shared/patterns'
import type { ReleaseAsset, ReleaseInfo } from '../shared/types'
import { REQUEST_TIMEOUT_MS, USER_AGENT } from './updateCore'

const API = 'https://gitlab.com/api/v4'

interface RawLink {
  name: string
  url: string
}

interface RawRelease {
  tag_name: string
  name: string | null
  description: string | null
  released_at: string | null
  /** Release com data no futuro: tratado como pré-release. */
  upcoming_release?: boolean
  assets?: { links?: RawLink[] }
  _links?: { self?: string }
}

/**
 * Os arquivos de um release do GitLab são links. Só ficam os que apontam para dentro do próprio projeto
 * no gitlab.com: o que estiver hospedado em outro site nunca é oferecido para download. O tamanho não
 * vem na API (0 = desconhecido).
 */
export function gitlabReleaseInfo(raw: RawRelease, project: string): ReleaseInfo {
  const assets: ReleaseAsset[] = (raw.assets?.links ?? [])
    .filter((link) => isAllowedGitlabAssetUrl(link.url, project))
    .map((link) => ({ name: link.name, size: 0, url: link.url, digest: null }))
  return {
    tag: raw.tag_name,
    name: raw.name || raw.tag_name,
    body: raw.description ?? '',
    publishedAt: raw.released_at,
    prerelease: !!raw.upcoming_release,
    htmlUrl: raw._links?.self ?? `https://gitlab.com/${project}/-/releases/${encodeURIComponent(raw.tag_name)}`,
    assets
  }
}

/** Cliente mínimo da API de releases do gitlab.com (projetos públicos, sem token). */
export class GitLabClient {
  constructor(private readonly fetchImpl: typeof fetch) {}

  /** Releases do mais novo para o mais antigo. */
  async listReleases(project: string, perPage = 15): Promise<ReleaseInfo[]> {
    const url = `${API}/projects/${encodeURIComponent(project)}/releases?per_page=${perPage}`
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (err) {
      throw new AppError('NETWORK', (err as Error).message)
    }
    if (res.status === 404) return []
    if (!res.ok) throw new AppError('GITLAB_ERROR', `HTTP ${res.status}`, { status: res.status })
    const data = (await res.json().catch((err: Error) => {
      throw new AppError('NETWORK', err.message)
    })) as RawRelease[]
    if (!Array.isArray(data)) throw new AppError('GITLAB_ERROR', 'Resposta inesperada')
    return data.map((raw) => gitlabReleaseInfo(raw, project)).sort((a, b) => Date.parse(b.publishedAt ?? '0') - Date.parse(a.publishedAt ?? '0'))
  }

  /** O release mais novo que sirva (`accept`), ignorando os com data no futuro quando não se pede pré-releases. */
  async getLatestRelease(project: string, includePrereleases: boolean, accept?: (release: ReleaseInfo) => boolean): Promise<ReleaseInfo | null> {
    const list = (await this.listReleases(project)).filter((r) => includePrereleases || !r.prerelease)
    return list.find((r) => !accept || accept(r)) ?? null
  }
}
