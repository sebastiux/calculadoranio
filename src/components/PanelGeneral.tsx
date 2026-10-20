import { NIVELES_DESCUENTO } from '../lib/config'
import { fMXN } from '../lib/format'
import { Boton, CampoNumero, EntradaNumero, Interruptor, Seccion } from './ui'
import { nuevoId, type PropsTab } from './tipos'

export function PanelGeneral({ cfg, r, actualizar }: PropsTab) {
  const v = cfg.ventas
  const inversionTotal = cfg.inversion.reduce((a, i) => a + i.monto, 0)

  return (
    <>
      <Seccion titulo="Usuarios y precio" abierta>
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero etiqueta="Alumnos (licencias)" valor={v.alumnos} min={0} onChange={(n) => actualizar((d) => void (d.ventas.alumnos = Math.round(n)))} />
          <CampoNumero etiqueta="Maestros" valor={v.maestros} min={0} onChange={(n) => actualizar((d) => void (d.ventas.maestros = Math.round(n)))} />
        </div>
        <CampoNumero
          etiqueta="Licencia anual por alumno (sin IVA)"
          prefijo="$"
          sufijo="MXN"
          valor={v.precioAlumnoAnual}
          min={0}
          onChange={(n) => actualizar((d) => void (d.ventas.precioAlumnoAnual = n))}
          ayuda={`Equivale a ${fMXN(r.precio.alumno / Math.max(1, v.mesesLicencia))} por mes de uso`}
        />
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero
            etiqueta="Maestros incluidos / 100 alumnos"
            valor={v.maestrosIncluidosPor100}
            min={0}
            onChange={(n) => actualizar((d) => void (d.ventas.maestrosIncluidosPor100 = n))}
            compacto
          />
          <CampoNumero
            etiqueta="Licencia maestro extra"
            prefijo="$"
            valor={v.precioMaestroAnual}
            min={0}
            onChange={(n) => actualizar((d) => void (d.ventas.precioMaestroAnual = n))}
            compacto
          />
        </div>
        <p className="text-[11px] text-muted">
          {r.usuarios.maestrosIncluidos} maestros incluidos · {r.usuarios.maestrosPagados} pagan licencia propia
        </p>
        <CampoNumero
          etiqueta="Meses de uso por licencia"
          sufijo="meses"
          valor={v.mesesLicencia}
          min={1}
          max={12}
          onChange={(n) => actualizar((d) => void (d.ventas.mesesLicencia = Math.round(n)))}
          ayuda="Los costos variables corren estos meses; los fijos corren los 12."
        />
        <Interruptor
          etiqueta="Aplicar descuento por volumen"
          valor={v.aplicarDescuento}
          onChange={(b) => actualizar((d) => void (d.ventas.aplicarDescuento = b))}
          ayuda={r.precio.nivel ? `Nivel ${r.precio.nivel.nombre}: −${r.precio.descuentoPct}% → ${fMXN(r.precio.alumno)}` : 'Tabla de niveles de la calculadora anterior'}
        />
        {v.aplicarDescuento && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg bg-panel-2 p-2.5 text-[11px]">
            {NIVELES_DESCUENTO.map((n) => (
              <div key={n.nombre} className={`flex justify-between ${r.precio.nivel?.nombre === n.nombre ? 'font-semibold text-accent' : 'text-muted'}`}>
                <span>{n.nombre} ({n.min}+)</span>
                <span className="num">−{n.descuentoPct}%</span>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Tipo de cambio y metas">
        <CampoNumero etiqueta="Tipo de cambio" prefijo="$" sufijo="MXN / USD" paso={0.01} valor={cfg.tipoCambio} min={1} onChange={(n) => actualizar((d) => void (d.tipoCambio = n))} />
        <CampoNumero etiqueta="Margen neto objetivo" sufijo="%" valor={cfg.margenObjetivoPct} min={0} max={100} onChange={(n) => actualizar((d) => void (d.margenObjetivoPct = n))} />
      </Seccion>

      <Seccion titulo="Inversión inicial" extra={<span className="num text-xs text-muted">{fMXN(inversionTotal)}</span>}>
        {cfg.inversion.map((inv, i) => (
          <div key={inv.id} className="flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              value={inv.nombre}
              onChange={(e) => actualizar((d) => void (d.inversion[i].nombre = e.target.value))}
            />
            <EntradaNumero className="w-32" prefijo="$" valor={inv.monto} min={0} onChange={(n) => actualizar((d) => void (d.inversion[i].monto = n))} />
            <button type="button" aria-label="Eliminar" className="px-1 text-muted hover:text-bad" onClick={() => actualizar((d) => void d.inversion.splice(i, 1))}>
              ×
            </button>
          </div>
        ))}
        <Boton variante="fantasma" onClick={() => actualizar((d) => void d.inversion.push({ id: nuevoId(), nombre: 'Nueva inversión', monto: 0 }))}>
          + Agregar inversión
        </Boton>
      </Seccion>
    </>
  )
}
