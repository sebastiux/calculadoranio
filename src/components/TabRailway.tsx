import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { escenarios } from '../lib/engine'
import { PLANES_RAILWAY, PRECIOS_RAILWAY, totalMedido, type ModoRailway, type PlanRailway, type ServicioRailway } from '../lib/railway'
import { fMXN, fNum, fNum2, fUSD, fUSD4 } from '../lib/format'
import { Aviso, Boton, CampoNumero, Interruptor, Kpi, Selector, Tabla, Tarjeta } from './ui'
import { nuevoId, type PropsTab } from './tipos'

export function TabRailway({ cfg, r, actualizar }: PropsTab) {
  const rw = r.railway
  const activos = r.usuarios.alumnosActivos + r.usuarios.maestrosActivos
  const marginal = activos > 0 ? (rw.mesActivo.usoUsd - rw.mesVacio.usoUsd) / activos : 0
  const t = cfg.railway.trafico
  const p = cfg.railway.pruebas
  const a = cfg.railway.aprox
  const curva = useMemo(() => escenarios(cfg).map((e) => ({ alumnos: e.alumnos, factura: e.railwayMesUsd })), [cfg])
  const calib = cfg.railway.calibracion
  const aproximado = cfg.railway.modo === 'aproximado'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Factura mes con clases" valor={fUSD(rw.mesActivo.facturaUsd)} sub={`pruebas ${fUSD(rw.mesActivo.pruebasUsd)} + producción ${fUSD(rw.mesActivo.produccionUsd)}`} />
        <Kpi etiqueta="Base sin alumnos" valor={fUSD(rw.mesVacio.facturaUsd)} sub="costo indirecto · corre 12 meses" />
        <Kpi etiqueta="Costo marginal por usuario" valor={fUSD4(marginal)} sub="USD por usuario activo al mes" />
        <Kpi etiqueta="Railway anual" valor={fMXN(rw.anualUsd * cfg.tipoCambio)} sub={`USD ${fUSD(rw.fijoAnualUsd)} fijo + ${fUSD(rw.variableAnualUsd)} variable`} />
      </div>

      <Tarjeta titulo="Cómo calcular">
        <div className="grid gap-3 sm:grid-cols-2">
          {(['aproximado', 'detallado'] as ModoRailway[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => actualizar((d) => void (d.railway.modo = m))}
              className={`rounded-lg border p-3 text-left transition ${cfg.railway.modo === m ? 'border-accent bg-accent-soft' : 'border-line hover:bg-panel-2'}`}
            >
              <div className="text-sm font-semibold">{m === 'aproximado' ? 'Función aproximada (factura real)' : 'Especificación por servicio'}</div>
              <div className="mt-1 text-xs text-muted">
                {m === 'aproximado'
                  ? 'Producción arranca en lo que hoy cuesta pruebas y crece por usuario activo y por réplicas del frontend.'
                  : 'CPU por request, RAM por usuario simultáneo, egress y volumen de cada servicio desplegado.'}
              </div>
            </button>
          ))}
        </div>
      </Tarjeta>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Tarjeta
          titulo="Ambiente de pruebas (medido)"
          accion={<Interruptor etiqueta="Sumarlo" valor={p.incluir} onChange={(b) => actualizar((d) => void (d.railway.pruebas.incluir = b))} />}
        >
          <p className="mb-3 text-xs text-muted">
            Del panel <em>Project usage</em> de Railway (estimado del mes). Sigue corriendo junto a producción, así que se cuenta como costo fijo.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CampoNumero compacto etiqueta="Memoria" prefijo="$" sufijo="USD" paso={0.01} min={0} valor={p.ramUsd} onChange={(n) => actualizar((d) => void (d.railway.pruebas.ramUsd = n))} />
            <CampoNumero compacto etiqueta="CPU" prefijo="$" sufijo="USD" paso={0.01} min={0} valor={p.cpuUsd} onChange={(n) => actualizar((d) => void (d.railway.pruebas.cpuUsd = n))} />
            <CampoNumero compacto etiqueta="Red (egress)" prefijo="$" sufijo="USD" paso={0.01} min={0} valor={p.egressUsd} onChange={(n) => actualizar((d) => void (d.railway.pruebas.egressUsd = n))} />
            <CampoNumero compacto etiqueta="Volúmenes" prefijo="$" sufijo="USD" paso={0.01} min={0} valor={p.volumenUsd} onChange={(n) => actualizar((d) => void (d.railway.pruebas.volumenUsd = n))} />
            <CampoNumero compacto etiqueta="Backups" prefijo="$" sufijo="USD" paso={0.01} min={0} valor={p.backupUsd} onChange={(n) => actualizar((d) => void (d.railway.pruebas.backupUsd = n))} />
            <div className="rounded-lg bg-panel-2 p-2.5">
              <div className="text-[11px] text-muted">Total al mes</div>
              <div className="num text-sm font-semibold">{fUSD(totalMedido(p))}</div>
            </div>
          </div>
          <div className="mt-3" />
          <Selector<PlanRailway>
            etiqueta="Plan del workspace"
            valor={cfg.railway.plan}
            opciones={(Object.keys(PLANES_RAILWAY) as PlanRailway[]).map((k) => ({ valor: k, texto: `${PLANES_RAILWAY[k].nombre} · $${PLANES_RAILWAY[k].cuota}/mes (incluye $${PLANES_RAILWAY[k].credito} de uso)` }))}
            onChange={(v) => actualizar((d) => void (d.railway.plan = v))}
          />
        </Tarjeta>

        <Tarjeta titulo="Factura mensual de Railway según alumnos">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curva} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="alumnos" stroke="var(--muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} width={52} />
                <Tooltip
                  contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `${fNum(Number(v))} alumnos`}
                  formatter={(v) => [fUSD(Number(v)), 'Factura / mes']}
                />
                <Line type="stepAfter" dataKey="factura" stroke="var(--serie-2)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-3">
            <Dato texto="Usuarios activos" valor={fNum(activos)} />
            <Dato texto="Simultáneos" valor={fNum2(rw.mesActivo.concurrentes)} />
            {aproximado && <Dato texto="Réplicas por imagen" valor={String(rw.mesActivo.replicasPorImagen)} />}
            <Dato texto="Memoria" valor={fUSD(rw.mesActivo.ramUsd)} />
            <Dato texto="CPU" valor={fUSD(rw.mesActivo.cpuUsd)} />
            <Dato texto="Red + volumen + backup" valor={fUSD(rw.mesActivo.egressUsd + rw.mesActivo.volumenUsd + rw.mesActivo.backupUsd)} />
          </div>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Tráfico">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <CampoNumero compacto etiqueta="Entran a diario" sufijo="%" min={0} max={100} valor={t.dauPct} onChange={(n) => actualizar((d) => void (d.railway.trafico.dauPct = n))} />
          <CampoNumero compacto etiqueta="Días con clases / mes" min={1} max={30} valor={t.diasActivosMes} onChange={(n) => actualizar((d) => void (d.railway.trafico.diasActivosMes = n))} />
          <CampoNumero compacto etiqueta="Horas de actividad / día" min={1} max={24} valor={t.horasActividadDia} onChange={(n) => actualizar((d) => void (d.railway.trafico.horasActividadDia = n))} />
          <CampoNumero compacto etiqueta="Minutos por sesión" min={0} valor={t.minutosSesion} onChange={(n) => actualizar((d) => void (d.railway.trafico.minutosSesion = n))} />
          {!aproximado && (
            <CampoNumero compacto etiqueta="Meses de historial en BD" min={1} max={60} valor={t.mesesHistorial} onChange={(n) => actualizar((d) => void (d.railway.trafico.mesesHistorial = n))} />
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted">Simultáneos = usuarios diarios × minutos por sesión ÷ minutos de la ventana de actividad.</p>
      </Tarjeta>

      {aproximado ? (
        <Tarjeta titulo="Función aproximada de producción">
          <div className="mb-4 rounded-lg bg-panel-2 p-3 font-mono text-[12px] leading-relaxed">
            <div>producción(U) = pruebas × <b>{a.factorProduccion}</b></div>
            <div className="pl-[7.5rem]">+ simultáneos × {a.ramMbPorSimultaneo} MB × $10/GB</div>
            <div className="pl-[7.5rem]">+ simultáneos ÷ 100 × {a.vcpuPor100Simultaneos} vCPU × $20 × fracción del mes con clases</div>
            <div className="pl-[7.5rem]">+ sesiones del mes × {a.egressMbPorSesion} MB × $0.05/GB</div>
            <div className="pl-[7.5rem]">+ registrados × {a.volumenMbPorUsuario} MB × $0.15/GB</div>
            <div className="pl-[7.5rem]">+ (réplicas − 1) × {a.imagenesFrontend} imágenes × ${a.costoReplicaUsd}</div>
            <div className="mt-1 text-muted">réplicas = ⌈simultáneos ÷ {a.usuariosPorReplica}⌉ · sesiones = usuarios activos × % diario × días con clases</div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CampoNumero compacto etiqueta="Producción en reposo" sufijo="× pruebas" paso={0.1} min={0} valor={a.factorProduccion} onChange={(n) => actualizar((d) => void (d.railway.aprox.factorProduccion = n))} ayuda="1 = mismos servicios que pruebas" />
            <CampoNumero compacto etiqueta="Imágenes de frontend" min={0} valor={a.imagenesFrontend} onChange={(n) => actualizar((d) => void (d.railway.aprox.imagenesFrontend = Math.round(n)))} />
            <CampoNumero compacto etiqueta="Costo por réplica extra" prefijo="$" sufijo="USD/mes" paso={0.1} min={0} valor={a.costoReplicaUsd} onChange={(n) => actualizar((d) => void (d.railway.aprox.costoReplicaUsd = n))} ayuda="≈ RAM en reposo de una imagen × $10/GB" />
            <CampoNumero compacto etiqueta="Simultáneos por réplica" min={1} valor={a.usuariosPorReplica} onChange={(n) => actualizar((d) => void (d.railway.aprox.usuariosPorReplica = n))} />
            <CampoNumero compacto etiqueta="RAM por simultáneo" sufijo="MB" min={0} valor={a.ramMbPorSimultaneo} onChange={(n) => actualizar((d) => void (d.railway.aprox.ramMbPorSimultaneo = n))} ayuda="sesiones, sockets, caché" />
            <CampoNumero compacto etiqueta="vCPU por 100 simultáneos" paso={0.1} min={0} valor={a.vcpuPor100Simultaneos} onChange={(n) => actualizar((d) => void (d.railway.aprox.vcpuPor100Simultaneos = n))} />
            <CampoNumero compacto etiqueta="Egress por sesión" sufijo="MB" paso={0.1} min={0} valor={a.egressMbPorSesion} onChange={(n) => actualizar((d) => void (d.railway.aprox.egressMbPorSesion = n))} />
            <CampoNumero compacto etiqueta="Datos por usuario" sufijo="MB" paso={0.5} min={0} valor={a.volumenMbPorUsuario} onChange={(n) => actualizar((d) => void (d.railway.aprox.volumenMbPorUsuario = n))} />
          </div>
          <div className="mt-4" />
          <Aviso tono={rw.mesActivo.replicasPorImagen > 1 ? 'alerta' : 'neutro'}>
            {rw.mesActivo.replicasPorImagen} réplica{rw.mesActivo.replicasPorImagen > 1 ? 's' : ''} por imagen con {fNum2(rw.mesActivo.concurrentes)} simultáneos.
            La siguiente réplica entra al pasar {fNum(rw.mesActivo.replicasPorImagen * a.usuariosPorReplica)} simultáneos
            {rw.mesActivo.concurrentes > 0 && <> (≈ {fNum((r.usuarios.alumnos * rw.mesActivo.replicasPorImagen * a.usuariosPorReplica) / rw.mesActivo.concurrentes)} alumnos)</>}; hasta entonces los tres campos de réplicas no cambian el costo.
          </Aviso>
          <p className="mt-3 text-[11px] text-muted">
            Para afinar la pendiente: corre <em>gameloadtests</em> con N usuarios simulados y divide el aumento de memoria (MB) entre N simultáneos. Las gráficas de pruebas muestran picos de ~1.2 GB sobre una base de ~250 MB en niolearningwebapp.
          </p>
        </Tarjeta>
      ) : (
        <>
          <Tarjeta titulo="Consumo estimado por servicio (producción, mes con clases)">
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
                  <td>Producción</td>
                  <td colSpan={5} />
                  <td className="num text-right">{fUSD(rw.mesActivo.produccionUsd)}</td>
                </tr>
              </tbody>
            </Tabla>
          </Tarjeta>

          <Tarjeta
            titulo="Calibración con una factura de producción"
            accion={<Interruptor etiqueta="Usar calibración" valor={calib.activa} onChange={(b) => actualizar((d) => void (d.railway.calibracion.activa = b))} />}
          >
            <p className="mb-3 text-xs text-muted">
              Cuando tengas un mes de producción, copia el costo por recurso y cuántos usuarios activos e interacciones de IA hubo. La especificación se ajusta para reproducir esa factura.
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
            titulo="Servicios desplegados en producción"
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
              Toma los valores en reposo de la pestaña <em>Metrics</em> de cada servicio en un rato sin tráfico. El CPU por request sale de dividir el CPU extra en hora pico entre los requests de esa hora.
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
        </>
      )}

      <Aviso>
        Precios: ${PRECIOS_RAILWAY.vcpuMes}/vCPU-mes · ${PRECIOS_RAILWAY.ramGbMes}/GB RAM-mes · ${PRECIOS_RAILWAY.egressGb}/GB egress · ${PRECIOS_RAILWAY.volumenGbMes}/GB volumen. La factura del workspace es cuota del plan + lo que el uso total (pruebas + producción) exceda el crédito incluido.
      </Aviso>
    </div>
  )
}

function Dato({ texto, valor }: { texto: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{texto}</span>
      <span className="num text-ink">{valor}</span>
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
