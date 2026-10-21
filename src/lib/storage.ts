import { normalizar, type Config } from './config'

const CLAVE = 'calculadoranio:config:v3'

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(codigo: string): string {
  const b64 = codigo.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Prioridad: enlace compartido (#c=...) → localStorage → defaults. */
export function cargarConfig(): Config {
  try {
    const hash = new URLSearchParams(location.hash.slice(1)).get('c')
    if (hash) return normalizar(JSON.parse(deBase64Url(hash)))
  } catch {
    /* enlace corrupto: se ignora */
  }
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return normalizar(JSON.parse(guardado))
  } catch {
    /* almacenamiento bloqueado */
  }
  return normalizar(null)
}

export function guardarConfig(cfg: Config): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cfg))
  } catch {
    /* almacenamiento bloqueado */
  }
}

export function enlaceCompartir(cfg: Config): string {
  const url = new URL(location.href)
  url.hash = `c=${aBase64Url(JSON.stringify(cfg))}`
  return url.toString()
}

export function descargarCSV(nombre: string, filas: Array<Array<string | number>>): void {
  const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}
