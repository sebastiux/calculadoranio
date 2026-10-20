// Cálculo fiscal mexicano en base ANUAL (tarifas vigentes 2024-2025; verifica cambios con el SAT o tu contador).

export const IVA_TASA = 0.16

export type Regimen = 'RESICO_PF' | 'PF_AE' | 'PM'

export const REGIMENES: Record<Regimen, string> = {
  RESICO_PF: 'RESICO Persona Física',
  PF_AE: 'Persona Física con Actividad Empresarial',
  PM: 'Persona Moral (Régimen General)',
}

/** RESICO PF: tasa sobre ingresos cobrados (sin deducciones). Límite: $3,500,000 al año. */
const RESICO_ANUAL: Array<[number, number]> = [
  [300_000, 0.01],
  [600_000, 0.011],
  [1_000_000, 0.015],
  [2_500_000, 0.02],
  [3_500_000, 0.025],
]
export const RESICO_LIMITE_ANUAL = 3_500_000

/** Tarifa anual art. 152 LISR: [límite inferior, cuota fija, tasa sobre excedente]. */
const PF_ANUAL: Array<[number, number, number]> = [
  [0.01, 0, 0.0192],
  [8_952.5, 171.88, 0.064],
  [75_984.56, 4_461.94, 0.1088],
  [133_536.08, 10_723.55, 0.16],
  [155_229.81, 14_194.54, 0.1792],
  [185_852.58, 19_682.13, 0.2136],
  [374_837.89, 60_049.4, 0.2352],
  [590_796.0, 110_842.74, 0.3],
  [1_127_926.85, 271_981.99, 0.32],
  [1_503_902.47, 392_294.17, 0.34],
  [4_511_707.38, 1_414_947.85, 0.35],
]

export const TASA_PM = 0.3

export interface ResultadoISR {
  regimen: Regimen
  base: number
  isr: number
  tasaEfectiva: number
  aplica: boolean
  nota?: string
}

export function isrResico(ingresos: number): ResultadoISR {
  const base = Math.max(0, ingresos)
  if (base > RESICO_LIMITE_ANUAL) {
    return { regimen: 'RESICO_PF', base, isr: 0, tasaEfectiva: 0, aplica: false, nota: 'Ingresos mayores a $3.5M anuales: no puedes tributar en RESICO.' }
  }
  const tasa = RESICO_ANUAL.find(([limite]) => base <= limite)?.[1] ?? 0.025
  const isr = base * tasa
  return { regimen: 'RESICO_PF', base, isr, tasaEfectiva: base > 0 ? isr / base : 0, aplica: true, nota: 'Se paga sobre ingresos cobrados, sin deducir gastos.' }
}

export function isrPersonaFisica(ingresos: number, deducciones: number): ResultadoISR {
  const base = Math.max(0, ingresos - deducciones)
  let tramo = PF_ANUAL[0]
  for (const t of PF_ANUAL) if (base >= t[0]) tramo = t
  const isr = base > 0 ? tramo[1] + (base - tramo[0]) * tramo[2] : 0
  return { regimen: 'PF_AE', base, isr, tasaEfectiva: ingresos > 0 ? isr / ingresos : 0, aplica: true, nota: 'Tarifa progresiva sobre utilidad (ingresos − deducciones).' }
}

export function isrPersonaMoral(ingresos: number, deducciones: number): ResultadoISR {
  const base = Math.max(0, ingresos - deducciones)
  const isr = base * TASA_PM
  return { regimen: 'PM', base, isr, tasaEfectiva: ingresos > 0 ? isr / ingresos : 0, aplica: true, nota: '30% sobre utilidad fiscal. No incluye PTU (10%) si tienes empleados.' }
}

export function calcularISR(regimen: Regimen, ingresos: number, deducciones: number): ResultadoISR {
  if (regimen === 'RESICO_PF') return isrResico(ingresos)
  if (regimen === 'PF_AE') return isrPersonaFisica(ingresos, deducciones)
  return isrPersonaMoral(ingresos, deducciones)
}

export interface ResultadoIVA {
  trasladado: number
  acreditable: number
  aPagar: number
  aFavor: number
}

export function calcularIVA(ingresos: number, gastosConIva: number): ResultadoIVA {
  const trasladado = ingresos * IVA_TASA
  const acreditable = gastosConIva * IVA_TASA
  return {
    trasladado,
    acreditable,
    aPagar: Math.max(0, trasladado - acreditable),
    aFavor: Math.max(0, acreditable - trasladado),
  }
}
