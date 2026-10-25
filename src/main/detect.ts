import { promises as fs } from 'node:fs'
import path from 'node:path'
import picomatch from 'picomatch'
import type { Manifest } from '../shared/manifest'
import { toPosix } from '../shared/patterns'
import type { DetectionCandidate } from '../shared/types'
import { isDirectory, isFile, matchWalked, walkFiles, type WalkedFile } from './fsutil'

const WALK_DEPTH = 2

/**
 * Caminho exato mais fundo que a varredura (ex.: dados extraídos do disco do usuário, que separam
 * Jak II e Jak 3 do Jak 1 na mesma pasta do OpenGOAL): confere direto no disco.
 */
async function hasDetectFile(folder: string, files: WalkedFile[], pattern: string): Promise<boolean> {
  if (matchWalked(files, [pattern]).length > 0) return true
  const posix = toPosix(pattern)
  if (posix.split('/').length - 1 <= WALK_DEPTH || picomatch.scan(posix).isGlob) return false
  return isFile(path.join(folder, posix))
}

async function scoreFolder(folder: string, manifests: Manifest[]): Promise<DetectionCandidate[]> {
  const files = await walkFiles(folder, WALK_DEPTH)
  const out: DetectionCandidate[] = []
  for (const manifest of manifests) {
    const matched: string[] = []
    for (const pattern of manifest.detectFiles) if (await hasDetectFile(folder, files, pattern)) matched.push(pattern)
    if (matched.length > 0) {
      out.push({
        manifestId: manifest.id,
        name: manifest.name,
        path: folder,
        score: matched.length / manifest.detectFiles.length,
        matched
      })
    }
  }
  return out
}

function rank(candidates: DetectionCandidate[]): DetectionCandidate[] {
  return candidates.sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || a.name.localeCompare(b.name))
}

/**
 * Descobre qual projeto está instalado em `folder` comparando os `detectFiles` de cada manifesto.
 * Se nada for encontrado na pasta escolhida, procura também nas subpastas imediatas
 * (útil quando o usuário seleciona a pasta "pai" do jogo).
 */
export async function detectGame(folder: string, manifests: Manifest[]): Promise<DetectionCandidate[]> {
  if (!(await isDirectory(folder))) return []
  const direct = await scoreFolder(folder, manifests)
  if (direct.length > 0) return rank(direct)

  const children = await fs.readdir(folder, { withFileTypes: true }).catch(() => [])
  const nested: DetectionCandidate[] = []
  for (const child of children) {
    if (!child.isDirectory() || child.name.startsWith('.')) continue
    nested.push(...(await scoreFolder(path.join(folder, child.name), manifests)))
  }
  return rank(nested)
}
