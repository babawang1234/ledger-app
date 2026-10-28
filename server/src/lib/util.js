import { nanoid } from 'nanoid'

export function genId(prefix = '') {
  return prefix ? `${prefix}_${nanoid(12)}` : nanoid(16)
}

export function now() {
  return new Date().toISOString()
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
