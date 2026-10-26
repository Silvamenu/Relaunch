import { ArrowDownToLine, ChevronsUpDown, Plus, Search, UserCog, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { errorMessage } from '../lib/format'
import { useAppState, type Route } from '../state/AppState'
import { GameTile } from './GameArt'
import { Logo } from './brand'
import { NavIcon } from './icons'
import { ProfileAvatar } from './ProfileAvatar'
import { statusTone, useStatusLabel } from './Status'
import { ConfirmModal, Dot, Kbd, ProgressBar } from './ui'

function NavItem({
  active,
  icon,
  label,
  badge,
  onClick
}: {
  active: boolean
  icon: 'library' | 'downloads' | 'settings' | 'faq'
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex h-[38px] w-full items-center gap-[11px] rounded-[10px] px-2.5 text-left text-[13.5px] transition-colors ${
        active ? 'bg-hover text-fg' : 'text-muted hover:bg-hover/60 hover:text-fg'
      }`}
    >
      <NavIcon name={icon} />
      <span className="truncate">{label}</span>
      {!!badge && <span className="ml-auto rounded-md bg-accent-bg px-1.5 py-px font-mono text-[11px] text-accent-fg">{badge}</span>}
    </button>
  )
}

/**
 * Barra azul acima do perfil: aparece quando há versão nova do launcher. Enquanto baixa, vai se enchendo
 * de azul; pronta, vira o botão "Atualizar", que pergunta antes de fechar o app. Só essa confirmação
 * instala: fechar o app não instala nada.
 */
export function AppUpdateBar() {
  const { appUpdate, items } = useAppState()
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const visible = appUpdate.status === 'available' || appUpdate.status === 'downloading' || appUpdate.status === 'downloaded'
  if (!visible) return null
  const version = appUpdate.version ?? ''
  if (appUpdate.status !== 'downloaded') {
    const percent = appUpdate.percent ?? 0
    const content = (
      <span className="flex h-9 items-center gap-2 px-3 text-[12.5px]">
        <ArrowDownToLine size={14} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t('appUpdate.downloading', { version })}</span>
        <span className="shrink-0 font-mono text-[11px]">{percent}%</span>
      </span>
    )
    return (
      <div role="status" className="update-bar relative w-full overflow-hidden rounded-xl border border-[#3B82F6]/60 text-accent-fg">
        {content}
        {/* A parte já baixada: o azul do botão "Atualizar", com o texto em branco por cima. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-[#3B82F6] text-white transition-[clip-path] duration-500"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        >
          {content}
        </span>
      </div>
    )
  }
  // Com um jogo aberto, o app fecharia sem registrar o tempo jogado da sessão: só atualiza depois.
  const gameOpen = items.some((item) => item.running)
  return (
    <>
      <button
        type="button"
        title={t('appUpdate.readyHint')}
        onClick={() => setConfirming(true)}
        className="update-bar update-bar-ready flex h-9 w-full items-center gap-2 rounded-xl bg-[#3B82F6] px-3 text-left text-[13px] font-medium text-white transition hover:brightness-110"
      >
        <ArrowDownToLine size={15} strokeWidth={2.4} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t('appUpdate.ready', { version })}</span>
      </button>
      {confirming && (
        <ConfirmModal
          title={t('appUpdate.confirmTitle')}
          body={
            <>
              <p>{t('appUpdate.confirmBody', { version })}</p>
              {gameOpen && <p className="mt-2 text-warn">{t('appUpdate.confirmGameOpen')}</p>}
            </>
          }
          confirmLabel={t('appUpdate.confirmAction')}
          cancelLabel={t('appUpdate.later')}
          confirmDisabled={gameOpen}
          onConfirm={() => {
            setConfirming(false)
            void window.api.appUpdate.install()
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}

/** Perfil em uso; o menu leva às configurações do perfil ou de volta para "Quem está jogando?". */
function ProfileCard() {
  const { profiles, setProfiles, navigate, toast } = useAppState()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const profile = profiles?.current

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    // Esc (ou o B do controle) fecha e devolve a seleção ao cartão do perfil.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      ref.current?.querySelector<HTMLElement>('[aria-expanded]')?.focus()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!profile) return null
  const switchProfile = async () => {
    setOpen(false)
    try {
      setProfiles(await window.api.profiles.leave())
    } catch (err) {
      toast('error', errorMessage(err, t))
    }
  }
  return (
    <div ref={ref} className="relative w-full">
      {open && (
        <div
          role="menu"
          className="animate-pop-in absolute bottom-full left-0 z-30 mb-2 w-full rounded-xl border border-control-line bg-control p-1.5 shadow-[0_20px_50px_var(--shadow)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => (setOpen(false), navigate({ page: 'settings' }))}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg-2 transition-colors hover:bg-hover"
          >
            <UserCog size={15} />
            {t('profile.settings')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void switchProfile()}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg-2 transition-colors hover:bg-hover"
          >
            <Users size={15} />
            {t('login.switch')}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line-soft p-2 text-left transition-colors hover:border-line"
      >
        <ProfileAvatar profile={profile} size={32} fontSize={12} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]">{profile.name}</span>
          <span className="block truncate text-[11.5px] text-faint">{t('profile.local')}</span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-faint" />
      </button>
    </div>
  )
}

/** Progresso das atualizações de jogos em andamento (acima do perfil). */
function DownloadWidget() {
  const { items, progress, navigate } = useAppState()
  const { t } = useI18n()
  const active = items.filter((i) => i.busy && progress[i.entry.id])
  if (active.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {active.map((item) => {
        const p = progress[item.entry.id]
        const pct = p.progress !== undefined ? Math.round(p.progress * 100) : null
        return (
          <button
            key={item.entry.id}
            type="button"
            onClick={() => navigate({ page: 'downloads' })}
            className="animate-fade-in rounded-xl border border-line px-3 pt-2.5 pb-3 text-left transition-colors hover:border-chip-line"
          >
            <span className="flex items-center gap-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate">
                {item.name} {p.version}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-subtle">{pct !== null ? `${pct}%` : t(`stage.${p.stage}`)}</span>
            </span>
            <ProgressBar value={p.progress} className="mt-2" />
          </button>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const { route, navigate, items, info, query, setQuery, progress } = useAppState()
  const { t } = useI18n()
  const statusLabel = useStatusLabel()
  const search = useRef<HTMLInputElement>(null)
  const updates = items.filter((i) => i.update.available).length
  const downloads = items.filter((i) => i.busy).length
  const is = (page: Route['page']) => route.page === page

  // Ctrl+K / Cmd+K foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
        search.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col px-3.5 pt-3.5 pb-3 max-lg:w-56">
      <div className="flex items-center gap-2.5 px-1.5 pt-1 pb-[18px]">
        <Logo height={24} title={t('app.name')} />
        {info && <span className="ml-auto rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-faint">v{info.version}</span>}
      </div>

      <label className="mb-3.5 flex h-9 items-center gap-2 rounded-[10px] border border-field-line bg-field px-2.5">
        <Search size={15} className="shrink-0 text-subtle" />
        <input
          ref={search}
          value={query}
          placeholder={t('search.placeholder')}
          onChange={(e) => {
            setQuery(e.target.value)
            if (route.page !== 'library') navigate({ page: 'library' })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              e.currentTarget.blur()
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none"
        />
        <span className="flex gap-[3px]">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </label>

      <nav className="flex flex-col gap-0.5">
        <NavItem active={is('library')} icon="library" label={t('nav.library')} badge={updates} onClick={() => navigate({ page: 'library' })} />
        <NavItem active={is('downloads')} icon="downloads" label={t('nav.downloads')} badge={downloads} onClick={() => navigate({ page: 'downloads' })} />
        <NavItem active={is('settings')} icon="settings" label={t('nav.settings')} onClick={() => navigate({ page: 'settings' })} />
        <NavItem active={is('faq')} icon="faq" label={t('nav.faq')} onClick={() => navigate({ page: 'faq' })} />
      </nav>

      <div className="mx-1 mt-4 mb-3.5 h-px bg-line-soft" />
      <div className="flex items-center justify-between px-2.5 pb-2">
        <span className="text-[11.5px] tracking-[0.04em] text-faint uppercase">{t('nav.games')}</span>
        <button
          type="button"
          aria-label={t('nav.add')}
          title={t('nav.add')}
          onClick={() => navigate({ page: 'add' })}
          className={`-mr-1 rounded-md p-0.5 transition-colors hover:text-fg ${is('add') ? 'text-fg' : 'text-subtle'}`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto">
        {items.map((item) => {
          const active = route.page === 'game' && route.id === item.entry.id
          const busy = item.busy && progress[item.entry.id]
          return (
            <button
              key={item.entry.id}
              type="button"
              onClick={() => navigate({ page: 'game', id: item.entry.id })}
              className={`flex h-9 shrink-0 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13px] transition-colors ${
                active ? 'bg-hover text-fg' : 'text-muted hover:bg-hover/60 hover:text-fg'
              }`}
            >
              <GameTile item={item} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.update.available && !busy && <ArrowDownToLine size={13} className="shrink-0 text-accent-fg" aria-label={t('badge.update')} />}
              <span title={statusLabel(item)}>
                <Dot tone={statusTone(item)} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <DownloadWidget />
        <AppUpdateBar />
        <ProfileCard />
      </div>
    </aside>
  )
}
