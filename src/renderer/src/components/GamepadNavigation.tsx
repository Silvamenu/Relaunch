import { useEffect } from 'react'
import { createRepeater, heldActions, type PadAction } from '../../../shared/gamepad'
import { firstInReadingOrder, nextInDirection, type Box, type Direction } from '../../../shared/spatialNav'
import { useAppState } from '../state/AppState'

const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
/** Janelinhas e menus abertos: o controle fica preso neles, e o B os fecha. */
const OVERLAY = '[aria-modal="true"], [role="menu"]'

function isTyping(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  return el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'file'].includes(el.type)
}

/** Itens que o controle pode selecionar: visíveis, habilitados e fora de áreas escondidas. */
function candidates(scope: ParentNode): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if ((el as HTMLButtonElement).disabled || el.closest('[aria-hidden="true"], [inert]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  })
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
}

/** Mostra o contorno de seleção só enquanto o controle está em uso; o mouse o esconde. */
function setPadMode(on: boolean): void {
  document.documentElement.classList.toggle('gamepad', on)
}

function move(dir: Direction): void {
  const overlays = document.querySelectorAll(OVERLAY)
  const scope = overlays.length ? overlays[overlays.length - 1] : document
  const list = candidates(scope)
  const current = document.activeElement instanceof HTMLElement && list.includes(document.activeElement) ? document.activeElement : null
  let next: HTMLElement | undefined
  if (current) {
    const others = list.filter((el) => el !== current)
    next = others[nextInDirection(boxOf(current), others.map(boxOf), dir)]
  } else {
    // Sem seleção ainda: começa pelo conteúdo da página (o primeiro jogo da biblioteca, por exemplo).
    const main = document.getElementById('main-scroll')
    const inMain = scope === document && main ? list.filter((el) => main.contains(el)) : []
    const pool = inMain.length ? inMain : list
    next = pool[firstInReadingOrder(pool.map(boxOf))]
  }
  if (!next) return
  next.focus({ preventScroll: true })
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function confirm(): void {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || el === document.body) return
  if (el instanceof HTMLSelectElement) el.showPicker?.()
  else if (!isTyping(el)) el.click()
}

/** B: fecha a janelinha ou o menu aberto e sai do campo de texto (como o Esc); senão, volta uma página. */
function back(goBack: () => boolean, onLoginScreen: boolean): void {
  const el = document.activeElement ?? document.body
  const typing = isTyping(el)
  if (document.querySelector(OVERLAY) || typing || onLoginScreen) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    if (typing) (el as HTMLElement).blur()
    return
  }
  goBack()
}

/**
 * Navegação pelo controle no app inteiro: direcional ou analógico esquerdo move a seleção, A confirma
 * e B volta. Só lê o controle com a janela do Relaunch em primeiro plano, para nunca agir durante o jogo.
 */
export function GamepadNavigation() {
  const { goBack, profiles } = useAppState()
  const onLoginScreen = !profiles?.current

  useEffect(() => {
    const next = createRepeater()
    let frame = 0
    const loop = (now: number) => {
      const actions = next(heldActions(navigator.getGamepads()), now)
      if (actions.length && document.hasFocus()) {
        setPadMode(true)
        for (const action of actions) run(action)
      }
      frame = requestAnimationFrame(loop)
    }
    const run = (action: PadAction) => {
      if (action === 'confirm') confirm()
      else if (action === 'back') back(goBack, onLoginScreen)
      else move(action)
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (navigator.getGamepads().some(Boolean)) return
      cancelAnimationFrame(frame)
      frame = 0
    }
    const mouse = () => setPadMode(false)
    window.addEventListener('gamepadconnected', start)
    window.addEventListener('gamepaddisconnected', stop)
    window.addEventListener('mousemove', mouse)
    window.addEventListener('mousedown', mouse)
    if (navigator.getGamepads().some(Boolean)) start()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('gamepadconnected', start)
      window.removeEventListener('gamepaddisconnected', stop)
      window.removeEventListener('mousemove', mouse)
      window.removeEventListener('mousedown', mouse)
    }
  }, [goBack, onLoginScreen])

  return null
}
