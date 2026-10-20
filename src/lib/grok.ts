// Precios xAI (USD por 1M de tokens). Fuente: docs.x.ai, tabla de precios de la API.
// Cuando el prompt de una solicitud supera LONG_CONTEXT_THRESHOLD tokens se cobra la tarifa "long".

export const LONG_CONTEXT_THRESHOLD = 200_000

export interface TarifaTokens {
  input: number
  cached: number
  output: number
}

export interface ModeloGrok {
  id: string
  contexto: number
  short: TarifaTokens
  long: TarifaTokens
}

export const MODELOS_GROK: ModeloGrok[] = [
  { id: 'grok-4.3', contexto: 1_000_000, short: { input: 1.25, cached: 0.2, output: 2.5 }, long: { input: 2.5, cached: 0.4, output: 5 } },
  { id: 'grok-4.7', contexto: 500_000, short: { input: 2, cached: 0.5, output: 6 }, long: { input: 4, cached: 1, output: 12 } },
  { id: 'grok-4.6', contexto: 500_000, short: { input: 2, cached: 0.5, output: 6 }, long: { input: 4, cached: 1, output: 12 } },
  { id: 'grok-4.5', contexto: 500_000, short: { input: 2, cached: 0.3, output: 6 }, long: { input: 4, cached: 0.6, output: 12 } },
  { id: 'grok-build-0.1', contexto: 256_000, short: { input: 1, cached: 0.2, output: 2 }, long: { input: 2, cached: 0.4, output: 4 } },
  { id: 'grok-4.20-multi-agent-0309', contexto: 1_000_000, short: { input: 1.25, cached: 0.2, output: 2.5 }, long: { input: 2.5, cached: 0.4, output: 5 } },
  { id: 'grok-4.20-0309-reasoning', contexto: 1_000_000, short: { input: 1.25, cached: 0.2, output: 2.5 }, long: { input: 2.5, cached: 0.4, output: 5 } },
  { id: 'grok-4.20-0309-non-reasoning', contexto: 1_000_000, short: { input: 1.25, cached: 0.2, output: 2.5 }, long: { input: 2.5, cached: 0.4, output: 5 } },
]

export const MODELO_DEFAULT = 'grok-4.3'

/** Perfil de consumo de IA de un tipo de usuario (alumno o maestro). */
export interface PerfilIA {
  /** % de licencias que realmente usan la IA en un mes activo. */
  pctActivos: number
  /** Solicitudes a la API por usuario activo al mes. */
  interaccionesMes: number
  /** Tokens de entrada promedio por solicitud (system prompt + historial + mensaje). */
  tokensEntrada: number
  /** % de los tokens de entrada que se sirven desde caché. */
  pctCache: number
  /** Tokens de respuesta visibles por solicitud. */
  tokensSalida: number
  /** Tokens de razonamiento por solicitud (se cobran como salida). */
  tokensRazonamiento: number
  /** Tope de crédito por usuario al mes en USD (0 = sin tope). */
  topeUsd: number
}

export interface CostoIAUsuario {
  tarifa: 'short' | 'long'
  costoSolicitudUsd: number
  costoSinTopeUsd: number
  costoMesUsd: number
  topeAplicado: boolean
  tokensMes: number
}

export function costoIAUsuario(modelo: ModeloGrok, perfil: PerfilIA): CostoIAUsuario {
  const tarifa = perfil.tokensEntrada >= LONG_CONTEXT_THRESHOLD ? 'long' : 'short'
  const p = modelo[tarifa]
  const cache = clamp01(perfil.pctCache / 100)
  const entradaCache = perfil.tokensEntrada * cache
  const entradaNueva = perfil.tokensEntrada - entradaCache
  const salida = perfil.tokensSalida + perfil.tokensRazonamiento

  const costoSolicitudUsd = (entradaNueva * p.input + entradaCache * p.cached + salida * p.output) / 1_000_000
  const costoSinTopeUsd = costoSolicitudUsd * perfil.interaccionesMes
  const topeAplicado = perfil.topeUsd > 0 && costoSinTopeUsd > perfil.topeUsd
  return {
    tarifa,
    costoSolicitudUsd,
    costoSinTopeUsd,
    costoMesUsd: topeAplicado ? perfil.topeUsd : costoSinTopeUsd,
    topeAplicado,
    tokensMes: (perfil.tokensEntrada + salida) * perfil.interaccionesMes,
  }
}

/** Solicitudes que realmente se ejecutan al mes (si el tope corta el uso, también baja el tráfico). */
export function interaccionesEfectivas(perfil: PerfilIA, costo: CostoIAUsuario): number {
  if (!costo.topeAplicado || costo.costoSolicitudUsd <= 0) return perfil.interaccionesMes
  return Math.floor(perfil.topeUsd / costo.costoSolicitudUsd)
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}
