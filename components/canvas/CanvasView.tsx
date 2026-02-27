'use client'

import { useEffect, useRef, useState, useCallback, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Scene, SceneElement, ToolType, DEFAULT_STYLE, createEmptyScene, AppState } from '@/types/scene'
import { addElement, updateElement, deleteElements, getVisibleElements, serializeScene, deserializeScene, updateAppState } from '@/lib/scene'
import { Toolbar } from './Toolbar'
import { StylePanel } from './StylePanel'

interface Props {
  boardId: string
  initialSceneJson?: string
  readOnly?: boolean
  title?: string
}

// Undo/redo history
// Implements a time-travel pattern: past scenes stack, present scene, future (redo) stack.
// Each direction is capped at MAX_HISTORY entries to bound memory usage.
interface HistoryState {
  past: Scene[]
  present: Scene
  future: Scene[]
}

type HistoryAction =
  | { type: 'SET'; scene: Scene }
  | { type: 'UNDO' }
  | { type: 'REDO' }

const MAX_HISTORY = 50

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET':
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: action.scene,
        future: [],
      }
    case 'UNDO':
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future.slice(0, MAX_HISTORY - 1)],
      }
    case 'REDO':
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      }
    default:
      return state
  }
}

function screenToCanvas(x: number, y: number, appState: AppState): [number, number] {
  return [
    (x - appState.scrollX) / appState.zoom,
    (y - appState.scrollY) / appState.zoom,
  ]
}

function getBoundingBox(element: SceneElement): { x: number; y: number; width: number; height: number } {
  if (element.type === 'freedraw' && element.points && element.points.length > 0) {
    const xs = element.points.map(([px]) => px + element.x)
    const ys = element.points.map(([, py]) => py + element.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
  return { x: element.x, y: element.y, width: element.width, height: element.height }
}

function hitTest(element: SceneElement, x: number, y: number): boolean {
  const bb = getBoundingBox(element)
  const margin = Math.max(8, (element.style.strokeWidth ?? 2) / 2 + 4)
  return (
    x >= bb.x - margin &&
    x <= bb.x + bb.width + margin &&
    y >= bb.y - margin &&
    y <= bb.y + bb.height + margin
  )
}

function drawElement(ctx: CanvasRenderingContext2D, element: SceneElement) {
  if (element.isDeleted) return

  ctx.save()
  ctx.globalAlpha = element.style.opacity

  const cx = element.x + element.width / 2
  const cy = element.y + element.height / 2
  if (element.rotation) {
    ctx.translate(cx, cy)
    ctx.rotate(element.rotation)
    ctx.translate(-cx, -cy)
  }

  ctx.strokeStyle = element.style.strokeColor
  ctx.fillStyle = element.style.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : element.style.fillColor
  ctx.lineWidth = element.style.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (element.type) {
    case 'freedraw': {
      if (!element.points || element.points.length < 2) break
      ctx.beginPath()
      ctx.moveTo(element.x + element.points[0][0], element.y + element.points[0][1])
      for (let i = 1; i < element.points.length; i++) {
        const [px, py] = element.points[i]
        ctx.lineTo(element.x + px, element.y + py)
      }
      ctx.stroke()
      break
    }
    case 'line': {
      ctx.beginPath()
      ctx.moveTo(element.x, element.y)
      ctx.lineTo(element.x + element.width, element.y + element.height)
      ctx.stroke()
      break
    }
    case 'arrow': {
      const x1 = element.x
      const y1 = element.y
      const x2 = element.x + element.width
      const y2 = element.y + element.height
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      // Arrowhead
      if (element.style.arrowhead !== 'none') {
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLen = Math.max(10, element.style.strokeWidth * 4)
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(x2, y2)
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      }
      break
    }
    case 'rectangle': {
      ctx.beginPath()
      ctx.rect(element.x, element.y, element.width, element.height)
      if (element.style.fillColor !== 'transparent') ctx.fill()
      ctx.stroke()
      break
    }
    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(
        element.x + element.width / 2,
        element.y + element.height / 2,
        Math.abs(element.width / 2),
        Math.abs(element.height / 2),
        0, 0, Math.PI * 2
      )
      if (element.style.fillColor !== 'transparent') ctx.fill()
      ctx.stroke()
      break
    }
    case 'diamond': {
      const mx = element.x + element.width / 2
      const my = element.y + element.height / 2
      ctx.beginPath()
      ctx.moveTo(mx, element.y)
      ctx.lineTo(element.x + element.width, my)
      ctx.lineTo(mx, element.y + element.height)
      ctx.lineTo(element.x, my)
      ctx.closePath()
      if (element.style.fillColor !== 'transparent') ctx.fill()
      ctx.stroke()
      break
    }
    case 'text': {
      const fontSize = element.style.fontSize ?? 16
      const fontFamily = element.style.fontFamily ?? 'Caveat, cursive'
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.fillStyle = element.style.strokeColor
      ctx.textBaseline = 'top'
      const text = element.text ?? ''
      const lines = text.split('\n')
      lines.forEach((line, i) => {
        ctx.fillText(line, element.x, element.y + i * (fontSize * 1.2))
      })
      break
    }
  }

  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, appState: AppState) {
  if (!appState.showGrid || !appState.gridSize) return
  const gridSize = appState.gridSize * appState.zoom
  const offsetX = appState.scrollX % gridSize
  const offsetY = appState.scrollY % gridSize

  ctx.save()
  ctx.strokeStyle = 'rgba(100,100,200,0.15)'
  ctx.lineWidth = 1

  for (let x = offsetX; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = offsetY; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  ctx.restore()
}

export default function CanvasView({ boardId, initialSceneJson, readOnly = false, title = 'Board' }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const initialScene = useCallback(() => {
    if (initialSceneJson) {
      try { return deserializeScene(initialSceneJson) } catch {}
    }
    // Try localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sketch-${boardId}`) : null
    if (saved) {
      try { return deserializeScene(saved) } catch {}
    }
    return createEmptyScene()
  }, [boardId, initialSceneJson])

  const [history, dispatch] = useReducer(historyReducer, null, () => ({
    past: [],
    present: initialScene(),
    future: [],
  }))

  const scene = history.present
  const [currentStyle, setCurrentStyle] = useState({ ...DEFAULT_STYLE })
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragStart, setDragStart] = useState<[number, number] | null>(null)
  const [activeElementId, setActiveElementId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [boardTitle, setBoardTitle] = useState(title)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ mx: number; my: number; sx: number; sy: number } | null>(null)
  const [movingElement, setMovingElement] = useState<{ id: string; startX: number; startY: number; elemX: number; elemY: number } | null>(null)

  const setScene = useCallback((newScene: Scene) => {
    dispatch({ type: 'SET', scene: newScene })
  }, [])

  // Autosave to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`sketch-${boardId}`, serializeScene(scene))
    }, 1000)
    return () => clearTimeout(timer)
  }, [scene, boardId])

  // Render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    // Background
    ctx.fillStyle = scene.appState.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    drawGrid(ctx, canvas.width, canvas.height, scene.appState)

    // Elements
    ctx.save()
    ctx.translate(scene.appState.scrollX, scene.appState.scrollY)
    ctx.scale(scene.appState.zoom, scene.appState.zoom)

    getVisibleElements(scene).forEach((el) => {
      drawElement(ctx, el)
    })

    // Selection highlights
    scene.appState.selectedElementIds.forEach((id) => {
      const el = scene.elements.find((e) => e.id === id)
      if (!el || el.isDeleted) return
      const bb = getBoundingBox(el)
      ctx.save()
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2 / scene.appState.zoom
      ctx.setLineDash([4 / scene.appState.zoom, 4 / scene.appState.zoom])
      ctx.strokeRect(bb.x - 4, bb.y - 4, bb.width + 8, bb.height + 8)
      ctx.restore()
    })

    ctx.restore()
  }, [scene])

  const saveToServer = useCallback(async () => {
    if (readOnly) return
    setIsSaving(true)
    try {
      await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneJson: serializeScene(scene), title: boardTitle }),
      })
      setLastSaved(new Date())
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setIsSaving(false)
    }
  }, [boardId, scene, boardTitle, readOnly])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveToServer()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (scene.appState.selectedElementIds.length > 0) {
          setScene(deleteElements(scene, scene.appState.selectedElementIds))
        }
      } else if (e.key === 'Escape') {
        setScene(updateAppState(scene, { selectedElementIds: [] }))
        setEditingTextId(null)
      } else if (e.key === 'v') {
        setScene(updateAppState(scene, { selectedTool: 'select' }))
      } else if (e.key === 'p') {
        setScene(updateAppState(scene, { selectedTool: 'freedraw' }))
      } else if (e.key === 'r') {
        setScene(updateAppState(scene, { selectedTool: 'rectangle' }))
      } else if (e.key === 'e') {
        setScene(updateAppState(scene, { selectedTool: 'ellipse' }))
      } else if (e.key === 'a') {
        setScene(updateAppState(scene, { selectedTool: 'arrow' }))
      } else if (e.key === 't') {
        setScene(updateAppState(scene, { selectedTool: 'text' }))
      } else if (e.key === 'h') {
        setScene(updateAppState(scene, { selectedTool: 'hand' }))
      } else if (e.key === '+' || e.key === '=') {
        setScene(updateAppState(scene, { zoom: Math.min(scene.appState.zoom * 1.2, 5) }))
      } else if (e.key === '-') {
        setScene(updateAppState(scene, { zoom: Math.max(scene.appState.zoom / 1.2, 0.1) }))
      } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        setScene(updateAppState(scene, { zoom: 1, scrollX: 0, scrollY: 0 }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [scene, saveToServer, setScene])

  const getCanvasPoint = useCallback((e: React.PointerEvent | React.WheelEvent): [number, number] => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'clientX' in e ? e.clientX : 0
    const clientY = 'clientY' in e ? e.clientY : 0
    return screenToCanvas(clientX - rect.left, clientY - rect.top, scene.appState)
  }, [scene.appState])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (readOnly && scene.appState.selectedTool !== 'hand') return
    e.currentTarget.setPointerCapture(e.pointerId)

    const [cx, cy] = getCanvasPoint(e)
    const tool = scene.appState.selectedTool

    if (tool === 'hand' || e.button === 1) {
      setIsPanning(true)
      setPanStart({
        mx: e.clientX,
        my: e.clientY,
        sx: scene.appState.scrollX,
        sy: scene.appState.scrollY,
      })
      return
    }

    if (tool === 'select') {
      // Hit test elements
      const visibleEls = getVisibleElements(scene)
      let hit: SceneElement | null = null
      for (let i = visibleEls.length - 1; i >= 0; i--) {
        if (hitTest(visibleEls[i], cx, cy)) {
          hit = visibleEls[i]
          break
        }
      }
      if (hit) {
        if (!scene.appState.selectedElementIds.includes(hit.id)) {
          setScene(updateAppState(scene, { selectedElementIds: [hit.id] }))
        }
        setMovingElement({ id: hit.id, startX: cx, startY: cy, elemX: hit.x, elemY: hit.y })
      } else {
        setScene(updateAppState(scene, { selectedElementIds: [] }))
      }
      return
    }

    if (tool === 'eraser') {
      const visibleEls = getVisibleElements(scene)
      const toDelete = visibleEls.filter((el) => hitTest(el, cx, cy)).map((el) => el.id)
      if (toDelete.length > 0) setScene(deleteElements(scene, toDelete))
      return
    }

    if (tool === 'text') {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      setTextPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setEditingTextId('new')
      setTextInput('')
      return
    }

    if (tool === 'freedraw') {
      setIsDrawing(true)
      const newScene = addElement(scene, {
        type: 'freedraw',
        x: cx,
        y: cy,
        width: 0,
        height: 0,
        points: [[0, 0]],
        rotation: 0,
        style: { ...currentStyle },
        isDeleted: false,
        isLocked: false,
      })
      setActiveElementId(newScene.elements[newScene.elements.length - 1].id)
      dispatch({ type: 'SET', scene: newScene })
      return
    }

    // Shape tools
    setIsDrawing(true)
    setDragStart([cx, cy])
    const newScene = addElement(scene, {
      type: tool as import('@/types/scene').ElementType,
      x: cx,
      y: cy,
      width: 0,
      height: 0,
      rotation: 0,
      style: { ...currentStyle },
      isDeleted: false,
      isLocked: false,
    })
    setActiveElementId(newScene.elements[newScene.elements.length - 1].id)
    dispatch({ type: 'SET', scene: newScene })
  }, [scene, readOnly, getCanvasPoint, currentStyle, setScene])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.mx
      const dy = e.clientY - panStart.my
      setScene(updateAppState(scene, {
        scrollX: panStart.sx + dx,
        scrollY: panStart.sy + dy,
      }))
      return
    }

    if (movingElement) {
      const [cx, cy] = getCanvasPoint(e)
      const dx = cx - movingElement.startX
      const dy = cy - movingElement.startY
      setScene(updateElement(scene, movingElement.id, {
        x: movingElement.elemX + dx,
        y: movingElement.elemY + dy,
      }))
      return
    }

    if (!isDrawing || !activeElementId) return
    const [cx, cy] = getCanvasPoint(e)
    const tool = scene.appState.selectedTool

    if (tool === 'freedraw') {
      const el = scene.elements.find((e) => e.id === activeElementId)
      if (!el) return
      const newPoint: [number, number] = [cx - el.x, cy - el.y]
      const newPoints = [...(el.points ?? []), newPoint]
      dispatch({
        type: 'SET',
        scene: updateElement(history.present, activeElementId, { points: newPoints }),
      })
      return
    }

    if (dragStart) {
      const [sx, sy] = dragStart
      const x = Math.min(cx, sx)
      const y = Math.min(cy, sy)
      const w = Math.abs(cx - sx)
      const h = Math.abs(cy - sy)
      dispatch({
        type: 'SET',
        scene: updateElement(history.present, activeElementId, {
          x: tool === 'line' || tool === 'arrow' ? sx : x,
          y: tool === 'line' || tool === 'arrow' ? sy : y,
          width: tool === 'line' || tool === 'arrow' ? cx - sx : w,
          height: tool === 'line' || tool === 'arrow' ? cy - sy : h,
        }),
      })
    }
  }, [isPanning, panStart, movingElement, isDrawing, activeElementId, scene, getCanvasPoint, dragStart, history.present, setScene])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false)
    setPanStart(null)
    setMovingElement(null)

    if (!isDrawing && !movingElement) return
    setIsDrawing(false)
    setDragStart(null)
    setActiveElementId(null)

    // Clean up zero-size shapes
    if (activeElementId) {
      const el = scene.elements.find((e) => e.id === activeElementId)
      if (el && el.type !== 'freedraw' && Math.abs(el.width) < 3 && Math.abs(el.height) < 3) {
        setScene(deleteElements(scene, [activeElementId]))
      }
    }
  }, [isDrawing, movingElement, activeElementId, scene, setScene])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, scene.appState.zoom * delta))
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const newScrollX = cx - (cx - scene.appState.scrollX) * (newZoom / scene.appState.zoom)
      const newScrollY = cy - (cy - scene.appState.scrollY) * (newZoom / scene.appState.zoom)
      setScene(updateAppState(scene, { zoom: newZoom, scrollX: newScrollX, scrollY: newScrollY }))
    } else {
      setScene(updateAppState(scene, {
        scrollX: scene.appState.scrollX - e.deltaX,
        scrollY: scene.appState.scrollY - e.deltaY,
      }))
    }
  }, [scene, setScene])

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) {
      setEditingTextId(null)
      setTextPos(null)
      return
    }
    const [cx, cy] = screenToCanvas(
      (textPos?.x ?? 0),
      (textPos?.y ?? 0),
      scene.appState
    )
    const newScene = addElement(scene, {
      type: 'text',
      x: cx,
      y: cy,
      width: 200,
      height: 30,
      rotation: 0,
      style: { ...currentStyle },
      text: textInput,
      isDeleted: false,
      isLocked: false,
    })
    setScene(newScene)
    setEditingTextId(null)
    setTextPos(null)
    setTextInput('')
  }, [textInput, textPos, scene, currentStyle, setScene])

  // Export PNG
  const exportPNG = useCallback(async (scale = 2, transparent = false) => {
    const visibleEls = getVisibleElements(scene)
    if (visibleEls.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    visibleEls.forEach((el) => {
      const bb = getBoundingBox(el)
      minX = Math.min(minX, bb.x)
      minY = Math.min(minY, bb.y)
      maxX = Math.max(maxX, bb.x + bb.width)
      maxY = Math.max(maxY, bb.y + bb.height)
    })
    const padding = 20
    const w = (maxX - minX + padding * 2) * scale
    const h = (maxY - minY + padding * 2) * scale

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const ctx = offscreen.getContext('2d')!
    if (!transparent) {
      ctx.fillStyle = scene.appState.backgroundColor
      ctx.fillRect(0, 0, w, h)
    }
    ctx.scale(scale, scale)
    ctx.translate(-minX + padding, -minY + padding)
    visibleEls.forEach((el) => drawElement(ctx, el))

    const url = offscreen.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardTitle.replace(/\s+/g, '-')}.png`
    a.click()
  }, [scene, boardTitle])

  // Export SVG
  const exportSVG = useCallback(() => {
    const visibleEls = getVisibleElements(scene)
    if (visibleEls.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    visibleEls.forEach((el) => {
      const bb = getBoundingBox(el)
      minX = Math.min(minX, bb.x)
      minY = Math.min(minY, bb.y)
      maxX = Math.max(maxX, bb.x + bb.width)
      maxY = Math.max(maxY, bb.y + bb.height)
    })
    const padding = 20
    const w = maxX - minX + padding * 2
    const h = maxY - minY + padding * 2

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX - padding} ${minY - padding} ${w} ${h}">`
    svgContent += `<rect x="${minX - padding}" y="${minY - padding}" width="${w}" height="${h}" fill="${scene.appState.backgroundColor}"/>`

    visibleEls.forEach((el) => {
      const s = el.style
      const stroke = `stroke="${s.strokeColor}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${s.opacity}"`
      const fill = s.fillColor === 'transparent' ? 'none' : s.fillColor

      switch (el.type) {
        case 'rectangle':
          svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fill}" ${stroke}/>`
          break
        case 'ellipse':
          svgContent += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${Math.abs(el.width / 2)}" ry="${Math.abs(el.height / 2)}" fill="${fill}" ${stroke}/>`
          break
        case 'diamond': {
          const mx = el.x + el.width / 2
          const my = el.y + el.height / 2
          svgContent += `<polygon points="${mx},${el.y} ${el.x + el.width},${my} ${mx},${el.y + el.height} ${el.x},${my}" fill="${fill}" ${stroke}/>`
          break
        }
        case 'line':
          svgContent += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" ${stroke}/>`
          break
        case 'arrow': {
          const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const headLen = Math.max(10, s.strokeWidth * 4)
          svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${stroke}/>`
          svgContent += `<line x1="${x2}" y1="${y2}" x2="${x2 - headLen * Math.cos(angle - Math.PI / 6)}" y2="${y2 - headLen * Math.sin(angle - Math.PI / 6)}" ${stroke}/>`
          svgContent += `<line x1="${x2}" y1="${y2}" x2="${x2 - headLen * Math.cos(angle + Math.PI / 6)}" y2="${y2 - headLen * Math.sin(angle + Math.PI / 6)}" ${stroke}/>`
          break
        }
        case 'freedraw':
          if (el.points && el.points.length > 1) {
            const d = el.points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${el.x + px} ${el.y + py}`).join(' ')
            svgContent += `<path d="${d}" fill="none" ${stroke}/>`
          }
          break
        case 'text':
          svgContent += `<text x="${el.x}" y="${el.y + (s.fontSize ?? 16)}" font-size="${s.fontSize ?? 16}" fill="${s.strokeColor}" font-family="${s.fontFamily ?? 'sans-serif'}">${el.text ?? ''}</text>`
          break
      }
    })

    svgContent += '</svg>'
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardTitle.replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [scene, boardTitle])

  const createShareLink = useCallback(async (mode: 'ro' | 'rw' = 'ro') => {
    const res = await fetch(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    const data = await res.json()
    const url = `${window.location.origin}/share/${data.token}`
    setShareUrl(url)
    await navigator.clipboard.writeText(url).catch(() => {})
    return url
  }, [boardId])

  const cursor = (() => {
    const tool = scene.appState.selectedTool
    if (isPanning) return 'grabbing'
    if (tool === 'hand') return 'grab'
    if (tool === 'select') return 'default'
    if (tool === 'eraser') return 'crosshair'
    return 'crosshair'
  })()

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/boards')}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Back to boards"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <input
            className="text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none focus:bg-white focus:border focus:border-violet-300 focus:rounded px-1 min-w-0"
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            onBlur={() => saveToServer()}
            readOnly={readOnly}
            aria-label="Board title"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button onClick={() => dispatch({ type: 'UNDO' })} disabled={history.past.length === 0}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
            aria-label="Undo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={() => dispatch({ type: 'REDO' })} disabled={history.future.length === 0}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
            aria-label="Redo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          {/* Zoom */}
          <span className="text-xs text-slate-500 tabular-nums w-12 text-center">
            {Math.round(scene.appState.zoom * 100)}%
          </span>
          <button onClick={() => setScene(updateAppState(scene, { zoom: 1, scrollX: 0, scrollY: 0 }))}
            className="text-xs text-slate-500 hover:text-violet-600 px-2 py-1 rounded hover:bg-slate-100"
            aria-label="Reset zoom">
            Fit
          </button>

          {/* Grid toggle */}
          <button
            onClick={() => setScene(updateAppState(scene, { showGrid: !scene.appState.showGrid }))}
            className={`p-1.5 rounded transition-colors ${scene.appState.showGrid ? 'bg-violet-100 text-violet-600' : 'hover:bg-slate-100 text-slate-500'}`}
            aria-label="Toggle grid">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {!readOnly && (
            <>
              {/* Share */}
              <button onClick={() => createShareLink('ro')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                aria-label="Share board">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>

              {/* Export */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  aria-label="Export board">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-50 min-w-[140px]">
                  <button onClick={() => exportPNG(2)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">PNG (2x)</button>
                  <button onClick={() => exportPNG(4)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">PNG (4x)</button>
                  <button onClick={() => exportPNG(2, true)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">PNG transparent</button>
                  <button onClick={exportSVG} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">SVG</button>
                </div>
              </div>

              {/* Save */}
              <button onClick={saveToServer} disabled={isSaving}
                className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                aria-label="Save board">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Share URL toast */}
      {shareUrl && (
        <div className="absolute top-16 right-4 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 max-w-sm">
          <p className="text-sm font-semibold text-slate-700 mb-2">Share link copied!</p>
          <p className="text-xs text-slate-500 break-all mb-3">{shareUrl}</p>
          <button onClick={() => setShareUrl(null)} className="text-xs text-violet-600 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        {!readOnly && (
          <Toolbar
            selectedTool={scene.appState.selectedTool}
            onSelectTool={(tool) => setScene(updateAppState(scene, { selectedTool: tool }))}
          />
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            aria-label="Drawing canvas"
          />

          {/* Text editor overlay */}
          {editingTextId && textPos && (
            <div
              style={{ position: 'absolute', left: textPos.x, top: textPos.y, zIndex: 50 }}
            >
              <textarea
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onBlur={handleTextSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setEditingTextId(null); setTextPos(null) }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit() }
                }}
                className="min-w-[100px] min-h-[32px] p-1 border-2 border-violet-400 rounded bg-white/90 text-slate-800 focus:outline-none resize-none"
                style={{
                  fontSize: `${currentStyle.fontSize}px`,
                  fontFamily: currentStyle.fontFamily,
                }}
                aria-label="Text input"
              />
            </div>
          )}
        </div>

        {/* Style Panel */}
        {!readOnly && scene.appState.selectedTool !== 'hand' && scene.appState.selectedTool !== 'select' && (
          <StylePanel
            style={currentStyle}
            onStyleChange={setCurrentStyle}
            selectedTool={scene.appState.selectedTool}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-1 flex items-center gap-4 text-xs text-slate-400">
        <span>{getVisibleElements(scene).length} elements</span>
        {lastSaved && <span>Saved {lastSaved.toLocaleTimeString()}</span>}
        <span className="ml-auto">Ctrl+Z undo · Ctrl+S save · V select · P pen · R rect · E ellipse · T text</span>
      </div>
    </div>
  )
}
