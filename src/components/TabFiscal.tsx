import { REGIMENES, RESICO_LIMITE_ANUAL, type Regimen } from '../lib/fiscal'
import { fMXN, fPct } from '../lib/format'
import { Aviso, Insignia, Interruptor, Kpi, Selector, Tabla, Tarjeta } from './ui'
import type { PropsTab } from './tipos'

export function TabFiscal({ cfg, r, actualizar }: PropsTab) {
  const f = r.fiscal
  const ingresos = r.ingresos.totalMxn
  const regimenes = Object.keys(REGIMENES) as Regimen[]
  const mejor = regimenes.filter((k) => f.comparativo[k].aplica).sort((a, b) => f.comparativo[a].isr - f.comparativo[b].isr)[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Utilidad antes de ISR" valor={fMXN(r.totales.utilidadBrutaMxn)} tono={r.totales.utilidadBrutaMxn >= 0 ? 'neutro' : 'malo'} />
        <Kpi etiqueta={`ISR anual · ${f.regimen === 'RESICO_PF' ? 'RESICO' : f.regimen === 'PF_AE' ? 'PF AE' : 'PM'}`} valor={fMXN(f.isr.isr)} sub={`Tasa efectiva ${fPct(f.isr.tasaEfectiva * 100, 2)} sobre ingresos`} />
        <Kpi etiqueta="Utilidad neta" valor={fMXN(f.utilidadNetaMxn)} tono={f.utilidadNetaMxn >= 0 ? 'bueno' : 'malo'} sub={`Margen neto ${fPct(f.margenNetoPct)}`} />
        <Kpi etiqueta="IVA a enterar" valor={fMXN(f.iva.aPagar)} sub={f.iva.aFavor > 0 ? `${fMXN(f.iva.aFavor)} a favor` : 'trasladado − acreditable'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Tarjeta titulo="Configuración">
          <div className="space-y-4">
            <Selector<Regimen>
              etiqueta="Régimen fiscal"
              valor={cfg.fiscal.regimen}
              opciones={regimenes.map((k) => ({ valor: k, texto: REGIMENES[k] }))}
              onChange={(v) => actualizar((d) => void (d.fiscal.regimen = v))}
            />
            <Interruptor
              etiqueta="xAI me factura con IVA"
              valor={cfg.fiscal.ivaIA}
              onChange={(b) => actualizar((d) => void (d.fiscal.ivaIA = b))}
              ayuda="Solo acreditas IVA si la factura del proveedor extranjero lo desglosa."
            />
            <Interruptor etiqueta="Railway me factura con IVA" valor={cfg.fiscal.ivaRailway} onChange={(b) => actualizar((d) => void (d.fiscal.ivaRailway = b))} />
            <p className="text-[11px] text-muted">El IVA de cada costo indirecto o directo extra se marca en la pestaña “Directos e indirectos”.</p>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Comparativo de regímenes (anual)">
          <Tabla>
            <thead>
              <tr>
                <th>Régimen</th>
                <th className="!text-right">Base gravable</th>
                <th className="!text-right">ISR</th>
                <th className="!text-right">Tasa efectiva</th>
                <th className="!text-right">Utilidad neta</th>
              </tr>
            </thead>
            <tbody>
              {regimenes.map((k) => {
                const isr = f.comparativo[k]
                const neta = r.totales.utilidadBrutaMxn - isr.isr
                return (
                  <tr key={k} className={k === cfg.fiscal.regimen ? 'bg-accent-soft' : ''}>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">
                        {REGIMENES[k]}
                        {k === mejor && <Insignia tono="bueno">menor ISR</Insignia>}
                        {!isr.aplica && <Insignia tono="malo">no aplica</Insignia>}
                      </div>
                      <div className="text-[11px] text-muted">{isr.nota}</div>
                    </td>
                    <td className="num text-right">{fMXN(isr.base)}</td>
                    <td className="num text-right">{isr.aplica ? fMXN(isr.isr) : '—'}</td>
                    <td className="num text-right">{isr.aplica ? fPct(isr.tasaEfectiva * 100, 2) : '—'}</td>
                    <td className={`num text-right ${neta >= 0 ? 'text-good' : 'text-bad'}`}>{isr.aplica ? fMXN(neta) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        </Tarjeta>
      </div>

      <Tarjeta titulo="IVA (16%)">
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Ingresos sin IVA</dt>
            <dd className="num font-medium">{fMXN(ingresos)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">IVA trasladado (cobrado)</dt>
            <dd className="num font-medium">{fMXN(f.iva.trasladado)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">IVA acreditable (pagado)</dt>
            <dd className="num font-medium">{fMXN(f.iva.acreditable)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">IVA a enterar al SAT</dt>
            <dd className="num font-medium">{fMXN(f.iva.aPagar)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-muted">
          El precio de la licencia se captura sin IVA: el cliente paga {fMXN(r.precio.alumno * 1.16)} por alumno. El IVA no es costo ni ingreso, por eso no se resta de la utilidad.
        </p>
      </Tarjeta>

      {f.regimen !== cfg.fiscal.regimen && (
        <Aviso tono="malo">
          Con {fMXN(ingresos)} de ingresos ya no puedes tributar en RESICO; el resultado usa Persona Física con Actividad Empresarial.
        </Aviso>
      )}
      {ingresos > RESICO_LIMITE_ANUAL * 0.8 && f.regimen === cfg.fiscal.regimen && (
        <Aviso tono="alerta">
          Tus ingresos están cerca o arriba del límite de RESICO ({fMXN(RESICO_LIMITE_ANUAL)} al año). Considera constituir persona moral.
        </Aviso>
      )}
      <Aviso>
        Correcciones respecto a la calculadora anterior: RESICO PF se calcula sobre <strong>ingresos</strong> (no sobre utilidad) y su límite de $3.5M es <strong>anual</strong>; el IVA ya no se resta de la utilidad; la nómina no genera IVA acreditable.
      </Aviso>
    </div>
  )
}
