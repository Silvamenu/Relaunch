import { useEffect } from 'react'
import { createRepeater, heldActions, nextOption, type PadAction } from '../../../shared/gamepad'
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

/** Quanto a borda de seleção sai para fora do item (espessura + afastamento, no styles.css). */
const OUTLINE_OUTSIDE = 5

/**
 * A borda fica por fora do item, mas uma área que corta o que passa da borda dela (lista com rolagem,
 * caixa de cantos arredondados) a esconderia em parte. Nesses casos, ela é desenhada por dentro. Na
 * vertical, só contam as caixas sem rolagem entre o item e a primeira área com rolagem: a rolagem
 * deixa espaço para a borda, e o que fica além dela muda de lugar ao rolar.
 */
function markInset(el: EventTarget | null): void {
  if (!(el instanceof HTMLElement)) return
  const r = el.getBoundingClientRect()
  let inset = false
  let scrolled = false
  for (let a = el.parentElement; a && !inset; a = a.parentElement) {
    const cs = getComputedStyle(a)
    const box = a.getBoundingClientRect()
    if (cs.overflowX !== 'visible' && (r.left - OUTLINE_OUTSIDE < box.left || r.right + OUTLINE_OUTSIDE > box.right)) inset = true
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    if (!scrolled && clipsY && (r.top - OUTLINE_OUTSIDE < box.top || r.bottom + OUTLINE_OUTSIDE > box.bottom)) inset = true
    if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') scrolled = true
  }
  el.toggleAttribute('data-pad-inset', inset)
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

/**
 * Lista de opções em escolha pelo controle. A lista nativa do sistema não responde ao controle, então
 * o A entra na lista, cima e baixo trocam a opção, o A confirma e o B desiste.
 */
let picking: { el: HTMLSelectElement; original: number } | null = null

function stopPicking(keep: boolean): void {
  if (!picking) return
  const { el, original } = picking
  picking = null
  delete el.dataset.picking
  if (!keep) el.selectedIndex = original
  else if (el.selectedIndex !== original) el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Trata a ação enquanto uma lista está em escolha; false se não há escolha em andamento. */
function pick(action: PadAction): boolean {
  if (!picking) return false
  // Saiu da lista por outro meio (mouse, teclado): desiste e segue com a ação normal.
  if (document.activeElement !== picking.el) {
    stopPicking(false)
    return false
  }
  const { el } = picking
  if (action === 'up' || action === 'down') {
    el.selectedIndex = nextOption(
      [...el.options].map((o) => o.disabled),
      el.selectedIndex,
      action === 'down' ? 1 : -1
    )
  } else if (action === 'confirm' || action === 'back') {
    stopPicking(action === 'confirm')
  }
  return true
}

function confirm(): void {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || el === document.body) return
  if (el instanceof HTMLSelectElement) {
    picking = { el, original: el.selectedIndex }
    el.dataset.picking = ''
  } else if (!isTyping(el)) el.click()
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
      // O próximo quadro é agendado antes: um erro numa ação nunca para a leitura do controle.
      frame = requestAnimationFrame(loop)
      const actions = next(heldActions(navigator.getGamepads()), now)
      if (actions.length && document.hasFocus()) {
        setPadMode(true)
        for (const action of actions) run(action)
      }
    }
    const run = (action: PadAction) => {
      if (pick(action)) return
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
    const focusIn = (e: FocusEvent) => markInset(e.target)
    window.addEventListener('gamepadconnected', start)
    window.addEventListener('gamepaddisconnected', stop)
    window.addEventListener('mousemove', mouse)
    window.addEventListener('mousedown', mouse)
    document.addEventListener('focusin', focusIn)
    if (navigator.getGamepads().some(Boolean)) start()
    return () => {
      stopPicking(false)
      cancelAnimationFrame(frame)
      window.removeEventListener('gamepadconnected', start)
      window.removeEventListener('gamepaddisconnected', stop)
      window.removeEventListener('mousemove', mouse)
      window.removeEventListener('mousedown', mouse)
      document.removeEventListener('focusin', focusIn)
    }
  }, [goBack, onLoginScreen])

  return null
}
