import type { FilaDirecta, FilaIndirecta, Moneda } from '../lib/config'
import type { Linea } from '../lib/engine'
import { fMXN, fPct } from '../lib/format'
import { Boton, CampoNumero, EntradaNumero, Insignia, Tabla, Tarjeta } from './ui'
import { nuevoId, type PropsTab } from './tipos'

export function TabCostos({ cfg, r, actualizar }: PropsTab) {
  const directos = r.lineas.filter((l) => l.tipo === 'directo')
  const indirectos = r.lineas.filter((l) => l.tipo === 'indirecto')

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Resumen titulo="Directos" monto={r.totales.directoMxn} total={r.totales.totalMxn} texto="Crecen con cada alumno: IA, consumo de Railway, comisiones." tono="directo" />
        <Resumen titulo="Indirectos" monto={r.totales.indirectoMxn} total={r.totales.totalMxn} texto="Estructura que pagas aunque no vendas: equipo, plan base, herramientas." tono="indirecto" />
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="text-xs text-muted">Total anual</div>
          <div className="num mt-1 text-2xl font-semibold">{fMXN(r.totales.totalMxn)}</div>
          <div className="mt-1 text-xs text-muted">{fMXN(r.totales.totalMxn / 12)} al mes en promedio</div>
        </div>
      </div>

      <Tarjeta titulo="Desglose anual">
        <Tabla>
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="!text-right">Anual</th>
              <th className="!text-right">Prom. mensual</th>
              <th className="!text-right">Por alumno</th>
              <th className="!text-right">% total</th>
            </tr>
          </thead>
          <tbody>
            <Grupo titulo="Costos directos (variables)" lineas={directos} total={r.totales.totalMxn} alumnos={r.usuarios.alumnos} subtotal={r.totales.directoMxn} />
            <Grupo titulo="Costos indirectos (fijos)" lineas={indirectos} total={r.totales.totalMxn} alumnos={r.usuarios.alumnos} subtotal={r.totales.indirectoMxn} />
            <tr className="font-semibold">
              <td>Total</td>
              <td className="num text-right">{fMXN(r.totales.totalMxn)}</td>
              <td className="num text-right">{fMXN(r.totales.totalMxn / 12)}</td>
              <td className="num text-right">{fMXN(r.unitario.totalPorAlumno)}</td>
              <td className="num text-right">100%</td>
            </tr>
          </tbody>
        </Tabla>
      </Tarjeta>

      <Tarjeta
        titulo="Costos indirectos editables"
        accion={
          <Boton
            variante="fantasma"
            onClick={() =>
              actualizar((d) => void d.indirectos.push({ id: nuevoId(), nombre: 'Nuevo gasto', monto: 0, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true }))
            }
          >
            + Agregar
          </Boton>
        }
      >
        <div className="space-y-2">
          {cfg.indirectos.map((fila, i) => (
            <EditorIndirecto
              key={fila.id}
              fila={fila}
              onChange={(f) => actualizar((d) => void (d.indirectos[i] = f))}
              onEliminar={() => actualizar((d) => void d.indirectos.splice(i, 1))}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[200px_1fr] sm:items-end">
          <CampoNumero etiqueta="Carga social sobre nómina" sufijo="%" valor={cfg.cargaSocialPct} min={0} max={100} onChange={(n) => actualizar((d) => void (d.cargaSocialPct = n))} />
          <p className="text-[11px] text-muted">
            Marca “Nómina” en los sueldos (founders, devs, diseño) para sumarles IMSS, Infonavit, SAR e ISN. La nómina no genera IVA acreditable.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLANTILLAS.map((p) => (
            <Boton key={p.nombre} variante="secundario" className="!text-xs" onClick={() => actualizar((d) => void d.indirectos.push({ ...p, id: nuevoId() }))}>
              + {p.nombre}
            </Boton>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Otros costos directos"
        accion={
          <Boton variante="fantasma" onClick={() => actualizar((d) => void d.directos.push({ id: nuevoId(), nombre: 'Nuevo costo directo', monto: 0, moneda: 'MXN', base: 'licencia', iva: true }))}>
            + Agregar
          </Boton>
        }
      >
        <p className="mb-3 text-xs text-muted">
          IA, Railway variable y pasarela se calculan solos. Agrega aquí lo demás que crece con cada alumno: materiales, SMS/correo transaccional, soporte por ticket, comisión de vendedores…
        </p>
        <div className="space-y-2">
          {cfg.directos.map((fila, i) => (
            <EditorDirecto
              key={fila.id}
              fila={fila}
              onChange={(f) => actualizar((d) => void (d.directos[i] = f))}
              onEliminar={() => actualizar((d) => void d.directos.splice(i, 1))}
            />
          ))}
        </div>
      </Tarjeta>
    </div>
  )
}

const PLANTILLAS: Omit<FilaIndirecta, 'id'>[] = [
  { nombre: 'Founder CEO', monto: 35000, moneda: 'MXN', periodo: 'mensual', nomina: true, iva: false },
  { nombre: 'Founder CTO', monto: 35000, moneda: 'MXN', periodo: 'mensual', nomina: true, iva: false },
  { nombre: 'Dev Jr', monto: 18000, moneda: 'MXN', periodo: 'mensual', nomina: true, iva: false },
  { nombre: 'Dev Sr', monto: 35000, moneda: 'MXN', periodo: 'mensual', nomina: true, iva: false },
  { nombre: 'Diseñador', monto: 20000, moneda: 'MXN', periodo: 'mensual', nomina: true, iva: false },
  { nombre: 'Marketing', monto: 5000, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true },
  { nombre: 'Oficina / coworking', monto: 4000, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true },
]

function Resumen({ titulo, monto, total, texto, tono }: { titulo: string; monto: number; total: number; texto: string; tono: 'directo' | 'indirecto' }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <Insignia tono={tono}>{titulo}</Insignia>
        <span className="num text-xs text-muted">{fPct((monto / Math.max(1, total)) * 100)}</span>
      </div>
      <div className="num mt-2 text-2xl font-semibold">{fMXN(monto)}</div>
      <div className="mt-1 text-xs text-muted">{texto}</div>
    </div>
  )
}

function Grupo({ titulo, lineas, total, alumnos, subtotal }: { titulo: string; lineas: Linea[]; total: number; alumnos: number; subtotal: number }) {
  return (
    <>
      <tr>
        <td colSpan={5} className="!bg-panel-2 !py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          {titulo}
        </td>
      </tr>
      {lineas.map((l) => (
        <tr key={l.id}>
          <td>
            <div className="flex items-center gap-2">
              {l.concepto}
              {l.grupo === 'Nómina' && <Insignia>nómina</Insignia>}
            </div>
            <div className="text-[11px] text-muted">{l.detalle}</div>
          </td>
          <td className="num text-right">{fMXN(l.anualMxn)}</td>
          <td className="num text-right text-muted">{fMXN(l.anualMxn / 12)}</td>
          <td className="num text-right text-muted">{fMXN(alumnos > 0 ? l.anualMxn / alumnos : 0)}</td>
          <td className="num text-right text-muted">{fPct((l.anualMxn / Math.max(1, total)) * 100)}</td>
        </tr>
      ))}
      <tr className="font-medium">
        <td className="text-muted">Subtotal</td>
        <td className="num text-right">{fMXN(subtotal)}</td>
        <td className="num text-right">{fMXN(subtotal / 12)}</td>
        <td className="num text-right">{fMXN(alumnos > 0 ? subtotal / alumnos : 0)}</td>
        <td className="num text-right">{fPct((subtotal / Math.max(1, total)) * 100)}</td>
      </tr>
    </>
  )
}

const claseTexto = 'min-w-0 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent'

function SelectorMoneda({ valor, onChange }: { valor: Moneda; onChange: (m: Moneda) => void }) {
  return (
    <select className={claseTexto} value={valor} onChange={(e) => onChange(e.target.value as Moneda)}>
      <option value="MXN">MXN</option>
      <option value="USD">USD</option>
    </select>
  )
}

function Check({ etiqueta, valor, onChange }: { etiqueta: string; valor: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
      <input type="checkbox" className="accent-[var(--accent)]" checked={valor} onChange={(e) => onChange(e.target.checked)} />
      {etiqueta}
    </label>
  )
}

function EditorIndirecto({ fila, onChange, onEliminar }: { fila: FilaIndirecta; onChange: (f: FilaIndirecta) => void; onEliminar: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2 md:grid-cols-[1fr_130px_80px_110px_auto_auto]">
      <input className={`${claseTexto} col-span-2 md:col-span-1`} value={fila.nombre} onChange={(e) => onChange({ ...fila, nombre: e.target.value })} />
      <EntradaNumero prefijo="$" valor={fila.monto} min={0} onChange={(n) => onChange({ ...fila, monto: n })} />
      <SelectorMoneda valor={fila.moneda} onChange={(m) => onChange({ ...fila, moneda: m })} />
      <select className={claseTexto} value={fila.periodo} onChange={(e) => onChange({ ...fila, periodo: e.target.value as FilaIndirecta['periodo'] })}>
        <option value="mensual">mensual</option>
        <option value="anual">anual</option>
      </select>
      <div className="flex items-center gap-3">
        <Check etiqueta="Nómina" valor={fila.nomina} onChange={(b) => onChange({ ...fila, nomina: b, iva: b ? false : fila.iva })} />
        <Check etiqueta="IVA" valor={fila.iva} onChange={(b) => onChange({ ...fila, iva: b })} />
      </div>
      <button type="button" aria-label="Eliminar" className="px-2 text-muted hover:text-bad" onClick={onEliminar}>
        ×
      </button>
    </div>
  )
}

function EditorDirecto({ fila, onChange, onEliminar }: { fila: FilaDirecta; onChange: (f: FilaDirecta) => void; onEliminar: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2 md:grid-cols-[1fr_130px_80px_170px_auto_auto]">
      <input className={`${claseTexto} col-span-2 md:col-span-1`} value={fila.nombre} onChange={(e) => onChange({ ...fila, nombre: e.target.value })} />
      <EntradaNumero prefijo="$" valor={fila.monto} min={0} paso={0.01} onChange={(n) => onChange({ ...fila, monto: n })} />
      <SelectorMoneda valor={fila.moneda} onChange={(m) => onChange({ ...fila, moneda: m })} />
      <select className={claseTexto} value={fila.base} onChange={(e) => onChange({ ...fila, base: e.target.value as FilaDirecta['base'] })}>
        <option value="licencia">por licencia al año</option>
        <option value="usuarioMes">por usuario activo al mes</option>
      </select>
      <Check etiqueta="IVA" valor={fila.iva} onChange={(b) => onChange({ ...fila, iva: b })} />
      <button type="button" aria-label="Eliminar" className="px-2 text-muted hover:text-bad" onClick={onEliminar}>
        ×
      </button>
    </div>
  )
}
