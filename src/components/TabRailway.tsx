import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { escenarios } from '../lib/engine'
import { PLANES_RAILWAY, PRECIOS_RAILWAY, type PlanRailway, type ServicioRailway } from '../lib/railway'
import { fMXN, fNum, fNum2, fUSD, fUSD4 } from '../lib/format'
import { Aviso, Boton, CampoNumero, Interruptor, Kpi, Selector, Tabla, Tarjeta } from './ui'
import { nuevoId, type PropsTab } from './tipos'

export function TabRailway({ cfg, r, actualizar }: PropsTab) {
  const rw = r.railway
  const activos = r.usuarios.alumnosActivos + r.usuarios.maestrosActivos
  const marginal = activos > 0 ? (rw.mesActivo.usoUsd - rw.mesVacio.usoUsd) / activos : 0
  const t = cfg.railway.trafico
  const curva = useMemo(() => escenarios(cfg).map((e) => ({ alumnos: e.alumnos, factura: e.railwayMesUsd })), [cfg])
  const calib = cfg.railway.calibracion

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Factura mes con clases" valor={fUSD(rw.mesActivo.facturaUsd)} sub={`uso ${fUSD(rw.mesActivo.usoUsd)} · cuota ${fUSD(rw.mesActivo.cuotaUsd)}`} />
        <Kpi etiqueta="Base sin usuarios" valor={fUSD(rw.mesVacio.facturaUsd)} sub="costo indirecto · corre 12 meses" />
        <Kpi etiqueta="Costo marginal por usuario" valor={fUSD4(marginal)} sub="USD por usuario activo al mes" />
        <Kpi etiqueta="Railway anual" valor={fMXN(rw.anualUsd * cfg.tipoCambio)} sub={`${fUSD(rw.fijoAnualUsd)} fijo + ${fUSD(rw.variableAnualUsd)} variable`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Tarjeta titulo="Plan y tráfico">
          <div className="space-y-3">
            <Selector<PlanRailway>
              etiqueta="Plan"
              valor={cfg.railway.plan}
              opciones={(Object.keys(PLANES_RAILWAY) as PlanRailway[]).map((p) => ({ valor: p, texto: `${PLANES_RAILWAY[p].nombre} · $${PLANES_RAILWAY[p].cuota}/mes (incluye $${PLANES_RAILWAY[p].credito} de uso)` }))}
              onChange={(p) => actualizar((d) => void (d.railway.plan = p))}
            />
            <div className="grid grid-cols-2 gap-3">
              <CampoNumero etiqueta="Entran a diario" sufijo="%" min={0} max={100} valor={t.dauPct} onChange={(n) => actualizar((d) => void (d.railway.trafico.dauPct = n))} ayuda="de los usuarios activos" />
              <CampoNumero etiqueta="Días con clases / mes" min={1} max={30} valor={t.diasActivosMes} onChange={(n) => actualizar((d) => void (d.railway.trafico.diasActivosMes = n))} />
              <CampoNumero etiqueta="Horas de actividad / día" min={1} max={24} valor={t.horasActividadDia} onChange={(n) => actualizar((d) => void (d.railway.trafico.horasActividadDia = n))} ayuda="ventana donde se concentra el uso" />
              <CampoNumero etiqueta="Minutos por sesión" min={0} valor={t.minutosSesion} onChange={(n) => actualizar((d) => void (d.railway.trafico.minutosSesion = n))} />
              <CampoNumero etiqueta="Meses de historial en BD" min={1} max={60} valor={t.mesesHistorial} onChange={(n) => actualizar((d) => void (d.railway.trafico.mesesHistorial = n))} />
            </div>
            <div className="rounded-lg bg-panel-2 p-3 text-xs text-muted">
              <div className="flex justify-between"><span>Usuarios activos</span><span className="num text-ink">{fNum(activos)}</span></div>
              <div className="flex justify-between"><span>Usuarios diarios (DAU)</span><span className="num text-ink">{fNum(activos * (t.dauPct / 100))}</span></div>
              <div className="flex justify-between"><span>Simultáneos en hora de actividad</span><span className="num text-ink">{fNum2(rw.mesActivo.concurrentes)}</span></div>
              <div className="flex justify-between"><span>Solicitudes IA / mes</span><span className="num text-ink">{fNum(r.ia.interaccionesMes)}</span></div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Factura mensual de Railway según alumnos">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curva} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="alumnos" stroke="var(--muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} width={48} />
                <Tooltip
                  contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `${fNum(Number(v))} alumnos`}
                  formatter={(v) => [fUSD(Number(v)), 'Factura / mes']}
                />
                <Line type="monotone" dataKey="factura" stroke="var(--serie-2)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Precios: ${PRECIOS_RAILWAY.vcpuMes}/vCPU-mes · ${PRECIOS_RAILWAY.ramGbMes}/GB RAM-mes · ${PRECIOS_RAILWAY.egressGb}/GB egress · ${PRECIOS_RAILWAY.volumenGbMes}/GB volumen. La red privada entre servicios no se cobra.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Consumo estimado por servicio (mes con clases)">
        <Tabla>
          <thead>
            <tr>
              <th>Servicio</th>
              <th className="!text-right">Requests</th>
              <th className="!text-right">vCPU</th>
              <th className="!text-right">RAM GB</th>
              <th className="!text-right">Egress GB</th>
              <th className="!text-right">Volumen GB</th>
              <th className="!text-right">USD / mes</th>
            </tr>
          </thead>
          <tbody>
            {rw.mesActivo.servicios.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.nombre}</td>
                <td className="num text-right text-muted">{fNum(s.requestsMes)}</td>
                <td className="num text-right">{s.vcpu.toFixed(4)}</td>
                <td className="num text-right">{s.ramGb.toFixed(3)}</td>
                <td className="num text-right">{s.egressGb.toFixed(2)}</td>
                <td className="num text-right">{s.volumenGb.toFixed(2)}</td>
                <td className="num text-right">{fUSD(s.totalUsd)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Uso total</td>
              <td />
              <td className="num text-right">{fUSD(rw.mesActivo.cpuUsd)}</td>
              <td className="num text-right">{fUSD(rw.mesActivo.ramUsd)}</td>
              <td className="num text-right">{fUSD(rw.mesActivo.egressUsd)}</td>
              <td className="num text-right">{fUSD(rw.mesActivo.volumenUsd)}</td>
              <td className="num text-right">{fUSD(rw.mesActivo.usoUsd)}</td>
            </tr>
          </tbody>
        </Tabla>
      </Tarjeta>

      <Tarjeta
        titulo="Calibración con tu factura real"
        accion={<Interruptor etiqueta="Usar calibración" valor={calib.activa} onChange={(b) => actualizar((d) => void (d.railway.calibracion.activa = b))} />}
      >
        <p className="mb-3 text-xs text-muted">
          Copia del panel <em>Usage</em> de Railway el costo por recurso de un mes completo y cuántos usuarios activos e interacciones de IA tuviste ese mes.
          El modelo se ajusta para reproducir exactamente esa factura y escala desde ahí.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CampoNumero compacto etiqueta="Usuarios activos" min={0} valor={calib.usuariosActivos} onChange={(n) => actualizar((d) => void (d.railway.calibracion.usuariosActivos = n))} />
          <CampoNumero compacto etiqueta="Solicitudes IA" min={0} valor={calib.interaccionesIA} onChange={(n) => actualizar((d) => void (d.railway.calibracion.interaccionesIA = n))} />
          <CampoNumero compacto etiqueta="CPU real" prefijo="$" paso={0.01} min={0} valor={calib.cpuUsd} onChange={(n) => actualizar((d) => void (d.railway.calibracion.cpuUsd = n))} />
          <CampoNumero compacto etiqueta="RAM real" prefijo="$" paso={0.01} min={0} valor={calib.ramUsd} onChange={(n) => actualizar((d) => void (d.railway.calibracion.ramUsd = n))} />
          <CampoNumero compacto etiqueta="Egress real" prefijo="$" paso={0.01} min={0} valor={calib.egressUsd} onChange={(n) => actualizar((d) => void (d.railway.calibracion.egressUsd = n))} />
          <CampoNumero compacto etiqueta="Volumen real" prefijo="$" paso={0.01} min={0} valor={calib.volumenUsd} onChange={(n) => actualizar((d) => void (d.railway.calibracion.volumenUsd = n))} />
        </div>
        {calib.activa && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(['cpu', 'ram', 'egress', 'volumen'] as const).map((k) => (
              <span key={k} className="rounded-md bg-panel-2 px-2 py-1">
                {k.toUpperCase()} × <span className="num">{rw.factores[k].toFixed(2)}</span>
              </span>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Servicios desplegados"
        accion={
          <Boton
            variante="fantasma"
            onClick={() =>
              actualizar((d) =>
                void d.railway.servicios.push({
                  id: nuevoId(), nombre: 'Nuevo servicio', replicas: 1, cpuBase: 0.005, ramBaseGb: 0.05, cpuMsPorRequest: 5, ramMbPorConcurrente: 0.5,
                  requestsPorUsuarioDia: 10, requestsPorInteraccionIA: 0, egressKbPorRequest: 2, volumenBaseGb: 0, volumenKbPorUsuario: 0, volumenKbPorInteraccion: 0,
                }),
              )
            }
          >
            + Agregar servicio
          </Boton>
        }
      >
        <p className="mb-3 text-xs text-muted">
          Toma los valores base de la pestaña <em>Metrics</em> de cada servicio en un rato sin tráfico (madrugada). El CPU por request sale de dividir el CPU extra en hora pico entre los requests de esa hora.
        </p>
        <div className="space-y-3">
          {cfg.railway.servicios.map((s, i) => (
            <EditorServicio
              key={s.id}
              s={s}
              onChange={(n) => actualizar((d) => void (d.railway.servicios[i] = n))}
              onEliminar={() => actualizar((d) => void d.railway.servicios.splice(i, 1))}
            />
          ))}
        </div>
      </Tarjeta>

      <Aviso>
        La calculadora anterior sumaba un costo fijo por cada 100 usuarios. Ahora el costo sale de los recursos que consume cada servicio: CPU por request, RAM por usuario simultáneo, egress por respuesta y almacenamiento por usuario e historial.
        Así se ve por qué Railway casi no crece con los usuarios (el grueso es RAM en reposo de MySQL) y en qué momento conviene pasar a Pro.
      </Aviso>
    </div>
  )
}

function EditorServicio({ s, onChange, onEliminar }: { s: ServicioRailway; onChange: (s: ServicioRailway) => void; onEliminar: () => void }) {
  const set = (k: keyof ServicioRailway) => (n: number) => onChange({ ...s, [k]: n })
  return (
    <details className="rounded-lg border border-line">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <svg className="chevron h-3 w-3 text-muted transition-transform" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 2l4 4-4 4" />
          </svg>
          {s.nombre}
        </span>
        <span className="num text-xs text-muted">
          {s.replicas}× · {s.cpuBase} vCPU · {s.ramBaseGb} GB
        </span>
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            value={s.nombre}
            onChange={(e) => onChange({ ...s, nombre: e.target.value })}
          />
          <Boton variante="fantasma" onClick={onEliminar} className="hover:!text-bad">
            Eliminar
          </Boton>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CampoNumero compacto etiqueta="Réplicas" min={1} valor={s.replicas} onChange={set('replicas')} />
          <CampoNumero compacto etiqueta="vCPU en reposo" paso={0.001} min={0} valor={s.cpuBase} onChange={set('cpuBase')} />
          <CampoNumero compacto etiqueta="RAM en reposo" sufijo="GB" paso={0.01} min={0} valor={s.ramBaseGb} onChange={set('ramBaseGb')} />
          <CampoNumero compacto etiqueta="CPU por request" sufijo="ms" paso={0.1} min={0} valor={s.cpuMsPorRequest} onChange={set('cpuMsPorRequest')} />
          <CampoNumero compacto etiqueta="RAM por simultáneo" sufijo="MB" paso={0.1} min={0} valor={s.ramMbPorConcurrente} onChange={set('ramMbPorConcurrente')} />
          <CampoNumero compacto etiqueta="Requests / usuario / día" min={0} valor={s.requestsPorUsuarioDia} onChange={set('requestsPorUsuarioDia')} />
          <CampoNumero compacto etiqueta="Requests / solicitud IA" min={0} valor={s.requestsPorInteraccionIA} onChange={set('requestsPorInteraccionIA')} />
          <CampoNumero compacto etiqueta="Egress por request" sufijo="KB" min={0} valor={s.egressKbPorRequest} onChange={set('egressKbPorRequest')} />
          <CampoNumero compacto etiqueta="Volumen base" sufijo="GB" paso={0.1} min={0} valor={s.volumenBaseGb} onChange={set('volumenBaseGb')} />
          <CampoNumero compacto etiqueta="Datos por usuario" sufijo="KB" min={0} valor={s.volumenKbPorUsuario} onChange={set('volumenKbPorUsuario')} />
          <CampoNumero compacto etiqueta="Datos por solicitud IA" sufijo="KB" paso={0.1} min={0} valor={s.volumenKbPorInteraccion} onChange={set('volumenKbPorInteraccion')} />
        </div>
      </div>
    </details>
  )
}
