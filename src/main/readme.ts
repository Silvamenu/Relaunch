/**
 * Screenshots da página do jogo, tiradas do README do projeto no GitHub.
 *
 * Só ficam imagens servidas pelo próprio GitHub (as mesmas origens que a CSP da interface libera),
 * sem selos, logos e ícones: o que sobra são as capturas de tela que o projeto publicou.
 */

/** Teto de imagens por jogo: o README pode ter dezenas (tutoriais, GIFs de recursos...). */
export const MAX_SCREENSHOTS = 12

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i
/** Nomes e caminhos que quase nunca são captura de tela. */
const NOT_A_SCREENSHOT = /(badge|shields?|logo|icon|favicon|banner-?small|sponsor|donate|kofi|ko-fi|patreon|discord|button|avatar)/i

/** Origens aceitas: as mesmas da CSP (`img-src ... https://github.com https://*.githubusercontent.com`). */
export function isAllowedImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase()
  return host === 'github.com' || host.endsWith('.githubusercontent.com')
}

/** `github.com/<dono>/<repo>/blob/<ref>/<arquivo>` vira o endereço do arquivo bruto. */
function blobToRaw(url: URL): URL {
  if (url.hostname.toLowerCase() !== 'github.com') return url
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length >= 5 && (parts[2] === 'blob' || parts[2] === 'raw')) {
    const [owner, repo, , ...rest] = parts
    return new URL(`https://raw.githubusercontent.com/${owner}/${repo}/${rest.join('/')}`)
  }
  return url
}

/** Anexos enviados pelo editor do GitHub não têm extensão no endereço, mas são imagens. */
function isUserAttachment(url: URL): boolean {
  return url.hostname.toLowerCase() === 'github.com' && /^\/user-attachments\/assets\//.test(url.pathname)
}

function looksLikeScreenshot(url: URL, alt: string): boolean {
  const file = decodeURIComponent(url.pathname)
  if (NOT_A_SCREENSHOT.test(file) || NOT_A_SCREENSHOT.test(alt)) return false
  return IMAGE_EXT.test(file) || isUserAttachment(url) || url.hostname.toLowerCase() === 'user-images.githubusercontent.com'
}

/** Resolve um endereço do README (absoluto, relativo à pasta do README ou à raiz do repositório). */
function resolveUrl(raw: string, readmeDir: URL, repoRoot: URL): URL | null {
  const value = raw.trim().replace(/^<|>$/g, '')
  if (!value || value.startsWith('data:') || value.startsWith('#')) return null
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return blobToRaw(new URL(value, 'https://github.com'))
    return new URL(value.startsWith('/') ? value.slice(1) : value, value.startsWith('/') ? repoRoot : readmeDir)
  } catch {
    return null
  }
}

/** Largura/altura declaradas num `<img>` pequenas demais para uma captura (selos, ícones). */
function tooSmall(tag: string): boolean {
  for (const attr of ['width', 'height']) {
    const m = new RegExp(`\\b${attr}\\s*=\\s*["']?(\\d+)`, 'i').exec(tag)
    if (m && Number(m[1]) < 120) return true
  }
  return false
}

/**
 * Lista as screenshots de um README, na ordem em que aparecem e sem repetir.
 * @param markdown texto do README
 * @param readmeUrl endereço bruto do README (`download_url` da API), base dos caminhos relativos
 */
export function extractReadmeImages(markdown: string, readmeUrl: string): string[] {
  let readmeDir: URL
  try {
    readmeDir = new URL('.', readmeUrl)
  } catch {
    return []
  }
  // raw.githubusercontent.com/<dono>/<repo>/<ref>/ — raiz para caminhos que começam com "/".
  const rootParts = readmeDir.pathname.split('/').filter(Boolean).slice(0, 3)
  const repoRoot = new URL(`/${rootParts.join('/')}/`, readmeDir)

  // Blocos de código não são imagens do README: exemplos de markdown ficariam como captura.
  const text = markdown.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')

  const refs = new Map<string, string>()
  for (const m of text.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*(\S+)/gm)) refs.set(m[1].toLowerCase(), m[2])

  const found: { index: number; url: string; alt: string; small: boolean }[] = []
  // ![alt](url "título")
  for (const m of text.matchAll(/!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g)) {
    found.push({ index: m.index ?? 0, url: m[2], alt: m[1], small: false })
  }
  // ![alt][ref] e ![alt][]
  for (const m of text.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    const url = refs.get((m[2] || m[1]).toLowerCase())
    if (url) found.push({ index: m.index ?? 0, url, alt: m[1], small: false })
  }
  // <img src="..."> e <source srcset="..."> (usado em <picture> para tema claro/escuro)
  for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[0])
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(m[0])
    if (src) found.push({ index: m.index ?? 0, url: src[1], alt: alt?.[1] ?? '', small: tooSmall(m[0]) })
  }

  const seen = new Set<string>()
  const result: string[] = []
  for (const item of found.sort((a, b) => a.index - b.index)) {
    if (item.small) continue
    const url = resolveUrl(item.url, readmeDir, repoRoot)
    if (!url || !isAllowedImageUrl(url) || !looksLikeScreenshot(url, item.alt)) continue
    const href = url.toString()
    if (seen.has(href)) continue
    seen.add(href)
    result.push(href)
    if (result.length >= MAX_SCREENSHOTS) break
  }
  return result
}
