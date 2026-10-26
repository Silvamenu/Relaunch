/** Navegação por direção (controle): escolhe o item mais próximo para cima, baixo, esquerda ou direita. */

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** Distância entre duas faixas (0 quando se sobrepõem). */
function gap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, b1 - a2, a1 - b2)
}

/**
 * Índice do candidato mais próximo de `from` na direção pedida, ou -1 se não houver nenhum.
 * Conta a distância à frente (de borda a borda) e pesa mais o quanto o candidato sai da faixa do item
 * atual: assim, numa grade, "direita" fica na mesma linha antes de pular para a linha de baixo. Um
 * item de outra linha (ou coluna) só conta se estiver de fato naquela direção, além da borda do atual.
 */
export function nextInDirection(from: Box, candidates: readonly Box[], dir: Direction): number {
  const cx = (from.left + from.right) / 2
  const cy = (from.top + from.bottom) / 2
  let best = -1
  let bestScore = Infinity
  candidates.forEach((b, i) => {
    const bx = (b.left + b.right) / 2
    const by = (b.top + b.bottom) / 2
    let ahead: number
    let side: number
    let drift: number
    if (dir === 'right' || dir === 'left') {
      side = gap(from.top, from.bottom, b.top, b.bottom)
      const edge = side > 0 ? (dir === 'right' ? from.right : from.left) : cx
      if (dir === 'right' ? bx <= edge + 1 : bx >= edge - 1) return
      ahead = dir === 'right' ? Math.max(0, b.left - from.right) : Math.max(0, from.left - b.right)
      drift = Math.abs(by - cy)
    } else {
      side = gap(from.left, from.right, b.left, b.right)
      const edge = side > 0 ? (dir === 'down' ? from.bottom : from.top) : cy
      if (dir === 'down' ? by <= edge + 1 : by >= edge - 1) return
      ahead = dir === 'down' ? Math.max(0, b.top - from.bottom) : Math.max(0, from.top - b.bottom)
      drift = Math.abs(bx - cx)
    }
    const score = ahead + side * 2 + drift * 0.1
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}

/** Índice do primeiro item em ordem de leitura (de cima para baixo, da esquerda para a direita), ou -1. */
export function firstInReadingOrder(boxes: readonly Box[]): number {
  let best = -1
  boxes.forEach((b, i) => {
    if (best < 0) return void (best = i)
    const cur = boxes[best]
    // Itens com o topo quase igual contam como a mesma linha.
    const sameRow = Math.abs(b.top - cur.top) < 8
    if ((sameRow && b.left < cur.left) || (!sameRow && b.top < cur.top)) best = i
  })
  return best
}
