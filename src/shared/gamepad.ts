/** Leitura do controle (Gamepad API, mapeamento padrão do Xbox): botões viram ações de navegação. */
import type { Direction } from './spatialNav'

export type PadAction = Direction | 'confirm' | 'back'

export interface PadSnapshot {
  readonly buttons: ReadonlyArray<{ readonly pressed: boolean }>
  readonly axes: ReadonlyArray<number>
}

// Índices do mapeamento "standard": A, B e o direcional.
const BUTTONS: ReadonlyArray<[number, PadAction]> = [
  [0, 'confirm'],
  [1, 'back'],
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right']
]
/** Inclinação mínima do analógico esquerdo para contar como direção. */
const DEADZONE = 0.5

/** Ações seguradas agora, somando todos os controles conectados (direcional, analógico esquerdo, A e B). */
export function heldActions(pads: ReadonlyArray<PadSnapshot | null>): Set<PadAction> {
  const held = new Set<PadAction>()
  for (const pad of pads) {
    if (!pad) continue
    for (const [index, action] of BUTTONS) if (pad.buttons[index]?.pressed) held.add(action)
    const [x = 0, y = 0] = pad.axes
    if (x <= -DEADZONE) held.add('left')
    if (x >= DEADZONE) held.add('right')
    if (y <= -DEADZONE) held.add('up')
    if (y >= DEADZONE) held.add('down')
  }
  return held
}

/**
 * Próxima opção habilitada de uma lista, andando `step` (1 desce, -1 sobe) a partir de `index`.
 * Nas pontas, fica onde está.
 */
export function nextOption(disabled: readonly boolean[], index: number, step: 1 | -1): number {
  for (let i = index + step; i >= 0 && i < disabled.length; i += step) if (!disabled[i]) return i
  return index
}

const DIRECTIONS: ReadonlySet<PadAction> = new Set<PadAction>(['up', 'down', 'left', 'right'])

/**
 * Transforma o que está segurado em ações: cada aperto vale uma vez; direções seguradas repetem
 * (depois de `delay` ms, a cada `interval` ms). A e B nunca repetem.
 */
export function createRepeater(delay = 380, interval = 110) {
  const since = new Map<PadAction, { at: number; last: number }>()
  return (held: ReadonlySet<PadAction>, now: number): PadAction[] => {
    const out: PadAction[] = []
    for (const action of [...since.keys()]) if (!held.has(action)) since.delete(action)
    for (const action of held) {
      const s = since.get(action)
      if (!s) {
        since.set(action, { at: now, last: now })
        out.push(action)
      } else if (DIRECTIONS.has(action) && now - s.at >= delay && now - s.last >= interval) {
        s.last = now
        out.push(action)
      }
    }
    return out
  }
}
