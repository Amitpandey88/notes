'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Board {
  id: string
  title: string
  updatedAt: string
  createdAt: string
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const fetchBoards = async (query: string) => {
    try {
      const res = await fetch(`/api/boards?search=${encodeURIComponent(query)}`)
      if (!res.ok) {
        console.error('Failed to fetch boards', res.status)
        return
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        console.error('Unexpected API response: expected array, got', typeof data)
        return
      }
      setBoards(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Debounce search to avoid excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => fetchBoards(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const createBoard = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Board' }),
      })
      if (!res.ok) {
        console.error('Failed to create board', res.status)
        setCreating(false)
        return
      }
      const board = await res.json()
      router.push(`/board/${board.id}`)
    } catch (e) {
      console.error(e)
      setCreating(false)
    }
  }

  const deleteBoard = async (id: string) => {
    if (!confirm('Delete this board?')) return
    await fetch(`/api/boards/${id}`, { method: 'DELETE' })
    setBoards((prev) => prev.filter((b) => b.id !== id))
  }

  const renameBoard = async (id: string, currentTitle: string) => {
    const newTitle = prompt('Rename board:', currentTitle)
    if (!newTitle || newTitle === currentTitle) return
    await fetch(`/api/boards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title: newTitle } : b)))
  }

  const duplicateBoard = async (id: string, title: string) => {
    // Get board data
    const res = await fetch(`/api/boards/${id}`)
    if (!res.ok) {
      console.error('Failed to fetch board for duplication', res.status)
      return
    }
    const board = await res.json()
    const sceneJson = board.snapshots?.[0]?.sceneJson

    const newRes = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${title} (copy)` }),
    })
    if (!newRes.ok) {
      console.error('Failed to create duplicate board', newRes.status)
      return
    }
    const newBoard = await newRes.json()

    if (sceneJson) {
      await fetch(`/api/boards/${newBoard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneJson }),
      })
    }

    fetchBoards(search)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">SketchNotes</h1>
          </div>
          <button
            onClick={createBoard}
            disabled={creating}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm disabled:opacity-50"
            aria-label="Create new board"
          >
            {creating ? 'Creating...' : '+ New Board'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            aria-label="Search boards"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No boards yet</h3>
            <p className="text-slate-500 mb-6">Create your first board to start sketching</p>
            <button
              onClick={createBoard}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all group"
              >
                <Link href={`/board/${board.id}`} className="block p-4 pb-3">
                  <div className="w-full h-32 rounded-lg bg-slate-50 mb-3 flex items-center justify-center border border-slate-100">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-800 truncate group-hover:text-violet-600 transition-colors">
                    {board.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(board.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </Link>
                <div className="px-4 pb-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => renameBoard(board.id, board.title)}
                    className="text-xs text-slate-500 hover:text-violet-600 transition-colors"
                    aria-label={`Rename ${board.title}`}
                  >
                    Rename
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => duplicateBoard(board.id, board.title)}
                    className="text-xs text-slate-500 hover:text-violet-600 transition-colors"
                    aria-label={`Duplicate ${board.title}`}
                  >
                    Duplicate
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => deleteBoard(board.id)}
                    className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                    aria-label={`Delete ${board.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
