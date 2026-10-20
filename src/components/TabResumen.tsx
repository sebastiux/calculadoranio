import { useMemo } from 'react'
import { puntoEquilibrio, type Grupo } from '../lib/engine'
import { fMXN, fNum, fPct, fUSD } from '../lib/format'
import { REGIMENES } from '../lib/fiscal'
import { Aviso, Kpi, Tarjeta } from './ui'
import type { PropsTab } from './tipos'
import type { TabId } from '../App'

const COLOR_GRUPO: Record<Grupo, string> = {
  IA: 'var(--serie-1)',
  Railway: 'var(--serie-2)',
  'Otros directos': 'var(--serie-3)',
  Estructura: 'var(--serie-4)',
  Nómina: 'var(--serie-5)',
}

export function TabResumen({ cfg, r, irA }: PropsTab & { irA: (t: TabId) => void }) {
  const t = r.totales
  const equilibrio = useMemo(() => puntoEquilibrio(cfg, 'neta'), [cfg])
  const alumnos = r.usuarios.alumnos

  const grupos = useMemo(() => {
    const mapa = new Map<string, { grupo: Grupo; tipo: string; monto: number }>()
    for (const l of r.lineas) {
      const clave = `${l.tipo}-${l.grupo}`
      const g = mapa.get(clave) ?? { grupo: l.grupo, tipo: l.tipo, monto: 0 }
      g.monto += l.anualMxn
      mapa.set(clave, g)
    }
    return [...mapa.values()].filter((g) => g.monto > 0.5).sort((a, b) => b.monto - a.monto)
  }, [r.lineas])
  const maxGrupo = Math.max(1, ...grupos.map((g) => g.monto))

  const rentable = r.fiscal.utilidadNetaMxn >= 0
  const cumpleMeta = r.fiscal.margenNetoPct >= cfg.margenObjetivoPct

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Ingresos anuales" valor={fMXN(r.ingresos.totalMxn)} sub={`${fNum(alumnos)} licencias × ${fMXN(r.precio.alumno)}`} />
        <Kpi etiqueta="Costos directos" valor={fMXN(t.directoMxn)} sub={`${fMXN(r.unitario.directoPorAlumno)} por alumno`} />
        <Kpi etiqueta="Costos indirectos" valor={fMXN(t.indirectoMxn)} sub={`${fMXN(r.unitario.indirectoPorAlumno)} por alumno`} />
        <Kpi
          etiqueta="Utilidad neta anual"
          valor={fMXN(r.fiscal.utilidadNetaMxn)}
          tono={rentable ? 'bueno' : 'malo'}
          sub={`Margen ${fPct(r.fiscal.margenNetoPct)} · ISR ${fMXN(r.fiscal.isr.isr)}`}
        />
      </div>

      <Aviso tono={rentable ? (cumpleMeta ? 'bueno' : 'alerta') : 'malo'}>
        {rentable && cumpleMeta && (
          <>
            <strong>Rentable.</strong> Margen neto de {fPct(r.fiscal.margenNetoPct)} (meta {cfg.margenObjetivoPct}%). Cada licencia deja {fMXN(r.unitario.utilidadPorAlumno)} antes de impuestos.
          </>
        )}
        {rentable && !cumpleMeta && (
          <>
            <strong>Rentable, pero bajo la meta.</strong> Margen neto de {fPct(r.fiscal.margenNetoPct)} contra una meta de {cfg.margenObjetivoPct}%.
          </>
        )}
        {!rentable && (
          <>
            <strong>No es rentable todavía.</strong> Los costos indirectos ({fMXN(t.indirectoMxn)}) superan lo que dejan las licencias después de costos directos ({fMXN(t.margenContribucionMxn)}).
            {equilibrio && <> Necesitas al menos <strong>{fNum(equilibrio)} alumnos</strong> con estos parámetros.</>}
          </>
        )}
      </Aviso>

      <div className="grid gap-4 xl:grid-cols-2">
        <Tarjeta titulo="Economía por licencia (anual)">
          <BarraUnitaria
            precio={r.unitario.ingresoPorAlumno}
            directo={r.unitario.directoPorAlumno}
            indirecto={r.unitario.indirectoPorAlumno}
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Dato etiqueta="Ingreso por alumno" valor={fMXN(r.unitario.ingresoPorAlumno)} />
            <Dato etiqueta="Costo total por alumno" valor={fMXN(r.unitario.totalPorAlumno)} />
            <Dato etiqueta="Margen de contribución" valor={`${fMXN(t.margenContribucionMxn / Math.max(1, alumnos))} · ${fPct(t.margenContribucionPct)}`} />
            <Dato etiqueta="Punto de equilibrio (neto)" valor={equilibrio ? `${fNum(equilibrio)} alumnos` : 'No se alcanza'} />
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Estructura de costos anual">
          <ul className="space-y-2.5">
            {grupos.map((g) => (
              <li key={`${g.tipo}-${g.grupo}`}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>
                    {g.grupo === 'Railway' ? (g.tipo === 'directo' ? 'Railway · variable' : 'Railway · base') : g.grupo}
                    <span className="ml-1.5 text-muted">{g.tipo}</span>
                  </span>
                  <span className="num">
                    {fMXN(g.monto)} <span className="text-muted">· {fPct((g.monto / Math.max(1, t.totalMxn)) * 100)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-panel-2">
                  <div className="h-2 rounded-full" style={{ width: `${(g.monto / maxGrupo) * 100}%`, background: COLOR_GRUPO[g.grupo] }} />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Atajo titulo="IA · Grok" onClick={() => irA('ia')} valor={`${fUSD(r.ia.mensualUsd)}/mes`} sub={`${r.ia.modelo.id} · ${fUSD(r.ia.alumno.costoMesUsd)} por alumno activo`} />
        <Atajo titulo="Railway" onClick={() => irA('railway')} valor={`${fUSD(r.railway.mesActivo.facturaUsd)}/mes`} sub={`${fUSD(r.railway.mesVacio.facturaUsd)} base · ${r.railway.mesActivo.concurrentes.toFixed(1)} usuarios simultáneos`} />
        <Atajo titulo="Fiscal" onClick={() => irA('fiscal')} valor={fMXN(r.fiscal.isr.isr)} sub={`ISR anual · ${REGIMENES[r.fiscal.regimen]}`} />
        <Atajo
          titulo="Recuperación de inversión"
          onClick={() => irA('equilibrio')}
          valor={r.roi.mesesRecuperacion ? `${r.roi.mesesRecuperacion} meses` : 'No se recupera'}
          sub={`Inversión ${fMXN(r.roi.inversionMxn)} · ROI ${fPct(r.roi.roiAnualPct)}`}
        />
      </div>
    </div>
  )
}

function BarraUnitaria({ precio, directo, indirecto }: { precio: number; directo: number; indirecto: number }) {
  const escala = Math.max(precio, directo + indirecto, 1)
  const utilidad = precio - directo - indirecto
  return (
    <div className="space-y-2">
      <Fila etiqueta="Precio" color="var(--good)" ancho={(precio / escala) * 100} valor={fMXN(precio)} />
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span>Costo</span>
          <span className="num">{fMXN(directo + indirecto)}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-panel-2">
          <div style={{ width: `${(directo / escala) * 100}%`, background: 'var(--serie-2)' }} title={`Directo ${fMXN(directo)}`} />
          <div style={{ width: `${(indirecto / escala) * 100}%`, background: 'var(--serie-4)' }} title={`Indirecto ${fMXN(indirecto)}`} />
        </div>
        <div className="mt-1.5 flex gap-4 text-[11px] text-muted">
          <Leyenda color="var(--serie-2)" texto={`Directo ${fMXN(directo)}`} />
          <Leyenda color="var(--serie-4)" texto={`Indirecto ${fMXN(indirecto)}`} />
          <span className={`ml-auto num ${utilidad >= 0 ? 'text-good' : 'text-bad'}`}>{utilidad >= 0 ? '+' : ''}{fMXN(utilidad)}</span>
        </div>
      </div>
    </div>
  )
}

function Fila({ etiqueta, color, ancho, valor }: { etiqueta: string; color: string; ancho: number; valor: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{etiqueta}</span>
        <span className="num">{valor}</span>
      </div>
      <div className="h-3 rounded-full bg-panel-2">
        <div className="h-3 rounded-full" style={{ width: `${ancho}%`, background: color }} />
      </div>
    </div>
  )
}

export function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {texto}
    </span>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{etiqueta}</dt>
      <dd className="num font-medium">{valor}</dd>
    </div>
  )
}

function Atajo({ titulo, valor, sub, onClick }: { titulo: string; valor: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-accent">
      <div className="text-xs font-medium text-muted">{titulo} →</div>
      <div className="num mt-1 text-lg font-semibold">{valor}</div>
      <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
    </button>
  )
}
