import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface WindowPosition {
  x: number
  y: number
}

function windowStatePath(): string {
  return join(app.getPath('userData'), 'windowState.json')
}

export function loadWindowPosition(): WindowPosition | null {
  const path = windowStatePath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as WindowPosition
  } catch {
    return null
  }
}

export function saveWindowPosition(position: WindowPosition): void {
  writeFileSync(windowStatePath(), JSON.stringify(position, null, 2))
}
