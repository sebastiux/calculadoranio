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
  const vacio = { usuariosActivos: 0, usuariosRegistrados: 0, interaccionesIA: 0 }

  it('sin alumnos cobra pruebas + producción en reposo con la factura real como base', () => {
    const r = calcularMesRailway(CONFIG_DEFAULT.railway, vacio)
    expect(r.pruebasUsd).toBeCloseTo(21.36, 2)
    expect(r.produccionUsd).toBeCloseTo(21.36, 2)
    expect(r.facturaUsd).toBeCloseTo(42.72, 2)
    const sinPruebas = calcularMesRailway({ ...CONFIG_DEFAULT.railway, pruebas: { ...CONFIG_DEFAULT.railway.pruebas, incluir: false } }, vacio)
    expect(sinPruebas.facturaUsd).toBeCloseTo(21.36, 2)
  })

  it('la función aproximada crece por usuario y agrega réplicas escalonadas del frontend', () => {
    const cfg = CONFIG_DEFAULT.railway
    const base = calcularMesRailway(cfg, vacio).usoUsd
    const mil = calcularMesRailway(cfg, { usuariosActivos: 1000, usuariosRegistrados: 1000, interaccionesIA: 0 })
    // 600 diarios × 25 min ÷ 480 min = 31.25 simultáneos; 600 × 22 = 13,200 sesiones; clases 22 × 8 h de 720 h
    const sim = 31.25
    const esperado =
      ((sim * 64) / 1024) * 10 + (sim / 100) * 1.5 * ((22 * 8) / 720) * 20 + ((13_200 * 3) / 1024) * 0.05 + ((1000 * 5) / 1024) * 0.15
    expect(mil.usoUsd - base).toBeCloseTo(esperado, 6)
    expect(mil.replicasPorImagen).toBe(1)

    // 20,000 activos → 625 simultáneos → 5 réplicas por imagen → 4 × 3 × $4.5 extra
    const muchos = calcularMesRailway(cfg, { usuariosActivos: 20_000, usuariosRegistrados: 20_000, interaccionesIA: 0 })
    expect(muchos.concurrentes).toBeCloseTo(625, 6)
    expect(muchos.replicasPorImagen).toBe(5)
  })

  it('modo detallado conserva la especificación por servicio y crece con los usuarios', () => {
    const cfg = { ...CONFIG_DEFAULT.railway, modo: 'detallado' as const }
    const poco = calcularMesRailway(cfg, { usuariosActivos: 100, usuariosRegistrados: 100, interaccionesIA: 15_000 })
    const mucho = calcularMesRailway(cfg, { usuariosActivos: 10_000, usuariosRegistrados: 10_000, interaccionesIA: 1_500_000 })
    expect(poco.servicios).toHaveLength(cfg.servicios.length)
    expect(mucho.usoUsd).toBeGreaterThan(poco.usoUsd)
    expect(mucho.egressUsd).toBeGreaterThan(poco.egressUsd * 50)
  })

  it('la calibración (modo detallado) reproduce exactamente la factura medida', () => {
    const cfg = clonar(CONFIG_DEFAULT.railway)
    cfg.modo = 'detallado'
    cfg.pruebas.incluir = false
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
    expect(r.ingresos.totalMxn).toBe(130 * 1490)
    expect(r.usuarios.maestrosIncluidos).toBe(26)
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

  it('el perfil por defecto reproduce el consumo real de xAI (5 de junio × 5, 130 alumnos)', () => {
    const r = calcular(CONFIG_DEFAULT)
    // real: $1.825318 × 5 × 30 días ÷ 130 alumnos = $2.106 por alumno al mes
    expect(r.ia.alumno.costoMesUsd).toBeCloseTo((1.825318 * 5 * 30) / 130, 2)
    expect(r.ia.maestro.costoMesUsd).toBe(0)
    expect(r.ia.anualUsd).toBeCloseTo(1.825318 * 5 * 300, -1)
  })

  it('no incluye pasarela de pagos y el costo unitario cuadra con el total', () => {
    const r = calcular(CONFIG_DEFAULT)
    expect(r.lineas.some((l) => /pasarela/i.test(l.concepto))).toBe(false)
    expect(r.unitario.totalPorAlumno * r.usuarios.alumnos).toBeCloseTo(r.totales.totalMxn, 4)
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
