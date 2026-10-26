import { describe, expect, it } from 'vitest'
import { createRepeater, heldActions, nextOption, type PadSnapshot } from '../src/shared/gamepad'
import { firstInReadingOrder, nextInDirection, type Box } from '../src/shared/spatialNav'

const box = (left: number, top: number, w = 100, h = 40): Box => ({ left, top, right: left + w, bottom: top + h })

describe('navegação por direção', () => {
  // Grade 3x2 de capas e uma barra lateral à esquerda.
  const sidebar = [box(0, 0, 200), box(0, 50, 200), box(0, 100, 200)]
  const grid = [box(300, 0), box(420, 0), box(540, 0), box(300, 200), box(420, 200), box(540, 200)]
  const all = [...sidebar, ...grid]
  const from = (b: Box, dir: Parameters<typeof nextInDirection>[2]) => {
    const others = all.filter((x) => x !== b)
    const i = nextInDirection(b, others, dir)
    return i < 0 ? null : others[i]
  }

  it('anda na mesma linha e na mesma coluna da grade', () => {
    expect(from(grid[0], 'right')).toBe(grid[1])
    expect(from(grid[1], 'left')).toBe(grid[0])
    expect(from(grid[1], 'down')).toBe(grid[4])
    expect(from(grid[4], 'up')).toBe(grid[1])
  })

  it('no fim da linha não pula para outra linha, e da grade volta para a barra lateral', () => {
    expect(from(grid[2], 'right')).toBeNull()
    expect(from(grid[0], 'left')).toBe(sidebar[0])
    expect(from(grid[3], 'left')).toBe(sidebar[2])
    expect(from(sidebar[1], 'right')).toBe(grid[0])
  })

  it('para o lado, não desce para um item que está embaixo (filtro acima de uma capa larga)', () => {
    const chip = box(640, 130, 120, 30)
    const card = box(578, 190, 262, 420)
    expect(nextInDirection(chip, [card], 'right')).toBe(-1)
    expect(nextInDirection(chip, [card], 'left')).toBe(-1)
    expect(nextInDirection(chip, [card], 'down')).toBe(0)
  })

  it('o primeiro item é o de cima à esquerda', () => {
    expect(firstInReadingOrder(grid)).toBe(0)
    expect(firstInReadingOrder([box(420, 2), box(300, 0), box(300, 200)])).toBe(1)
    expect(firstInReadingOrder([])).toBe(-1)
  })
})

describe('leitura do controle', () => {
  const pad = (pressed: number[], axes: number[] = [0, 0]): PadSnapshot => ({
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
    axes
  })

  it('A, B, direcional e analógico esquerdo viram ações; o analógico só conta passando da zona morta', () => {
    expect([...heldActions([pad([0, 12])])].sort()).toEqual(['confirm', 'up'])
    expect([...heldActions([pad([1, 15])])].sort()).toEqual(['back', 'right'])
    expect([...heldActions([pad([], [-0.9, 0.7])])].sort()).toEqual(['down', 'left'])
    expect(heldActions([pad([], [0.3, -0.4])]).size).toBe(0)
    expect(heldActions([null, pad([13])])).toEqual(new Set(['down']))
  })

  it('nas listas de opções, cima e baixo pulam as desabilitadas e param nas pontas', () => {
    // Primeira opção desabilitada ("Escolha a versão") e selecionada, como no seletor de versão.
    const disabled = [true, false, true, false]
    expect(nextOption(disabled, 0, 1)).toBe(1)
    expect(nextOption(disabled, 1, 1)).toBe(3)
    expect(nextOption(disabled, 3, 1)).toBe(3)
    expect(nextOption(disabled, 3, -1)).toBe(1)
    expect(nextOption(disabled, 1, -1)).toBe(1)
    expect(nextOption([], -1, 1)).toBe(-1)
  })

  it('cada aperto vale uma vez; só as direções seguradas repetem', () => {
    const next = createRepeater(380, 110)
    expect(next(new Set(['down', 'confirm']), 0)).toEqual(['down', 'confirm'])
    expect(next(new Set(['down', 'confirm']), 200)).toEqual([])
    expect(next(new Set(['down', 'confirm']), 400)).toEqual(['down'])
    expect(next(new Set(['down', 'confirm']), 450)).toEqual([])
    expect(next(new Set(['down', 'confirm']), 520)).toEqual(['down'])
    // Soltar e apertar de novo vale outra vez.
    expect(next(new Set(), 600)).toEqual([])
    expect(next(new Set(['confirm']), 610)).toEqual(['confirm'])
  })
})
