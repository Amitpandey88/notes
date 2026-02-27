import { Scene, SceneElement, AppState } from '@/types/scene'

function generateId(): string {
  return crypto.randomUUID()
}

export function addElement(scene: Scene, element: Omit<SceneElement, 'id' | 'updatedAt'>): Scene {
  const newElement: SceneElement = {
    ...element,
    id: generateId(),
    updatedAt: Date.now(),
  }
  return {
    ...scene,
    meta: { ...scene.meta, updatedAt: Date.now() },
    elements: [...scene.elements, newElement],
  }
}

export function updateElement(scene: Scene, id: string, updates: Partial<SceneElement>): Scene {
  return {
    ...scene,
    meta: { ...scene.meta, updatedAt: Date.now() },
    elements: scene.elements.map((el) =>
      el.id === id ? { ...el, ...updates, updatedAt: Date.now() } : el
    ),
  }
}

export function deleteElements(scene: Scene, ids: string[]): Scene {
  const idSet = new Set(ids)
  return {
    ...scene,
    meta: { ...scene.meta, updatedAt: Date.now() },
    elements: scene.elements.map((el) =>
      idSet.has(el.id) ? { ...el, isDeleted: true, updatedAt: Date.now() } : el
    ),
  }
}

export function updateAppState(scene: Scene, updates: Partial<AppState>): Scene {
  return {
    ...scene,
    appState: { ...scene.appState, ...updates },
  }
}

export function getVisibleElements(scene: Scene): SceneElement[] {
  return scene.elements.filter((el) => !el.isDeleted)
}

export function serializeScene(scene: Scene): string {
  return JSON.stringify(scene)
}

export function deserializeScene(json: string): Scene {
  if (!json || typeof json !== 'string' || !json.trim()) {
    throw new Error('Invalid scene JSON: input is empty or not a string')
  }
  const parsed = JSON.parse(json) as Scene
  // Basic migration: ensure schemaVersion
  if (!parsed.meta) {
    parsed.meta = { schemaVersion: 1, createdAt: Date.now(), updatedAt: Date.now() }
  }
  return parsed
}
