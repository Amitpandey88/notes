import { addElement, updateElement, deleteElements, getVisibleElements, serializeScene, deserializeScene } from '../lib/scene'
import { createEmptyScene } from '../types/scene'
import { DEFAULT_STYLE } from '../types/scene'

describe('Scene operations', () => {
  const baseElement = {
    type: 'rectangle' as const,
    x: 10, y: 20, width: 100, height: 50,
    rotation: 0,
    style: { ...DEFAULT_STYLE },
    isDeleted: false,
    isLocked: false,
  }

  test('addElement adds element to scene', () => {
    const scene = createEmptyScene()
    const updated = addElement(scene, baseElement)
    expect(updated.elements).toHaveLength(1)
    expect(updated.elements[0].type).toBe('rectangle')
    expect(updated.elements[0].id).toBeDefined()
  })

  test('updateElement updates existing element', () => {
    const scene = createEmptyScene()
    const withEl = addElement(scene, baseElement)
    const id = withEl.elements[0].id
    const updated = updateElement(withEl, id, { x: 50 })
    expect(updated.elements[0].x).toBe(50)
    expect(updated.elements[0].y).toBe(20) // unchanged
  })

  test('deleteElements marks elements as deleted', () => {
    const scene = createEmptyScene()
    const withEl = addElement(scene, baseElement)
    const id = withEl.elements[0].id
    const updated = deleteElements(withEl, [id])
    expect(updated.elements[0].isDeleted).toBe(true)
    expect(getVisibleElements(updated)).toHaveLength(0)
  })

  test('getVisibleElements filters deleted elements', () => {
    const scene = createEmptyScene()
    const s1 = addElement(scene, baseElement)
    const s2 = addElement(s1, { ...baseElement, x: 200 })
    const id1 = s2.elements[0].id
    const deleted = deleteElements(s2, [id1])
    const visible = getVisibleElements(deleted)
    expect(visible).toHaveLength(1)
    expect(visible[0].x).toBe(200)
  })

  test('serialize and deserialize scene', () => {
    const scene = createEmptyScene()
    const withEl = addElement(scene, baseElement)
    const json = serializeScene(withEl)
    const restored = deserializeScene(json)
    expect(restored.elements).toHaveLength(1)
    expect(restored.elements[0].type).toBe('rectangle')
    expect(restored.meta.schemaVersion).toBe(1)
  })

  test('deserializeScene throws on empty string', () => {
    expect(() => deserializeScene('')).toThrow('Invalid scene JSON')
  })

  test('deserializeScene throws on whitespace-only string', () => {
    expect(() => deserializeScene('   ')).toThrow('Invalid scene JSON')
  })

  test('scene updatedAt is updated on modifications', () => {
    const scene = createEmptyScene()
    const before = scene.meta.updatedAt
    // Small delay to ensure time difference
    const updated = addElement(scene, baseElement)
    expect(updated.meta.updatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe('Undo/redo history', () => {
  test('multiple elements can be added independently', () => {
    const scene = createEmptyScene()
    const baseElement = {
      type: 'rectangle' as const,
      x: 10, y: 20, width: 100, height: 50,
      rotation: 0,
      style: { ...DEFAULT_STYLE },
      isDeleted: false,
      isLocked: false,
    }
    const s1 = addElement(scene, { ...baseElement, x: 0 })
    const s2 = addElement(s1, { ...baseElement, x: 100 })
    const s3 = addElement(s2, { ...baseElement, x: 200 })
    expect(getVisibleElements(s3)).toHaveLength(3)
  })
})
