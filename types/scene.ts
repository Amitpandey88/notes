export type ElementType =
  | 'freedraw'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'image'

export type ToolType = ElementType | 'select' | 'hand' | 'eraser'

export interface ElementStyle {
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  fontSize?: number
  fontFamily?: string
  roughness?: number
  arrowhead?: 'none' | 'arrow' | 'dot'
}

export interface SceneElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  points?: [number, number][]
  rotation: number
  style: ElementStyle
  text?: string
  imageRef?: string
  isDeleted: boolean
  isLocked: boolean
  groupId?: string
  updatedAt: number
}

export interface AppState {
  backgroundColor: string
  gridSize: number | null
  zoom: number
  scrollX: number
  scrollY: number
  selectedTool: ToolType
  selectedElementIds: string[]
  showGrid: boolean
}

export interface SceneAsset {
  id: string
  mimeType: string
  dataUrl: string
  createdAt: number
}

export interface Scene {
  meta: {
    schemaVersion: number
    createdAt: number
    updatedAt: number
  }
  appState: AppState
  elements: SceneElement[]
  assets: Record<string, SceneAsset>
}

export const DEFAULT_APP_STATE: AppState = {
  backgroundColor: '#ffffff',
  gridSize: 20,
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
  selectedTool: 'select',
  selectedElementIds: [],
  showGrid: false,
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: '#1a1a2e',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  fontSize: 16,
  fontFamily: 'Caveat, cursive',
  roughness: 1,
  arrowhead: 'arrow',
}

export function createEmptyScene(): Scene {
  return {
    meta: {
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    appState: { ...DEFAULT_APP_STATE },
    elements: [],
    assets: {},
  }
}
