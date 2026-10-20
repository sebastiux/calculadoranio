import { useMemo } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { escenarios, puntoEquilibrio } from '../lib/engine'
import { fCompacto, fMXN, fNum, fPct } from '../lib/format'
import { Kpi, Tabla, Tarjeta } from './ui'
import { Leyenda } from './TabResumen'
import type { PropsTab } from './tipos'

const SERIES = [
  { clave: 'ia', nombre: 'IA', color: 'var(--serie-1)' },
  { clave: 'railway', nombre: 'Railway', color: 'var(--serie-2)' },
  { clave: 'otrosDirectos', nombre: 'Pasarela y otros', color: 'var(--serie-3)' },
  { clave: 'indirectos', nombre: 'Indirectos', color: 'var(--serie-4)' },
] as const

export function TabEquilibrio({ cfg, r }: PropsTab) {
  const datos = useMemo(() => escenarios(cfg), [cfg])
  const eq = useMemo(
    () => ({ bruta: puntoEquilibrio(cfg, 'bruta'), neta: puntoEquilibrio(cfg, 'neta'), inversion: puntoEquilibrio(cfg, 'inversion') }),
    [cfg],
  )
  const txt = (n: number | null) => (n ? `${fNum(n)} alumnos` : 'No se alcanza')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Equilibrio (utilidad bruta ≥ 0)" valor={txt(eq.bruta)} sub="cubre directos + indirectos" />
        <Kpi etiqueta="Equilibrio después de ISR" valor={txt(eq.neta)} sub="utilidad neta ≥ 0" tono="acento" />
        <Kpi etiqueta="Recuperar inversión en el año 1" valor={txt(eq.inversion)} sub={`utilidad neta ≥ ${fMXN(r.roi.inversionMxn)}`} />
        <Kpi
          etiqueta="Recuperación con alumnos actuales"
          valor={r.roi.mesesRecuperacion ? `${r.roi.mesesRecuperacion} meses` : 'No se recupera'}
          sub={`ROI anual ${fPct(r.roi.roiAnualPct)}`}
          tono={r.roi.mesesRecuperacion ? 'bueno' : 'malo'}
        />
      </div>

      <Tarjeta
        titulo="Ingresos vs costos según número de alumnos (anual)"
        accion={
          <div className="flex flex-wrap gap-3 text-[11px] text-muted">
            {SERIES.map((s) => (
              <Leyenda key={s.clave} color={s.color} texto={s.nombre} />
            ))}
            <Leyenda color="var(--good)" texto="Ingresos" />
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="alumnos" stroke="var(--muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${fCompacto(v)}`} width={56} />
              <Tooltip
                contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => `${fNum(Number(v))} alumnos`}
                formatter={(v, nombre) => [fMXN(Number(v)), nombre]}
              />
              {SERIES.map((s) => (
                <Bar key={s.clave} dataKey={s.clave} name={s.nombre} stackId="c" fill={s.color} maxBarSize={44} isAnimationActive={false} />
              ))}
              <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--good)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Escenarios">
        <Tabla>
          <thead>
            <tr>
              <th>Alumnos</th>
              <th className="!text-right">Maestros</th>
              <th className="!text-right">Ingresos</th>
              <th className="!text-right">Directos</th>
              <th className="!text-right">Indirectos</th>
              <th className="!text-right">Costo / alumno</th>
              <th className="!text-right">Utilidad neta</th>
              <th className="!text-right">Recuperación</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((e) => {
              const meses = e.utilidadNeta > 0 ? Math.ceil(r.roi.inversionMxn / (e.utilidadNeta / 12)) : null
              const actual = e.alumnos === r.usuarios.alumnos
              return (
                <tr key={e.alumnos} className={actual ? 'bg-accent-soft font-medium' : ''}>
                  <td className="num">
                    {fNum(e.alumnos)} {actual && <span className="text-[11px] text-accent">actual</span>}
                  </td>
                  <td className="num text-right text-muted">{fNum(e.maestros)}</td>
                  <td className="num text-right">{fMXN(e.ingresos)}</td>
                  <td className="num text-right">{fMXN(e.directo)}</td>
                  <td className="num text-right">{fMXN(e.indirecto)}</td>
                  <td className="num text-right">{fMXN(e.costoPorAlumno)}</td>
                  <td className={`num text-right ${e.utilidadNeta >= 0 ? 'text-good' : 'text-bad'}`}>{fMXN(e.utilidadNeta)}</td>
                  <td className="num text-right text-muted">{meses ? `${meses} m` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
        <p className="mt-2 text-[11px] text-muted">Los maestros crecen en la misma proporción que en tu escenario actual. Recuperación = meses para pagar la inversión inicial con la utilidad neta.</p>
      </Tarjeta>
    </div>
  )
}
