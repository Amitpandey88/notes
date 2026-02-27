'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const CanvasView = dynamic(() => import('./CanvasView'), { ssr: false })

interface Props {
  boardId: string
  readOnly?: boolean
}

interface BoardData {
  id: string
  title: string
  snapshots: { sceneJson: string; version: number }[]
}

export function BoardEditor({ boardId, readOnly = false }: Props) {
  const [board, setBoard] = useState<BoardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setBoard(d)
      })
      .catch(() => setError('Failed to load board'))
  }, [boardId])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading board...</p>
      </div>
    )
  }

  const sceneJson = board.snapshots?.[0]?.sceneJson

  return (
    <CanvasView
      boardId={boardId}
      initialSceneJson={sceneJson}
      readOnly={readOnly}
      title={board.title}
    />
  )
}
