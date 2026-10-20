import type { Config } from '../lib/config'
import type { Resultado } from '../lib/engine'

export type Actualizar = (fn: (borrador: Config) => void) => void

export interface PropsTab {
  cfg: Config
  r: Resultado
  actualizar: Actualizar
}

export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 9)
}
