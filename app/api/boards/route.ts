import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { serializeScene } from '@/lib/scene'
import { createEmptyScene } from '@/types/scene'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

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
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const title = body.title || 'Untitled Board'

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
}
