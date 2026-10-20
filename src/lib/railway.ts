// Costo de Railway. Dos modos:
//  - aproximado: parte de tu factura real (ambiente de pruebas) y la escala con usuarios y réplicas.
//  - detallado: especificación por servicio (CPU por request, RAM por usuario simultáneo, egress, volumen).
// En ambos se suma el ambiente de pruebas, que sigue corriendo aunque no haya alumnos.
// Precios: docs.railway.com/pricing/plans
//   vCPU  $20 / vCPU-mes  ($0.000463 / vCPU-min)
//   RAM   $10 / GB-mes    ($0.000231 / GB-min)
//   Egress $0.05 / GB (la red privada entre servicios es gratis)
//   Volumen $0.15 / GB-mes
// Facturación del workspace: cuota del plan + max(0, uso - crédito incluido).

export const PRECIOS_RAILWAY = {
  vcpuMes: 20,
  ramGbMes: 10,
  egressGb: 0.05,
  volumenGbMes: 0.15,
}

export const PLANES_RAILWAY = {
  hobby: { nombre: 'Hobby', cuota: 5, credito: 5 },
  pro: { nombre: 'Pro', cuota: 20, credito: 20 },
} as const

export type PlanRailway = keyof typeof PLANES_RAILWAY
export type ModoRailway = 'aproximado' | 'detallado'

const SEGUNDOS_MES = 30 * 24 * 3600
const HORAS_MES = 30 * 24
const KB_POR_GB = 1024 * 1024
const MB_POR_GB = 1024

export interface ServicioRailway {
  id: string
  nombre: string
  replicas: number
  /** vCPU promedio por réplica sin tráfico (procesos en reposo, health checks, crons). */
  cpuBase: number
  /** GB de RAM por réplica sin tráfico. */
  ramBaseGb: number
  /** Milisegundos de CPU que consume cada request. */
  cpuMsPorRequest: number
  /** MB adicionales de RAM por usuario conectado al mismo tiempo. */
  ramMbPorConcurrente: number
  /** Requests que recibe el servicio por usuario activo al día (fuera de la IA). */
  requestsPorUsuarioDia: number
  /** Requests que recibe el servicio por cada interacción con la IA. */
  requestsPorInteraccionIA: number
  /** KB que salen a internet por request (0 si solo habla por red privada). */
  egressKbPorRequest: number
  /** GB de volumen fijos (motor, índices, binarios). */
  volumenBaseGb: number
  /** KB guardados por usuario registrado. */
  volumenKbPorUsuario: number
  /** KB guardados por interacción de IA (historial de chat). */
  volumenKbPorInteraccion: number
}

export interface TraficoRailway {
  /** % de usuarios activos del mes que entran en un día de clases. */
  dauPct: number
  /** Días con tráfico en un mes activo (días hábiles escolares). */
  diasActivosMes: number
  /** Horas del día en que se concentra el tráfico. */
  horasActividadDia: number
  /** Minutos promedio de sesión por usuario diario. */
  minutosSesion: number
  /** Meses de historial de chat que se conservan en la base de datos. */
  mesesHistorial: number
}

/** Factura mensual real del ambiente de pruebas por recurso (USD), del panel "Project usage". */
export interface ConsumoMedido {
  cpuUsd: number
  ramUsd: number
  egressUsd: number
  volumenUsd: number
  backupUsd: number
}

export interface AmbientePruebas extends ConsumoMedido {
  /** El ambiente de pruebas sigue corriendo en paralelo a producción. */
  incluir: boolean
}

export interface ConfigAproximada {
  /** Producción en reposo = consumo de pruebas × este factor. */
  factorProduccion: number
  /** Imágenes (servicios) de frontend que se replican cuando sube la concurrencia. */
  imagenesFrontend: number
  /** USD al mes de cada réplica extra de una imagen de frontend. */
  costoReplicaUsd: number
  /** Usuarios simultáneos que aguanta una réplica de cada imagen. */
  usuariosPorReplica: number
  /** MB de RAM por usuario simultáneo; Node y Redis retienen el pico todo el mes. */
  ramMbPorSimultaneo: number
  /** vCPU que consumen 100 usuarios simultáneos mientras están conectados. */
  vcpuPor100Simultaneos: number
  /** MB que descarga cada sesión diaria (assets, API, sockets). */
  egressMbPorSesion: number
  /** MB guardados por usuario registrado (MySQL + Redis + backups). */
  volumenMbPorUsuario: number
}

export interface CalibracionRailway {
  activa: boolean
  /** Usuarios activos en el mes medido. */
  usuariosActivos: number
  /** Interacciones de IA reales en el mes medido. */
  interaccionesIA: number
  /** Costos reales del panel "Usage" de Railway (USD) en ese mes. */
  cpuUsd: number
  ramUsd: number
  egressUsd: number
  volumenUsd: number
}

export interface ConfigRailway {
  modo: ModoRailway
  plan: PlanRailway
  pruebas: AmbientePruebas
  aprox: ConfigAproximada
  servicios: ServicioRailway[]
  trafico: TraficoRailway
  calibracion: CalibracionRailway
}

export interface DemandaRailway {
  usuariosActivos: number
  usuariosRegistrados: number
  interaccionesIA: number
}

export interface Factores {
  cpu: number
  ram: number
  egress: number
  volumen: number
}

export const FACTORES_NEUTROS: Factores = { cpu: 1, ram: 1, egress: 1, volumen: 1 }

export interface ServicioCalculado {
  id: string
  nombre: string
  requestsMes: number
  vcpu: number
  ramGb: number
  egressGb: number
  volumenGb: number
  cpuUsd: number
  ramUsd: number
  egressUsd: number
  volumenUsd: number
  totalUsd: number
}

export interface Recursos {
  cpuUsd: number
  ramUsd: number
  egressUsd: number
  volumenUsd: number
  backupUsd: number
}

export interface MesRailway extends Recursos {
  modo: ModoRailway
  /** Solo en modo detallado. */
  servicios: ServicioCalculado[]
  concurrentes: number
  /** Réplicas por imagen de frontend (modo aproximado). */
  replicasPorImagen: number
  pruebasUsd: number
  produccionUsd: number
  usoUsd: number
  cuotaUsd: number
  creditoUsd: number
  facturaUsd: number
}

export function totalMedido(c: ConsumoMedido): number {
  return c.cpuUsd + c.ramUsd + c.egressUsd + c.volumenUsd + c.backupUsd
}

/** Usuarios simultáneos en la ventana de actividad (ley de Little). */
export function concurrentes(t: TraficoRailway, usuariosActivos: number): number {
  const dau = usuariosActivos * (t.dauPct / 100)
  return usuariosActivos > 0 ? (dau * t.minutosSesion) / (Math.max(1, t.horasActividadDia) * 60) : 0
}

/** Función aproximada de producción: base medida + usuarios + réplicas escalonadas. */
export function produccionAproximada(cfg: ConfigRailway, demanda: DemandaRailway): Recursos & { replicasPorImagen: number; concurrentes: number } {
  const a = cfg.aprox
  const p = cfg.pruebas
  const f = Math.max(0, a.factorProduccion)
  const sim = concurrentes(cfg.trafico, demanda.usuariosActivos)
  const replicasPorImagen = Math.max(1, Math.ceil(sim / Math.max(1, a.usuariosPorReplica)))
  const replicasExtraUsd = (replicasPorImagen - 1) * Math.max(0, a.imagenesFrontend) * a.costoReplicaUsd
  const t = cfg.trafico
  const fraccionActiva = Math.min(1, (t.diasActivosMes * Math.max(1, t.horasActividadDia)) / HORAS_MES)
  const sesionesMes = demanda.usuariosActivos * (t.dauPct / 100) * t.diasActivosMes

  return {
    concurrentes: sim,
    replicasPorImagen,
    // el CPU solo se cobra mientras hay gente conectada
    cpuUsd: p.cpuUsd * f + (sim / 100) * a.vcpuPor100Simultaneos * fraccionActiva * PRECIOS_RAILWAY.vcpuMes,
    // las réplicas extra se cobran casi todo en RAM (cada proceso Node carga su propio heap)
    ramUsd: p.ramUsd * f + ((sim * a.ramMbPorSimultaneo) / MB_POR_GB) * PRECIOS_RAILWAY.ramGbMes + replicasExtraUsd,
    egressUsd: p.egressUsd * f + ((sesionesMes * a.egressMbPorSesion) / MB_POR_GB) * PRECIOS_RAILWAY.egressGb,
    volumenUsd: p.volumenUsd * f + (demanda.usuariosRegistrados * a.volumenMbPorUsuario / MB_POR_GB) * PRECIOS_RAILWAY.volumenGbMes,
    backupUsd: p.backupUsd * f,
  }
}

/** Especificación por servicio (modo detallado). */
export function produccionDetallada(cfg: ConfigRailway, demanda: DemandaRailway, factores: Factores = FACTORES_NEUTROS) {
  const t = cfg.trafico
  const dau = demanda.usuariosActivos * (t.dauPct / 100)
  const sim = concurrentes(t, demanda.usuariosActivos)
  const fraccionActiva = Math.min(1, (t.diasActivosMes * Math.max(1, t.horasActividadDia)) / HORAS_MES)
  const interaccionesHistorial = demanda.interaccionesIA * Math.max(1, t.mesesHistorial)

  const servicios = cfg.servicios.map((s): ServicioCalculado => {
    const requestsMes = dau * t.diasActivosMes * s.requestsPorUsuarioDia + demanda.interaccionesIA * s.requestsPorInteraccionIA
    const vcpu = (s.replicas * s.cpuBase + (requestsMes * s.cpuMsPorRequest) / 1000 / SEGUNDOS_MES) * factores.cpu
    const ramGb = (s.replicas * s.ramBaseGb + (s.ramMbPorConcurrente / 1024) * sim * fraccionActiva) * factores.ram
    const egressGb = ((requestsMes * s.egressKbPorRequest) / KB_POR_GB) * factores.egress
    const volumenGb =
      (s.volumenBaseGb +
        (demanda.usuariosRegistrados * s.volumenKbPorUsuario) / KB_POR_GB +
        (interaccionesHistorial * s.volumenKbPorInteraccion) / KB_POR_GB) *
      factores.volumen

    const cpuUsd = vcpu * PRECIOS_RAILWAY.vcpuMes
    const ramUsd = ramGb * PRECIOS_RAILWAY.ramGbMes
    const egressUsd = egressGb * PRECIOS_RAILWAY.egressGb
    const volumenUsd = volumenGb * PRECIOS_RAILWAY.volumenGbMes
    return { id: s.id, nombre: s.nombre, requestsMes, vcpu, ramGb, egressGb, volumenGb, cpuUsd, ramUsd, egressUsd, volumenUsd, totalUsd: cpuUsd + ramUsd + egressUsd + volumenUsd }
  })

  const suma = (k: 'cpuUsd' | 'ramUsd' | 'egressUsd' | 'volumenUsd') => servicios.reduce((acc, s) => acc + s[k], 0)
  return { servicios, concurrentes: sim, cpuUsd: suma('cpuUsd'), ramUsd: suma('ramUsd'), egressUsd: suma('egressUsd'), volumenUsd: suma('volumenUsd'), backupUsd: 0 }
}

export function calcularMesRailway(cfg: ConfigRailway, demanda: DemandaRailway, factores: Factores = FACTORES_NEUTROS): MesRailway {
  const p = cfg.pruebas
  const pruebas: Recursos = p.incluir
    ? { cpuUsd: p.cpuUsd, ramUsd: p.ramUsd, egressUsd: p.egressUsd, volumenUsd: p.volumenUsd, backupUsd: p.backupUsd }
    : { cpuUsd: 0, ramUsd: 0, egressUsd: 0, volumenUsd: 0, backupUsd: 0 }

  let prod: Recursos
  let servicios: ServicioCalculado[] = []
  let sim: number
  let replicasPorImagen = 1
  if (cfg.modo === 'aproximado') {
    const a = produccionAproximada(cfg, demanda)
    prod = a
    sim = a.concurrentes
    replicasPorImagen = a.replicasPorImagen
  } else {
    const d = produccionDetallada(cfg, demanda, factores)
    prod = d
    servicios = d.servicios
    sim = d.concurrentes
  }

  const r = (k: keyof Recursos) => pruebas[k] + prod[k]
  const pruebasUsd = sumaRecursos(pruebas)
  const produccionUsd = sumaRecursos(prod)
  const usoUsd = pruebasUsd + produccionUsd
  const plan = PLANES_RAILWAY[cfg.plan]

  return {
    modo: cfg.modo,
    servicios,
    concurrentes: sim,
    replicasPorImagen,
    cpuUsd: r('cpuUsd'),
    ramUsd: r('ramUsd'),
    egressUsd: r('egressUsd'),
    volumenUsd: r('volumenUsd'),
    backupUsd: r('backupUsd'),
    pruebasUsd,
    produccionUsd,
    usoUsd,
    cuotaUsd: plan.cuota,
    creditoUsd: plan.credito,
    facturaUsd: plan.cuota + Math.max(0, usoUsd - plan.credito),
  }
}

function sumaRecursos(r: Recursos): number {
  return r.cpuUsd + r.ramUsd + r.egressUsd + r.volumenUsd + r.backupUsd
}

/**
 * Modo detallado: compara la factura real con lo que predice la especificación para la misma demanda
 * y devuelve un multiplicador por recurso. Así el modelo queda anclado a tu consumo real.
 */
export function factoresCalibracion(cfg: ConfigRailway): Factores {
  const c = cfg.calibracion
  if (!c.activa || cfg.modo !== 'detallado') return FACTORES_NEUTROS
  const modelo = produccionDetallada(cfg, {
    usuariosActivos: c.usuariosActivos,
    usuariosRegistrados: c.usuariosActivos,
    interaccionesIA: c.interaccionesIA,
  })
  const ratio = (real: number, estimado: number) => (real > 0 && estimado > 0 ? real / estimado : 1)
  return {
    cpu: ratio(c.cpuUsd, modelo.cpuUsd),
    ram: ratio(c.ramUsd, modelo.ramUsd),
    egress: ratio(c.egressUsd, modelo.egressUsd),
    volumen: ratio(c.volumenUsd, modelo.volumenUsd),
  }
}
