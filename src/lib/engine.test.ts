import { describe, expect, it } from 'vitest'
import { CONFIG_DEFAULT, clonar, normalizar } from './config'
import { calcular, conAlumnos, escenarios, puntoEquilibrio } from './engine'
import { costoIAUsuario, MODELOS_GROK } from './grok'
import { calcularMesRailway, factoresCalibracion } from './railway'
import { isrPersonaFisica, isrResico } from './fiscal'

const grok43 = MODELOS_GROK.find((m) => m.id === 'grok-4.3')!

describe('grok', () => {
  it('cobra grok-4.3 con tarifa corta, separando caché y razonamiento', () => {
    const c = costoIAUsuario(grok43, {
      pctActivos: 100, interaccionesMes: 100, tokensEntrada: 10_000, pctCache: 40, tokensSalida: 800, tokensRazonamiento: 200, topeUsd: 0,
    })
    // 6,000 × 1.25 + 4,000 × 0.20 + 1,000 × 2.50 = 10,800 por millón
    expect(c.tarifa).toBe('short')
    expect(c.costoSolicitudUsd).toBeCloseTo(0.0108, 6)
    expect(c.costoMesUsd).toBeCloseTo(1.08, 6)
  })

  it('usa tarifa de contexto largo a partir de 200k tokens y respeta el tope', () => {
    const c = costoIAUsuario(grok43, {
      pctActivos: 100, interaccionesMes: 10, tokensEntrada: 200_000, pctCache: 0, tokensSalida: 0, tokensRazonamiento: 0, topeUsd: 2,
    })
    expect(c.tarifa).toBe('long')
    expect(c.costoSolicitudUsd).toBeCloseTo(0.5, 6)
    expect(c.topeAplicado).toBe(true)
    expect(c.costoMesUsd).toBe(2)
  })
})

describe('railway', () => {
  it('sin usuarios solo cobra los servicios en reposo y respeta la cuota del plan', () => {
    const r = calcularMesRailway(CONFIG_DEFAULT.railway, { usuariosActivos: 0, usuariosRegistrados: 0, interaccionesIA: 0 })
    // 0.036 vCPU × 20 + 0.57 GB × 10 + 0.5 GB × 0.15 = 0.72 + 5.70 + 0.075
    expect(r.usoUsd).toBeCloseTo(6.495, 3)
    expect(r.facturaUsd).toBeCloseTo(6.495, 3)
    const pro = calcularMesRailway({ ...CONFIG_DEFAULT.railway, plan: 'pro' }, { usuariosActivos: 0, usuariosRegistrados: 0, interaccionesIA: 0 })
    expect(pro.facturaUsd).toBe(20)
  })

  it('el costo crece con los usuarios', () => {
    const poco = calcularMesRailway(CONFIG_DEFAULT.railway, { usuariosActivos: 100, usuariosRegistrados: 100, interaccionesIA: 15_000 })
    const mucho = calcularMesRailway(CONFIG_DEFAULT.railway, { usuariosActivos: 10_000, usuariosRegistrados: 10_000, interaccionesIA: 1_500_000 })
    expect(mucho.usoUsd).toBeGreaterThan(poco.usoUsd)
    expect(mucho.egressUsd).toBeGreaterThan(poco.egressUsd * 50)
  })

  it('la calibración reproduce exactamente la factura real medida', () => {
    const cfg = clonar(CONFIG_DEFAULT.railway)
    cfg.calibracion = { activa: true, usuariosActivos: 250, interaccionesIA: 30_000, cpuUsd: 1.5, ramUsd: 9, egressUsd: 0.4, volumenUsd: 0.3 }
    const f = factoresCalibracion(cfg)
    const r = calcularMesRailway(cfg, { usuariosActivos: 250, usuariosRegistrados: 250, interaccionesIA: 30_000 }, f)
    expect(r.cpuUsd).toBeCloseTo(1.5, 6)
    expect(r.ramUsd).toBeCloseTo(9, 6)
    expect(r.egressUsd).toBeCloseTo(0.4, 6)
    expect(r.volumenUsd).toBeCloseTo(0.3, 6)
  })
})

describe('fiscal', () => {
  it('RESICO grava ingresos con tasa anual y se corta en $3.5M', () => {
    expect(isrResico(250_000).isr).toBeCloseTo(2_500)
    expect(isrResico(447_000).isr).toBeCloseTo(4_917)
    expect(isrResico(4_000_000).aplica).toBe(false)
  })

  it('PF aplica tarifa progresiva sobre la utilidad', () => {
    const r = isrPersonaFisica(500_000, 300_000)
    expect(r.base).toBe(200_000)
    expect(r.isr).toBeCloseTo(19_682.13 + (200_000 - 185_852.58) * 0.2136, 2)
  })
})

describe('motor', () => {
  it('cuadra directos + indirectos = total y separa Railway fijo/variable', () => {
    const r = calcular(CONFIG_DEFAULT)
    const suma = r.lineas.reduce((a, l) => a + l.anualMxn, 0)
    expect(r.totales.directoMxn + r.totales.indirectoMxn).toBeCloseTo(suma, 6)
    expect(r.railway.fijoAnualUsd + r.railway.variableAnualUsd).toBeCloseTo(r.railway.anualUsd, 6)
    expect(r.ingresos.totalMxn).toBe(300 * 1490)
    expect(r.usuarios.maestrosIncluidos).toBe(60)
    expect(r.usuarios.maestrosPagados).toBe(0)
  })

  it('el punto de equilibrio es el mínimo de alumnos con utilidad ≥ 0', () => {
    const n = puntoEquilibrio(CONFIG_DEFAULT)!
    expect(n).toBeGreaterThan(1)
    expect(calcular(conAlumnos(CONFIG_DEFAULT, n)).totales.utilidadBrutaMxn).toBeGreaterThanOrEqual(0)
    expect(calcular(conAlumnos(CONFIG_DEFAULT, n - 1)).totales.utilidadBrutaMxn).toBeLessThan(0)
  })

  it('el costo por alumno baja con la escala', () => {
    const e = escenarios(CONFIG_DEFAULT, [50, 5000])
    expect(e[0].costoPorAlumno).toBeGreaterThan(e[e.length - 1].costoPorAlumno)
  })

  it('si los ingresos rebasan el límite de RESICO se calcula como Persona Física', () => {
    const r = calcular(conAlumnos(CONFIG_DEFAULT, 5000))
    expect(r.fiscal.regimen).toBe('PF_AE')
    expect(r.fiscal.isr.isr).toBeGreaterThan(0)
  })

  it('normalizar tolera configuraciones viejas o incompletas', () => {
    const cfg = normalizar({ tipoCambio: 18, ventas: { alumnos: 50 }, railway: { servicios: [{ id: 'x', nombre: 'X' }] } })
    expect(cfg.tipoCambio).toBe(18)
    expect(cfg.ventas.alumnos).toBe(50)
    expect(cfg.ventas.precioAlumnoAnual).toBe(1490)
    expect(cfg.railway.servicios[0].replicas).toBe(1)
    expect(Number.isFinite(calcular(cfg).totales.totalMxn)).toBe(true)
  })
})
