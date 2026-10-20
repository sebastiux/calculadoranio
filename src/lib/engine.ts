import { NIVELES_DESCUENTO, type Config, type NivelDescuento } from './config'
import { MODELOS_GROK, costoIAUsuario, interaccionesEfectivas, type CostoIAUsuario, type ModeloGrok } from './grok'
import { calcularMesRailway, factoresCalibracion, type Factores, type MesRailway } from './railway'
import { calcularISR, calcularIVA, REGIMENES, type Regimen, type ResultadoISR, type ResultadoIVA } from './fiscal'

export type Grupo = 'IA' | 'Railway' | 'Pasarela' | 'Otros directos' | 'Estructura' | 'Nómina'

export interface Linea {
  id: string
  concepto: string
  tipo: 'directo' | 'indirecto'
  grupo: Grupo
  anualMxn: number
  iva: boolean
  detalle: string
}

export interface Resultado {
  usuarios: {
    alumnos: number
    maestros: number
    maestrosIncluidos: number
    maestrosPagados: number
    alumnosActivos: number
    maestrosActivos: number
    licenciasPagadas: number
  }
  precio: { base: number; nivel: NivelDescuento | null; descuentoPct: number; alumno: number }
  ingresos: { alumnosMxn: number; maestrosMxn: number; totalMxn: number }
  ia: {
    modelo: ModeloGrok
    alumno: CostoIAUsuario
    maestro: CostoIAUsuario
    interaccionesMes: number
    mensualUsd: number
    anualUsd: number
    anualMxn: number
  }
  railway: {
    factores: Factores
    mesActivo: MesRailway
    mesInactivo: MesRailway
    mesVacio: MesRailway
    anualUsd: number
    fijoAnualUsd: number
    variableAnualUsd: number
  }
  lineas: Linea[]
  totales: {
    directoMxn: number
    indirectoMxn: number
    totalMxn: number
    utilidadBrutaMxn: number
    margenBrutoPct: number
    margenContribucionMxn: number
    margenContribucionPct: number
  }
  unitario: {
    directoPorAlumno: number
    indirectoPorAlumno: number
    totalPorAlumno: number
    ingresoPorAlumno: number
    utilidadPorAlumno: number
  }
  fiscal: {
    regimen: Regimen
    isr: ResultadoISR
    comparativo: Record<Regimen, ResultadoISR>
    iva: ResultadoIVA
    utilidadNetaMxn: number
    margenNetoPct: number
  }
  roi: {
    inversionMxn: number
    mesesRecuperacion: number | null
    roiAnualPct: number
  }
}

export function modeloActivo(cfg: Config): ModeloGrok {
  if (cfg.ia.modeloId === 'personalizado') {
    return { id: 'personalizado', contexto: 0, short: cfg.ia.personalizado.short, long: cfg.ia.personalizado.long }
  }
  return MODELOS_GROK.find((m) => m.id === cfg.ia.modeloId) ?? MODELOS_GROK[0]
}

export function nivelDescuento(alumnos: number): NivelDescuento | null {
  let nivel: NivelDescuento | null = null
  for (const n of NIVELES_DESCUENTO) if (alumnos >= n.min) nivel = n
  return nivel
}

export function calcular(cfg: Config): Resultado {
  const tc = cfg.tipoCambio
  const v = cfg.ventas
  const meses = Math.min(12, Math.max(0, v.mesesLicencia))
  const mxn = (monto: number, moneda: 'MXN' | 'USD') => (moneda === 'USD' ? monto * tc : monto)

  // ── Usuarios y precio ─────────────────────────────────────────────
  const alumnos = Math.max(0, Math.floor(v.alumnos))
  const maestros = Math.max(0, Math.floor(v.maestros))
  const maestrosIncluidos = Math.floor((alumnos * v.maestrosIncluidosPor100) / 100)
  const maestrosPagados = Math.max(0, maestros - maestrosIncluidos)
  const alumnosActivos = alumnos * (cfg.ia.alumno.pctActivos / 100)
  const maestrosActivos = maestros * (cfg.ia.maestro.pctActivos / 100)

  const nivel = v.aplicarDescuento ? nivelDescuento(alumnos) : null
  const descuentoPct = nivel?.descuentoPct ?? 0
  const precioAlumno = v.precioAlumnoAnual * (1 - descuentoPct / 100)

  const ingresosAlumnos = alumnos * precioAlumno
  const ingresosMaestros = maestrosPagados * v.precioMaestroAnual
  const ingresos = ingresosAlumnos + ingresosMaestros

  // ── IA (Grok) ──────────────────────────────────────────────────────
  const modelo = modeloActivo(cfg)
  const iaAlumno = costoIAUsuario(modelo, cfg.ia.alumno)
  const iaMaestro = costoIAUsuario(modelo, cfg.ia.maestro)
  const iaMensualUsd = alumnosActivos * iaAlumno.costoMesUsd + maestrosActivos * iaMaestro.costoMesUsd
  const iaAnualUsd = iaMensualUsd * meses
  const interaccionesMes =
    alumnosActivos * interaccionesEfectivas(cfg.ia.alumno, iaAlumno) + maestrosActivos * interaccionesEfectivas(cfg.ia.maestro, iaMaestro)

  // ── Railway ────────────────────────────────────────────────────────
  const factores = factoresCalibracion(cfg.railway)
  const registrados = alumnos + maestros
  const mesActivo = calcularMesRailway(cfg.railway, { usuariosActivos: alumnosActivos + maestrosActivos, usuariosRegistrados: registrados, interaccionesIA: interaccionesMes }, factores)
  const mesInactivo = calcularMesRailway(cfg.railway, { usuariosActivos: 0, usuariosRegistrados: registrados, interaccionesIA: 0 }, factores)
  const mesVacio = calcularMesRailway(cfg.railway, { usuariosActivos: 0, usuariosRegistrados: 0, interaccionesIA: 0 }, factores)
  const railwayAnualUsd = mesActivo.facturaUsd * meses + mesInactivo.facturaUsd * (12 - meses)
  const railwayFijoUsd = mesVacio.facturaUsd * 12
  const railwayVariableUsd = Math.max(0, railwayAnualUsd - railwayFijoUsd)

  // ── Líneas de costo ────────────────────────────────────────────────
  const lineas: Linea[] = []
  const tokensAlumnosUsd = alumnosActivos * iaAlumno.costoMesUsd * meses
  const tokensMaestrosUsd = maestrosActivos * iaMaestro.costoMesUsd * meses
  lineas.push({
    id: 'ia-alumnos', concepto: `Tokens ${modelo.id} · alumnos`, tipo: 'directo', grupo: 'IA', anualMxn: tokensAlumnosUsd * tc, iva: cfg.fiscal.ivaIA,
    detalle: `${fmtN(alumnosActivos)} activos × $${iaAlumno.costoMesUsd.toFixed(3)} USD × ${meses} meses`,
  })
  lineas.push({
    id: 'ia-maestros', concepto: `Tokens ${modelo.id} · maestros`, tipo: 'directo', grupo: 'IA', anualMxn: tokensMaestrosUsd * tc, iva: cfg.fiscal.ivaIA,
    detalle: `${fmtN(maestrosActivos)} activos × $${iaMaestro.costoMesUsd.toFixed(3)} USD × ${meses} meses`,
  })
  lineas.push({
    id: 'railway-variable', concepto: 'Railway · consumo por usuarios', tipo: 'directo', grupo: 'Railway', anualMxn: railwayVariableUsd * tc, iva: cfg.fiscal.ivaRailway,
    detalle: `CPU, RAM, egress y volumen que agregan los usuarios (${meses} meses activos)`,
  })

  const transacciones = (cfg.pasarela.alumnosPorPago > 0 ? Math.ceil(alumnos / cfg.pasarela.alumnosPorPago) : 0) + maestrosPagados
  const comision = ingresos * (cfg.pasarela.pct / 100) + transacciones * cfg.pasarela.fijaMxn
  lineas.push({
    id: 'pasarela', concepto: 'Comisión pasarela de pago', tipo: 'directo', grupo: 'Pasarela', anualMxn: comision, iva: true,
    detalle: `${cfg.pasarela.pct}% + $${cfg.pasarela.fijaMxn} × ${fmtN(transacciones)} cobros`,
  })

  const licenciasPagadas = alumnos + maestrosPagados
  for (const d of cfg.directos) {
    const unidades = d.base === 'licencia' ? licenciasPagadas : (alumnosActivos + maestrosActivos) * meses
    lineas.push({
      id: `dir-${d.id}`, concepto: d.nombre, tipo: 'directo', grupo: 'Otros directos', anualMxn: mxn(d.monto, d.moneda) * unidades, iva: d.iva,
      detalle: d.base === 'licencia' ? `${d.monto} ${d.moneda} × ${fmtN(licenciasPagadas)} licencias` : `${d.monto} ${d.moneda} × usuario activo × ${meses} meses`,
    })
  }

  lineas.push({
    id: 'railway-fijo', concepto: `Railway · plan ${cfg.railway.plan === 'pro' ? 'Pro' : 'Hobby'} + servicios en reposo`, tipo: 'indirecto', grupo: 'Railway',
    anualMxn: railwayFijoUsd * tc, iva: cfg.fiscal.ivaRailway, detalle: `$${mesVacio.facturaUsd.toFixed(2)} USD/mes × 12 meses (corre todo el año)`,
  })

  for (const i of cfg.indirectos) {
    const factorPeriodo = i.periodo === 'mensual' ? 12 : 1
    const carga = i.nomina ? 1 + cfg.cargaSocialPct / 100 : 1
    lineas.push({
      id: `ind-${i.id}`, concepto: i.nombre, tipo: 'indirecto', grupo: i.nomina ? 'Nómina' : 'Estructura',
      anualMxn: mxn(i.monto, i.moneda) * factorPeriodo * carga, iva: i.iva && !i.nomina,
      detalle: `${i.monto.toLocaleString('es-MX')} ${i.moneda} ${i.periodo === 'mensual' ? '× 12 meses' : 'al año'}${i.nomina ? ` + ${cfg.cargaSocialPct}% carga social` : ''}`,
    })
  }

  // ── Totales ────────────────────────────────────────────────────────
  const directo = sumar(lineas.filter((l) => l.tipo === 'directo'))
  const indirecto = sumar(lineas.filter((l) => l.tipo === 'indirecto'))
  const total = directo + indirecto
  const utilidadBruta = ingresos - total
  const margenContribucion = ingresos - directo

  // ── Fiscal ─────────────────────────────────────────────────────────
  const gastosConIva = sumar(lineas.filter((l) => l.iva))
  const comparativo = Object.fromEntries(
    (Object.keys(REGIMENES) as Regimen[]).map((r) => [r, calcularISR(r, ingresos, total)]),
  ) as Record<Regimen, ResultadoISR>
  // si los ingresos rebasan el límite de RESICO, la ley te pasa a Persona Física con Actividad Empresarial
  const regimenAplicado: Regimen = comparativo[cfg.fiscal.regimen].aplica ? cfg.fiscal.regimen : 'PF_AE'
  const isr = comparativo[regimenAplicado]
  const utilidadNeta = utilidadBruta - isr.isr

  // ── ROI ────────────────────────────────────────────────────────────
  const inversion = cfg.inversion.reduce((a, i) => a + i.monto, 0)

  return {
    usuarios: { alumnos, maestros, maestrosIncluidos, maestrosPagados, alumnosActivos, maestrosActivos, licenciasPagadas },
    precio: { base: v.precioAlumnoAnual, nivel, descuentoPct, alumno: precioAlumno },
    ingresos: { alumnosMxn: ingresosAlumnos, maestrosMxn: ingresosMaestros, totalMxn: ingresos },
    ia: { modelo, alumno: iaAlumno, maestro: iaMaestro, interaccionesMes, mensualUsd: iaMensualUsd, anualUsd: iaAnualUsd, anualMxn: iaAnualUsd * tc },
    railway: { factores, mesActivo, mesInactivo, mesVacio, anualUsd: railwayAnualUsd, fijoAnualUsd: railwayFijoUsd, variableAnualUsd: railwayVariableUsd },
    lineas,
    totales: {
      directoMxn: directo,
      indirectoMxn: indirecto,
      totalMxn: total,
      utilidadBrutaMxn: utilidadBruta,
      margenBrutoPct: pct(utilidadBruta, ingresos),
      margenContribucionMxn: margenContribucion,
      margenContribucionPct: pct(margenContribucion, ingresos),
    },
    unitario: {
      directoPorAlumno: dividir(directo, alumnos),
      indirectoPorAlumno: dividir(indirecto, alumnos),
      totalPorAlumno: dividir(total, alumnos),
      ingresoPorAlumno: dividir(ingresos, alumnos),
      utilidadPorAlumno: dividir(utilidadBruta, alumnos),
    },
    fiscal: {
      regimen: regimenAplicado,
      isr,
      comparativo,
      iva: calcularIVA(ingresos, gastosConIva),
      utilidadNetaMxn: utilidadNeta,
      margenNetoPct: pct(utilidadNeta, ingresos),
    },
    roi: {
      inversionMxn: inversion,
      mesesRecuperacion: utilidadNeta > 0 ? Math.ceil(inversion / (utilidadNeta / 12)) : null,
      roiAnualPct: inversion > 0 ? (utilidadNeta / inversion) * 100 : 0,
    },
  }
}

/** Misma configuración con otro número de alumnos; los maestros crecen en la misma proporción. */
export function conAlumnos(cfg: Config, alumnos: number): Config {
  const ratio = cfg.ventas.alumnos > 0 ? cfg.ventas.maestros / cfg.ventas.alumnos : 0
  return { ...cfg, ventas: { ...cfg.ventas, alumnos, maestros: Math.round(alumnos * ratio) } }
}

export type Criterio = 'bruta' | 'neta' | 'inversion'

/** Mínimo de alumnos que cumple el criterio. null si ni con 500,000 alumnos se logra. */
export function puntoEquilibrio(cfg: Config, criterio: Criterio = 'bruta'): number | null {
  const cumple = (n: number) => {
    const r = calcular(conAlumnos(cfg, n))
    if (criterio === 'bruta') return r.totales.utilidadBrutaMxn >= 0
    if (criterio === 'neta') return r.fiscal.utilidadNetaMxn >= 0
    return r.fiscal.utilidadNetaMxn >= r.roi.inversionMxn
  }
  // búsqueda exponencial y luego binaria; los descuentos por volumen pueden romper la monotonía,
  // por eso se busca el primer punto que cumple de forma creciente
  let alto = 1
  while (!cumple(alto)) {
    alto *= 2
    if (alto > 500_000) return null
  }
  let bajo = Math.floor(alto / 2)
  while (alto - bajo > 1) {
    const medio = Math.floor((bajo + alto) / 2)
    if (cumple(medio)) alto = medio
    else bajo = medio
  }
  return alto
}

export interface Escenario {
  alumnos: number
  maestros: number
  ingresos: number
  ia: number
  railway: number
  otrosDirectos: number
  indirectos: number
  costos: number
  directo: number
  indirecto: number
  utilidadBruta: number
  utilidadNeta: number
  costoPorAlumno: number
  railwayMesUsd: number
}

export const PUNTOS_ESCENARIOS = [25, 50, 100, 200, 300, 500, 750, 1000, 2000, 5000]

export function escenarios(cfg: Config, puntos: number[] = PUNTOS_ESCENARIOS): Escenario[] {
  const lista = [...new Set([...puntos, cfg.ventas.alumnos])].filter((n) => n > 0).sort((a, b) => a - b)
  return lista.map((n) => {
    const r = calcular(conAlumnos(cfg, n))
    const porGrupo = (g: Grupo[]) => sumar(r.lineas.filter((l) => g.includes(l.grupo)))
    return {
      alumnos: n,
      maestros: r.usuarios.maestros,
      ingresos: r.ingresos.totalMxn,
      ia: porGrupo(['IA']),
      railway: porGrupo(['Railway']),
      otrosDirectos: porGrupo(['Pasarela', 'Otros directos']),
      indirectos: sumar(r.lineas.filter((l) => l.tipo === 'indirecto' && l.grupo !== 'Railway')),
      costos: r.totales.totalMxn,
      directo: r.totales.directoMxn,
      indirecto: r.totales.indirectoMxn,
      utilidadBruta: r.totales.utilidadBrutaMxn,
      utilidadNeta: r.fiscal.utilidadNetaMxn,
      costoPorAlumno: r.unitario.totalPorAlumno,
      railwayMesUsd: r.railway.mesActivo.facturaUsd,
    }
  })
}

function sumar(lineas: Linea[]): number {
  return lineas.reduce((a, l) => a + l.anualMxn, 0)
}

function pct(a: number, b: number): number {
  return b !== 0 ? (a / b) * 100 : 0
}

function dividir(a: number, b: number): number {
  return b > 0 ? a / b : 0
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-MX')
}
