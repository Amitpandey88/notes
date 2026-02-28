import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { serializeScene } from '@/lib/scene'
import { createEmptyScene } from '@/types/scene'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  try {
    const boards = await prisma.board.findMany({
      where: {
        ownerId: null, // anonymous boards
        title: search ? { contains: search } : undefined,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json(boards)
  } catch (e) {
    console.error('GET /api/boards error', e)
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const title = body.title || 'Untitled Board'

  try {
    const scene = createEmptyScene()
    const board = await prisma.board.create({
      data: {
        title,
        snapshots: {
          create: {
            version: 1,
            sceneJson: serializeScene(scene),
          },
        },
      },
      include: {
        snapshots: true,
      },
    })

    return NextResponse.json(board, { status: 201 })
  } catch (e) {
    console.error('POST /api/boards error', e)
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
  }
}
