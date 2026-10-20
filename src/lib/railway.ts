// Modelo de costo de Railway basado en recursos medidos (no en un costo fijo por cada 100 usuarios).
// Precios: docs.railway.com/pricing/plans
//   vCPU  $20 / vCPU-mes  ($0.000463 / vCPU-min)
//   RAM   $10 / GB-mes    ($0.000231 / GB-min)
//   Egress $0.05 / GB (la red privada entre servicios es gratis)
//   Volumen $0.15 / GB-mes
// Facturación: cuota del plan + max(0, uso - crédito incluido).

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

const SEGUNDOS_MES = 30 * 24 * 3600
const HORAS_MES = 30 * 24
const KB_POR_GB = 1024 * 1024

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
  plan: PlanRailway
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

export interface MesRailway {
  servicios: ServicioCalculado[]
  concurrentes: number
  usoUsd: number
  cpuUsd: number
  ramUsd: number
  egressUsd: number
  volumenUsd: number
  cuotaUsd: number
  creditoUsd: number
  facturaUsd: number
}

export function calcularMesRailway(cfg: ConfigRailway, demanda: DemandaRailway, factores: Factores = FACTORES_NEUTROS): MesRailway {
  const t = cfg.trafico
  const dau = demanda.usuariosActivos * (t.dauPct / 100)
  const ventanaHoras = Math.max(1, t.horasActividadDia)
  // Ley de Little: usuarios simultáneos = llegadas por minuto × duración de la sesión
  const concurrentes = demanda.usuariosActivos > 0 ? (dau * t.minutosSesion) / (ventanaHoras * 60) : 0
  const fraccionActiva = Math.min(1, (t.diasActivosMes * ventanaHoras) / HORAS_MES)
  const interaccionesHistorial = demanda.interaccionesIA * Math.max(1, t.mesesHistorial)

  const servicios = cfg.servicios.map((s): ServicioCalculado => {
    const requestsMes = dau * t.diasActivosMes * s.requestsPorUsuarioDia + demanda.interaccionesIA * s.requestsPorInteraccionIA
    const vcpu = (s.replicas * s.cpuBase + (requestsMes * s.cpuMsPorRequest) / 1000 / SEGUNDOS_MES) * factores.cpu
    const ramGb = (s.replicas * s.ramBaseGb + ((s.ramMbPorConcurrente / 1024) * concurrentes * fraccionActiva)) * factores.ram
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
    return {
      id: s.id,
      nombre: s.nombre,
      requestsMes,
      vcpu,
      ramGb,
      egressGb,
      volumenGb,
      cpuUsd,
      ramUsd,
      egressUsd,
      volumenUsd,
      totalUsd: cpuUsd + ramUsd + egressUsd + volumenUsd,
    }
  })

  const suma = (k: 'cpuUsd' | 'ramUsd' | 'egressUsd' | 'volumenUsd') => servicios.reduce((a, s) => a + s[k], 0)
  const cpuUsd = suma('cpuUsd')
  const ramUsd = suma('ramUsd')
  const egressUsd = suma('egressUsd')
  const volumenUsd = suma('volumenUsd')
  const usoUsd = cpuUsd + ramUsd + egressUsd + volumenUsd
  const plan = PLANES_RAILWAY[cfg.plan]

  return {
    servicios,
    concurrentes,
    usoUsd,
    cpuUsd,
    ramUsd,
    egressUsd,
    volumenUsd,
    cuotaUsd: plan.cuota,
    creditoUsd: plan.credito,
    facturaUsd: plan.cuota + Math.max(0, usoUsd - plan.credito),
  }
}

/**
 * Compara la factura real con lo que predice el modelo para la misma demanda
 * y devuelve un multiplicador por recurso. Así el modelo queda anclado a tu consumo real.
 */
export function factoresCalibracion(cfg: ConfigRailway): Factores {
  const c = cfg.calibracion
  if (!c.activa) return FACTORES_NEUTROS
  const modelo = calcularMesRailway(cfg, {
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
