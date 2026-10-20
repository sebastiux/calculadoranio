import { costoIAUsuario, LONG_CONTEXT_THRESHOLD, MODELOS_GROK, type PerfilIA, type TarifaTokens } from '../lib/grok'
import { fNum, fUSD, fUSD4, fMXN, fCompacto } from '../lib/format'
import { Aviso, CampoNumero, Insignia, Kpi, Selector, Tabla, Tarjeta } from './ui'
import type { PropsTab } from './tipos'

export function TabIA({ cfg, r, actualizar }: PropsTab) {
  const ia = r.ia
  const opciones = [...MODELOS_GROK.map((m) => ({ valor: m.id, texto: m.id })), { valor: 'personalizado', texto: 'Personalizado…' }]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi etiqueta="Costo IA al mes (mes activo)" valor={fUSD(ia.mensualUsd)} sub={fMXN(ia.mensualUsd * cfg.tipoCambio)} />
        <Kpi etiqueta="Costo IA anual" valor={fMXN(ia.anualMxn)} sub={`${fUSD(ia.anualUsd)} · ${cfg.ventas.mesesLicencia} meses`} />
        <Kpi etiqueta="Por alumno activo / mes" valor={fUSD(ia.alumno.costoMesUsd)} sub={ia.alumno.topeAplicado ? 'limitado por el tope' : `${fUSD4(ia.alumno.costoSolicitudUsd)} por solicitud`} tono={ia.alumno.topeAplicado ? 'acento' : 'neutro'} />
        <Kpi etiqueta="Solicitudes a la API / mes" valor={fCompacto(ia.interaccionesMes)} sub={`${fCompacto(ia.alumno.tokensMes * r.usuarios.alumnosActivos + ia.maestro.tokensMes * r.usuarios.maestrosActivos)} tokens`} />
      </div>

      <Tarjeta titulo="Modelo y precios xAI (USD por 1M tokens)">
        <div className="mb-4 grid gap-3 sm:grid-cols-[260px_1fr] sm:items-end">
          <Selector etiqueta="Modelo" valor={cfg.ia.modeloId} opciones={opciones} onChange={(v) => actualizar((d) => void (d.ia.modeloId = v))} />
          <p className="text-[11px] text-muted">
            Se cobra la tarifa de contexto largo cuando el prompt de una solicitud llega a {fNum(LONG_CONTEXT_THRESHOLD)} tokens. Los tokens de razonamiento se cobran como salida.
          </p>
        </div>

        {cfg.ia.modeloId === 'personalizado' && (
          <div className="mb-4 grid gap-4 rounded-lg bg-panel-2 p-3 sm:grid-cols-2">
            <EditorTarifa titulo="Contexto corto" t={cfg.ia.personalizado.short} onChange={(t) => actualizar((d) => void (d.ia.personalizado.short = t))} />
            <EditorTarifa titulo="Contexto largo (≥ 200k)" t={cfg.ia.personalizado.long} onChange={(t) => actualizar((d) => void (d.ia.personalizado.long = t))} />
          </div>
        )}

        <Tabla>
          <thead>
            <tr>
              <th>Modelo</th>
              <th className="!text-right">Contexto</th>
              <th className="!text-right">Input</th>
              <th className="!text-right">Cached</th>
              <th className="!text-right">Output</th>
              <th className="!text-right">Largo in / out</th>
              <th className="!text-right">Alumno / mes</th>
              <th className="!text-right">IA anual</th>
            </tr>
          </thead>
          <tbody>
            {MODELOS_GROK.map((m) => {
              const ca = costoIAUsuario(m, cfg.ia.alumno)
              const cm = costoIAUsuario(m, cfg.ia.maestro)
              const anual = (r.usuarios.alumnosActivos * ca.costoMesUsd + r.usuarios.maestrosActivos * cm.costoMesUsd) * cfg.ventas.mesesLicencia * cfg.tipoCambio
              const activo = m.id === ia.modelo.id
              return (
                <tr
                  key={m.id}
                  onClick={() => actualizar((d) => void (d.ia.modeloId = m.id))}
                  className={`cursor-pointer ${activo ? 'bg-accent-soft' : 'hover:bg-panel-2'}`}
                >
                  <td className="font-medium">
                    {m.id} {activo && <Insignia tono="bueno">en uso</Insignia>}
                  </td>
                  <td className="num text-right text-muted">{m.contexto >= 1_000_000 ? `${m.contexto / 1_000_000}M` : `${m.contexto / 1000}k`}</td>
                  <td className="num text-right">${m.short.input.toFixed(2)}</td>
                  <td className="num text-right">${m.short.cached.toFixed(2)}</td>
                  <td className="num text-right">${m.short.output.toFixed(2)}</td>
                  <td className="num text-right text-muted">
                    ${m.long.input.toFixed(2)} / ${m.long.output.toFixed(2)}
                  </td>
                  <td className="num text-right">{fUSD(ca.costoMesUsd)}</td>
                  <td className="num text-right">{fMXN(anual)}</td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
        <p className="mt-2 text-[11px] text-muted">Las dos últimas columnas usan tus perfiles de uso de abajo; haz clic en un modelo para usarlo.</p>
      </Tarjeta>

      <div className="grid gap-4 xl:grid-cols-2">
        <EditorPerfil titulo="Perfil de uso · alumno" perfil={cfg.ia.alumno} costo={ia.alumno} onChange={(p) => actualizar((d) => void (d.ia.alumno = p))} />
        <EditorPerfil titulo="Perfil de uso · maestro" perfil={cfg.ia.maestro} costo={ia.maestro} onChange={(p) => actualizar((d) => void (d.ia.maestro = p))} />
      </div>

      <Aviso>
        <strong>¿Cómo sacar estos números?</strong> En la consola de xAI (Usage) divide los tokens de entrada, cacheados y de salida del mes entre el número de solicitudes; eso te da los promedios por solicitud. El % de caché sube si el system prompt va siempre al inicio y no cambia entre mensajes.
      </Aviso>
    </div>
  )
}

function EditorTarifa({ titulo, t, onChange }: { titulo: string; t: TarifaTokens; onChange: (t: TarifaTokens) => void }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold">{titulo}</div>
      <div className="grid grid-cols-3 gap-2">
        <CampoNumero compacto etiqueta="Input" prefijo="$" paso={0.01} min={0} valor={t.input} onChange={(n) => onChange({ ...t, input: n })} />
        <CampoNumero compacto etiqueta="Cached" prefijo="$" paso={0.01} min={0} valor={t.cached} onChange={(n) => onChange({ ...t, cached: n })} />
        <CampoNumero compacto etiqueta="Output" prefijo="$" paso={0.01} min={0} valor={t.output} onChange={(n) => onChange({ ...t, output: n })} />
      </div>
    </div>
  )
}

function EditorPerfil({ titulo, perfil, costo, onChange }: { titulo: string; perfil: PerfilIA; costo: ReturnType<typeof costoIAUsuario>; onChange: (p: PerfilIA) => void }) {
  const set = (k: keyof PerfilIA) => (n: number) => onChange({ ...perfil, [k]: n })
  return (
    <Tarjeta titulo={titulo} accion={<Insignia tono={costo.tarifa === 'long' ? 'malo' : 'neutro'}>tarifa {costo.tarifa === 'long' ? 'contexto largo' : 'corta'}</Insignia>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CampoNumero etiqueta="Usuarios activos" sufijo="%" min={0} max={100} valor={perfil.pctActivos} onChange={set('pctActivos')} />
        <CampoNumero etiqueta="Solicitudes / mes" min={0} valor={perfil.interaccionesMes} onChange={set('interaccionesMes')} />
        <CampoNumero etiqueta="Tope de crédito" prefijo="$" sufijo="USD" paso={0.1} min={0} valor={perfil.topeUsd} onChange={set('topeUsd')} ayuda="0 = sin tope" />
        <CampoNumero etiqueta="Tokens entrada" min={0} valor={perfil.tokensEntrada} onChange={set('tokensEntrada')} ayuda="system + historial + mensaje" />
        <CampoNumero etiqueta="Entrada en caché" sufijo="%" min={0} max={100} valor={perfil.pctCache} onChange={set('pctCache')} />
        <CampoNumero etiqueta="Tokens salida" min={0} valor={perfil.tokensSalida} onChange={set('tokensSalida')} />
        <CampoNumero etiqueta="Tokens razonamiento" min={0} valor={perfil.tokensRazonamiento} onChange={set('tokensRazonamiento')} ayuda="se cobran como salida" />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Por solicitud</dt>
          <dd className="num font-medium">{fUSD4(costo.costoSolicitudUsd)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Sin tope / mes</dt>
          <dd className="num font-medium">{fUSD(costo.costoSinTopeUsd)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cobrado / mes</dt>
          <dd className={`num font-medium ${costo.topeAplicado ? 'text-accent' : ''}`}>{fUSD(costo.costoMesUsd)}</dd>
        </div>
      </dl>
      {costo.topeAplicado && (
        <p className="mt-2 text-[11px] text-muted">
          El tope corta el uso en ~{fNum(perfil.topeUsd / costo.costoSolicitudUsd)} solicitudes al mes; Railway también se calcula con ese tráfico.
        </p>
      )}
    </Tarjeta>
  )
}
