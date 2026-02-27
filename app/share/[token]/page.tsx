'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const CanvasView = dynamic(() => import('@/components/canvas/CanvasView'), { ssr: false })

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<{ board: any; mode: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load board'))
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-700 mb-2">Board not found</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  const sceneJson = data.board.snapshots?.[0]?.sceneJson
  return (
    <CanvasView
      boardId={data.board.id}
      initialSceneJson={sceneJson}
      readOnly={data.mode === 'ro'}
      title={data.board.title}
    />
  )
}
