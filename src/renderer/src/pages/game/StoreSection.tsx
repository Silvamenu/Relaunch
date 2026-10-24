import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { StoreDetails } from '../../../../shared/types'
import { GlossaryText } from '../../components/Glossary'
import { SectionLabel } from '../../components/ui'
import { useI18n } from '../../i18n'

const cache = new Map<string, Promise<StoreDetails>>()

/** Vitrine do jogo (descrição + screenshots do README), carregada uma vez por sessão. */
function useStoreDetails(manifestId: string | undefined): StoreDetails | null | 'loading' {
  const [state, setState] = useState<StoreDetails | null | 'loading'>(manifestId ? 'loading' : null)
  useEffect(() => {
    if (!manifestId) return
    let alive = true
    if (!cache.has(manifestId)) cache.set(manifestId, window.api.store.details(manifestId))
    cache
      .get(manifestId)!
      .then((d) => alive && setState(d))
      .catch(() => {
        cache.delete(manifestId)
        if (alive) setState(null)
      })
    return () => {
      alive = false
    }
  }, [manifestId])
  return state
}

function Lightbox({ images, index, onIndex, onClose }: { images: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { t } = useI18n()
  const go = useCallback((step: number) => onIndex((index + step + images.length) % images.length), [index, images.length, onIndex])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])
  const nav = 'grid h-11 w-11 place-items-center rounded-full bg-[#111112]/70 text-[#ededee] backdrop-blur-md transition-colors hover:bg-[#111112]/90'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('store.screenshotOf', { n: index + 1, total: images.length })}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <img
        src={images[index]}
        alt=""
        referrerPolicy="no-referrer"
        className="max-h-[86vh] max-w-[88vw] rounded-xl object-contain shadow-[0_30px_80px_rgb(0_0_0/0.6)]"
        draggable={false}
      />
      <button type="button" aria-label={t('store.close')} onClick={onClose} className={`absolute top-5 right-5 ${nav}`}>
        <X size={18} />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label={t('store.previous')} onClick={() => go(-1)} className={`absolute left-5 ${nav}`}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label={t('store.next')} onClick={() => go(1)} className={`absolute right-5 ${nav}`}>
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-5 rounded-full bg-[#111112]/70 px-3 py-1 text-[12.5px] text-[#ededee] tabular-nums backdrop-blur-md">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Parte "loja" da página do jogo: primeiro a descrição, depois as screenshots que o projeto
 * publicou no README. As imagens vêm do GitHub e abrem em tela cheia ao clicar.
 */
export function StoreSection({ manifestId, fallbackDescription }: { manifestId: string | undefined; fallbackDescription?: string }) {
  const { t } = useI18n()
  const details = useStoreDetails(manifestId)
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<number | null>(null)

  const loading = details === 'loading'
  const description = (details && details !== 'loading' ? details.description : null) ?? fallbackDescription ?? null
  const shots = details && details !== 'loading' ? details.screenshots.filter((s) => !broken.has(s)) : []
  const readmeUrl = details && details !== 'loading' ? details.readmeUrl : null

  if (!loading && !description && shots.length === 0) return null

  return (
    <section className="mt-9" aria-label={t('store.title')}>
      {description && (
        <p className="max-w-[760px] text-[14px] leading-relaxed text-fg-3">
          <GlossaryText>{description}</GlossaryText>
        </p>
      )}

      {(loading || shots.length > 0) && (
        <div className="mt-7">
          <SectionLabel
            action={
              readmeUrl && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[12.5px] text-link hover:underline"
                  onClick={() => void window.api.app.openExternal(readmeUrl)}
                >
                  {t('store.viewOnGithub')}
                  <ExternalLink size={12.5} />
                </button>
              )
            }
          >
            {t('store.screenshots')}
          </SectionLabel>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
            {loading
              ? [0, 1, 2].map((i) => <div key={i} className="aspect-video animate-pulse rounded-xl bg-hover" />)
              : shots.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={t('store.screenshotOf', { n: i + 1, total: shots.length })}
                    onClick={() => setOpen(i)}
                    className="group aspect-video overflow-hidden rounded-xl border border-line bg-hover transition-colors hover:border-chip-line focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onError={() => setBroken((b) => new Set(b).add(src))}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>
                ))}
          </div>
        </div>
      )}

      {open !== null && shots.length > 0 && (
        <Lightbox images={shots} index={Math.min(open, shots.length - 1)} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  )
}
