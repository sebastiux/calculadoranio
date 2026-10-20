import { useEffect, useState, type ReactNode } from 'react'

export function Seccion({ titulo, children, abierta = false, extra }: { titulo: string; children: ReactNode; abierta?: boolean; extra?: ReactNode }) {
  return (
    <details open={abierta} className="group rounded-xl border border-line bg-panel">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <svg className="chevron h-3 w-3 text-muted transition-transform" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 2l4 4-4 4" />
          </svg>
          {titulo}
        </span>
        {extra}
      </summary>
      <div className="space-y-3 border-t border-line px-4 py-4">{children}</div>
    </details>
  )
}

export function Tarjeta({ titulo, children, className = '', accion }: { titulo?: ReactNode; children: ReactNode; className?: string; accion?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-4 sm:p-5 ${className}`}>
      {(titulo || accion) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h3 className="text-sm font-semibold">{titulo}</h3>}
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

type Tono = 'neutro' | 'bueno' | 'malo' | 'acento'
const tonos: Record<Tono, string> = { neutro: 'text-ink', bueno: 'text-good', malo: 'text-bad', acento: 'text-accent' }

export function Kpi({ etiqueta, valor, sub, tono = 'neutro' }: { etiqueta: string; valor: string; sub?: ReactNode; tono?: Tono }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs font-medium text-muted">{etiqueta}</div>
      <div className={`num mt-1 text-xl font-semibold sm:text-2xl ${tonos[tono]}`}>{valor}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Aviso({ tono = 'neutro', children }: { tono?: 'neutro' | 'bueno' | 'malo' | 'alerta'; children: ReactNode }) {
  const estilos = {
    neutro: 'border-line bg-panel-2 text-ink',
    bueno: 'border-good/30 bg-good/10 text-ink',
    malo: 'border-bad/30 bg-bad/10 text-ink',
    alerta: 'border-warn/30 bg-warn/10 text-ink',
  }
  return <div className={`rounded-lg border px-4 py-3 text-sm ${estilos[tono]}`}>{children}</div>
}

interface CampoNumeroProps {
  etiqueta: ReactNode
  valor: number
  onChange: (v: number) => void
  min?: number
  max?: number
  paso?: number
  prefijo?: string
  sufijo?: string
  ayuda?: ReactNode
  compacto?: boolean
}

export function CampoNumero({ etiqueta, valor, onChange, min, max, paso = 1, prefijo, sufijo, ayuda, compacto }: CampoNumeroProps) {
  return (
    <label className="block">
      <span className={`mb-1 block font-medium text-muted ${compacto ? 'text-[11px]' : 'text-xs'}`}>{etiqueta}</span>
      <EntradaNumero valor={valor} onChange={onChange} min={min} max={max} paso={paso} prefijo={prefijo} sufijo={sufijo} />
      {ayuda && <span className="mt-1 block text-[11px] leading-snug text-muted">{ayuda}</span>}
    </label>
  )
}

export function EntradaNumero({ valor, onChange, min, max, paso = 1, prefijo, sufijo, className = '' }: Omit<CampoNumeroProps, 'etiqueta' | 'ayuda' | 'compacto'> & { className?: string }) {
  // texto local para permitir escribir "0." o borrar el campo sin que salte el valor
  const [texto, setTexto] = useState(String(valor))
  useEffect(() => {
    if (Number(texto) !== valor) setTexto(String(valor))
  }, [valor])

  return (
    <div className={`flex items-center rounded-lg border border-line bg-panel-2 focus-within:border-accent ${className}`}>
      {prefijo && <span className="pl-2.5 text-xs text-muted">{prefijo}</span>}
      <input
        type="number"
        inputMode="decimal"
        className="num w-full min-w-0 bg-transparent px-2.5 py-1.5 text-sm outline-none"
        value={texto}
        min={min}
        max={max}
        step={paso}
        onChange={(e) => {
          setTexto(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n)) onChange(limitar(n, min, max))
        }}
        onBlur={() => setTexto(String(valor))}
      />
      {sufijo && <span className="pr-2.5 text-xs text-muted">{sufijo}</span>}
    </div>
  )
}

function limitar(n: number, min?: number, max?: number) {
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

export function Selector<T extends string>({ etiqueta, valor, opciones, onChange, ayuda }: { etiqueta: ReactNode; valor: T; opciones: Array<{ valor: T; texto: string }>; onChange: (v: T) => void; ayuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{etiqueta}</span>
      <select
        className="w-full rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        value={valor}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {ayuda && <span className="mt-1 block text-[11px] leading-snug text-muted">{ayuda}</span>}
    </label>
  )
}

export function Interruptor({ etiqueta, valor, onChange, ayuda }: { etiqueta: ReactNode; valor: boolean; onChange: (v: boolean) => void; ayuda?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        onClick={() => onChange(!valor)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${valor ? 'bg-accent' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${valor ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <span className="text-sm">
        {etiqueta}
        {ayuda && <span className="mt-0.5 block text-[11px] leading-snug text-muted">{ayuda}</span>}
      </span>
    </label>
  )
}

export function Boton({ children, onClick, variante = 'secundario', className = '', titulo }: { children: ReactNode; onClick: () => void; variante?: 'primario' | 'secundario' | 'fantasma'; className?: string; titulo?: string }) {
  const estilos = {
    primario: 'bg-accent text-white hover:opacity-90',
    secundario: 'border border-line bg-panel hover:bg-panel-2',
    fantasma: 'text-muted hover:bg-panel-2 hover:text-ink',
  }
  return (
    <button type="button" title={titulo} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${estilos[variante]} ${className}`}>
      {children}
    </button>
  )
}

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'directo' | 'indirecto' | 'bueno' | 'malo' }) {
  const estilos = {
    neutro: 'bg-panel-2 text-muted',
    directo: 'bg-[color-mix(in_srgb,var(--serie-2)_15%,transparent)] text-[var(--serie-2)]',
    indirecto: 'bg-[color-mix(in_srgb,var(--serie-4)_15%,transparent)] text-[var(--serie-4)]',
    bueno: 'bg-good/15 text-good',
    malo: 'bg-bad/15 text-bad',
  }
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${estilos[tono]}`}>{children}</span>
}

export function Tabla({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-4 overflow-x-auto sm:mx-0 ${className}`}>
      <table className="w-full min-w-[560px] border-collapse text-sm [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted">
        {children}
      </table>
    </div>
  )
}
