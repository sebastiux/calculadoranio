import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONFIG_DEFAULT, clonar, type Config } from './lib/config'
import { calcular } from './lib/engine'
import { cargarConfig, descargarCSV, enlaceCompartir, guardarConfig } from './lib/storage'
import { fMXN, fPct } from './lib/format'
import { Boton } from './components/ui'
import { PanelGeneral } from './components/PanelGeneral'
import { TabResumen } from './components/TabResumen'
import { TabCostos } from './components/TabCostos'
import { TabIA } from './components/TabIA'
import { TabRailway } from './components/TabRailway'
import { TabFiscal } from './components/TabFiscal'
import { TabEquilibrio } from './components/TabEquilibrio'
import type { Actualizar } from './components/tipos'

const TABS = [
  { id: 'resumen', texto: 'Resumen' },
  { id: 'costos', texto: 'Directos e indirectos' },
  { id: 'ia', texto: 'IA · Grok' },
  { id: 'railway', texto: 'Railway' },
  { id: 'fiscal', texto: 'Fiscal' },
  { id: 'equilibrio', texto: 'Equilibrio y escenarios' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [cfg, setCfg] = useState<Config>(cargarConfig)
  const [tab, setTab] = useState<TabId>('resumen')
  const [copiado, setCopiado] = useState(false)

  const actualizar = useCallback<Actualizar>((fn) => {
    setCfg((actual) => {
      const borrador = clonar(actual)
      fn(borrador)
      return borrador
    })
  }, [])

  useEffect(() => {
    guardarConfig(cfg)
  }, [cfg])

  // si se abrió un enlace compartido, se limpia el hash para que los cambios locales no se pisen al recargar
  useEffect(() => {
    if (location.hash.includes('c=')) history.replaceState(null, '', location.pathname + location.search)
  }, [])

  const r = useMemo(() => calcular(cfg), [cfg])

  const compartir = async () => {
    const url = enlaceCompartir(cfg)
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      prompt('Copia este enlace:', url)
    }
  }

  const exportar = () => {
    descargarCSV('costos-nio.csv', [
      ['Tipo', 'Grupo', 'Concepto', 'Anual MXN', 'Mensual MXN', 'Por alumno MXN', 'Detalle'],
      ...r.lineas.map((l) => [
        l.tipo, l.grupo, l.concepto, l.anualMxn.toFixed(2), (l.anualMxn / 12).toFixed(2),
        r.usuarios.alumnos > 0 ? (l.anualMxn / r.usuarios.alumnos).toFixed(2) : '0', l.detalle,
      ]),
      ['', '', 'Costos directos', r.totales.directoMxn.toFixed(2), '', '', ''],
      ['', '', 'Costos indirectos', r.totales.indirectoMxn.toFixed(2), '', '', ''],
      ['', '', 'Ingresos', r.ingresos.totalMxn.toFixed(2), '', '', ''],
      ['', '', 'Utilidad bruta', r.totales.utilidadBrutaMxn.toFixed(2), '', '', ''],
      ['', '', 'Utilidad neta', r.fiscal.utilidadNetaMxn.toFixed(2), '', '', ''],
    ])
  }

  const reiniciar = () => {
    if (confirm('¿Restablecer todos los valores por defecto?')) setCfg(clonar(CONFIG_DEFAULT))
  }

  const props = { cfg, r, actualizar }
  const utilidad = r.fiscal.utilidadNetaMxn

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">N</div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Calculadora de costos NIO</h1>
              <p className="text-xs text-muted">Costos directos e indirectos · Grok · Railway · Fiscal</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-xs text-muted md:inline">
              Utilidad neta anual{' '}
              <strong className={`num ${utilidad >= 0 ? 'text-good' : 'text-bad'}`}>{fMXN(utilidad)}</strong>
              <span className="mx-1">·</span>
              margen <strong className="num">{fPct(r.fiscal.margenNetoPct)}</strong>
            </span>
            <Boton onClick={compartir}>{copiado ? '¡Enlace copiado!' : 'Compartir'}</Boton>
            <Boton onClick={exportar}>CSV</Boton>
            <Boton variante="fantasma" onClick={reiniciar}>
              Restablecer
            </Boton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pb-4">
          <PanelGeneral {...props} />
        </aside>

        <main className="min-w-0">
          <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-accent text-white' : 'text-muted hover:bg-panel-2 hover:text-ink'}`}
              >
                {t.texto}
              </button>
            ))}
          </nav>

          {tab === 'resumen' && <TabResumen {...props} irA={setTab} />}
          {tab === 'costos' && <TabCostos {...props} />}
          {tab === 'ia' && <TabIA {...props} />}
          {tab === 'railway' && <TabRailway {...props} />}
          {tab === 'fiscal' && <TabFiscal {...props} />}
          {tab === 'equilibrio' && <TabEquilibrio {...props} />}
        </main>
      </div>

      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-xs text-muted">
        Precios xAI y Railway vigentes a octubre 2026 · tarifas ISR 2024-2025. Todos los cálculos son estimados; valida con tus facturas y tu contador.
      </footer>
    </div>
  )
}

export type { TabId }
