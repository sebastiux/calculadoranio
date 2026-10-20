import { MODELO_DEFAULT, type PerfilIA, type TarifaTokens } from './grok'
import type { ConfigRailway } from './railway'
import type { Regimen } from './fiscal'

export type Moneda = 'MXN' | 'USD'

/** Costo directo extra: crece con cada licencia o usuario activo. */
export interface FilaDirecta {
  id: string
  nombre: string
  monto: number
  moneda: Moneda
  base: 'licencia' | 'usuarioMes'
  iva: boolean
}

/** Costo indirecto: gasto de estructura que no depende del número de alumnos. */
export interface FilaIndirecta {
  id: string
  nombre: string
  monto: number
  moneda: Moneda
  periodo: 'mensual' | 'anual'
  /** Se suma la carga social (IMSS, Infonavit, SAR, ISN). */
  nomina: boolean
  iva: boolean
}

export interface FilaInversion {
  id: string
  nombre: string
  monto: number
}

export interface NivelDescuento {
  nombre: string
  min: number
  descuentoPct: number
}

export interface Config {
  tipoCambio: number
  ventas: {
    alumnos: number
    maestros: number
    precioAlumnoAnual: number
    precioMaestroAnual: number
    maestrosIncluidosPor100: number
    mesesLicencia: number
    aplicarDescuento: boolean
  }
  ia: {
    modeloId: string
    personalizado: { short: TarifaTokens; long: TarifaTokens }
    alumno: PerfilIA
    maestro: PerfilIA
  }
  railway: ConfigRailway
  directos: FilaDirecta[]
  indirectos: FilaIndirecta[]
  cargaSocialPct: number
  inversion: FilaInversion[]
  fiscal: {
    regimen: Regimen
    ivaIA: boolean
    ivaRailway: boolean
  }
  margenObjetivoPct: number
}

export const NIVELES_DESCUENTO: NivelDescuento[] = [
  { nombre: 'Individual', min: 1, descuentoPct: 0 },
  { nombre: 'Salón', min: 20, descuentoPct: 15 },
  { nombre: 'Escuela pequeña', min: 50, descuentoPct: 25 },
  { nombre: 'Escuela mediana', min: 100, descuentoPct: 33 },
  { nombre: 'Escuela grande', min: 200, descuentoPct: 40 },
  { nombre: 'Distrito', min: 500, descuentoPct: 47 },
  { nombre: 'Empresarial', min: 1000, descuentoPct: 53 },
]

export const CONFIG_DEFAULT: Config = {
  tipoCambio: 17.5,
  ventas: {
    alumnos: 300,
    maestros: 15,
    precioAlumnoAnual: 1490,
    precioMaestroAnual: 1800,
    maestrosIncluidosPor100: 20,
    mesesLicencia: 10,
    aplicarDescuento: false,
  },
  ia: {
    modeloId: MODELO_DEFAULT,
    personalizado: { short: { input: 1.25, cached: 0.2, output: 2.5 }, long: { input: 2.5, cached: 0.4, output: 5 } },
    alumno: { pctActivos: 80, interaccionesMes: 150, tokensEntrada: 3000, pctCache: 50, tokensSalida: 600, tokensRazonamiento: 400, topeUsd: 2 },
    maestro: { pctActivos: 90, interaccionesMes: 200, tokensEntrada: 5000, pctCache: 50, tokensSalida: 1500, tokensRazonamiento: 400, topeUsd: 2.5 },
  },
  railway: {
    modo: 'aproximado',
    plan: 'pro',
    // ambiente "testing" (niodev): $17.74 de uso a la fecha → $21.36 estimados al mes, repartidos por recurso
    pruebas: { incluir: true, cpuUsd: 0.52, ramUsd: 20.2, egressUsd: 0.06, volumenUsd: 0.45, backupUsd: 0.13 },
    aprox: {
      factorProduccion: 1,
      imagenesFrontend: 3,
      costoReplicaUsd: 4.5,
      usuariosPorReplica: 150,
      ramMbPorSimultaneo: 64,
      vcpuPor100Simultaneos: 1.5,
      egressMbPorSesion: 3,
      volumenMbPorUsuario: 5,
    },
    trafico: { dauPct: 60, diasActivosMes: 22, horasActividadDia: 8, minutosSesion: 25, mesesHistorial: 6 },
    calibracion: { activa: false, usuariosActivos: 100, interaccionesIA: 12000, cpuUsd: 0.52, ramUsd: 20.2, egressUsd: 0.06, volumenUsd: 0.45 },
    servicios: [
      {
        id: 'mysql', nombre: 'MySQL', replicas: 1, cpuBase: 0.006, ramBaseGb: 0.5, cpuMsPorRequest: 2, ramMbPorConcurrente: 0.5,
        requestsPorUsuarioDia: 30, requestsPorInteraccionIA: 3, egressKbPorRequest: 0, volumenBaseGb: 0.4, volumenKbPorUsuario: 20, volumenKbPorInteraccion: 4,
      },
      {
        id: 'redis-cache', nombre: 'RedisGeneralCache', replicas: 1, cpuBase: 0.002, ramBaseGb: 0.08, cpuMsPorRequest: 0.3, ramMbPorConcurrente: 0.2,
        requestsPorUsuarioDia: 20, requestsPorInteraccionIA: 1, egressKbPorRequest: 0, volumenBaseGb: 0.15, volumenKbPorUsuario: 2, volumenKbPorInteraccion: 0,
      },
      {
        id: 'redis-game', nombre: 'RedisNioGame', replicas: 1, cpuBase: 0.002, ramBaseGb: 0.08, cpuMsPorRequest: 0.3, ramMbPorConcurrente: 0.5,
        requestsPorUsuarioDia: 10, requestsPorInteraccionIA: 0, egressKbPorRequest: 0, volumenBaseGb: 0.15, volumenKbPorUsuario: 1, volumenKbPorInteraccion: 0,
      },
      {
        id: 'backendtokens', nombre: 'backendtokens (API + Grok)', replicas: 1, cpuBase: 0.006, ramBaseGb: 0.4, cpuMsPorRequest: 15, ramMbPorConcurrente: 2,
        requestsPorUsuarioDia: 20, requestsPorInteraccionIA: 1, egressKbPorRequest: 6, volumenBaseGb: 0, volumenKbPorUsuario: 0, volumenKbPorInteraccion: 0,
      },
      {
        id: 'frontendtokens', nombre: 'frontendtokens', replicas: 1, cpuBase: 0.005, ramBaseGb: 0.45, cpuMsPorRequest: 3, ramMbPorConcurrente: 1,
        requestsPorUsuarioDia: 5, requestsPorInteraccionIA: 0, egressKbPorRequest: 150, volumenBaseGb: 0, volumenKbPorUsuario: 0, volumenKbPorInteraccion: 0,
      },
      {
        id: 'webapp', nombre: 'niolearningwebapp', replicas: 1, cpuBase: 0.006, ramBaseGb: 0.5, cpuMsPorRequest: 3, ramMbPorConcurrente: 1,
        requestsPorUsuarioDia: 5, requestsPorInteraccionIA: 0, egressKbPorRequest: 300, volumenBaseGb: 0, volumenKbPorUsuario: 0, volumenKbPorInteraccion: 0,
      },
    ],
  },
  directos: [
    { id: 'soporte-usuario', nombre: 'Soporte por licencia (tickets, onboarding)', monto: 0, moneda: 'MXN', base: 'licencia', iva: false },
  ],
  indirectos: [
    { id: 'desarrollo', nombre: 'Desarrollo continuo', monto: 30000, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true },
    { id: 'soporte', nombre: 'Soporte', monto: 10000, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true },
    { id: 'contador', nombre: 'Contabilidad', monto: 2500, moneda: 'MXN', periodo: 'mensual', nomina: false, iva: true },
    { id: 'saas', nombre: 'Herramientas (GitHub, correo, Figma…)', monto: 40, moneda: 'USD', periodo: 'mensual', nomina: false, iva: false },
    { id: 'dominio', nombre: 'Dominio y DNS', monto: 25, moneda: 'USD', periodo: 'anual', nomina: false, iva: false },
    { id: 'stores', nombre: 'Cuentas App Store / Google Play', monto: 124, moneda: 'USD', periodo: 'anual', nomina: false, iva: false },
  ],
  cargaSocialPct: 35,
  inversion: [
    { id: 'mvp', nombre: 'MVP plataforma web', monto: 67000 },
    { id: 'app', nombre: 'Aplicación móvil', monto: 47000 },
    { id: 'legal', nombre: 'Legal (IMPI + constitución)', monto: 15000 },
  ],
  fiscal: { regimen: 'RESICO_PF', ivaIA: false, ivaRailway: false },
  margenObjetivoPct: 35,
}

export function clonar<T>(x: T): T {
  return structuredClone(x)
}

/** Mezcla un objeto guardado con los defaults para tolerar campos nuevos o faltantes. */
export function normalizar(parcial: unknown): Config {
  const base = clonar(CONFIG_DEFAULT)
  if (!parcial || typeof parcial !== 'object') return base
  return mezclar(base, parcial as Record<string, unknown>) as Config
}

function mezclar(base: unknown, extra: unknown): unknown {
  if (Array.isArray(base)) {
    if (!Array.isArray(extra)) return base
    // cada elemento guardado se completa con la forma del primer elemento default
    return base.length > 0 ? extra.map((item) => mezclar(base[0], item)) : extra
  }
  if (base && typeof base === 'object') {
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
    for (const k of Object.keys(out)) out[k] = mezclar(out[k], (extra as Record<string, unknown>)[k])
    return out
  }
  return typeof extra === typeof base ? extra : base
}
