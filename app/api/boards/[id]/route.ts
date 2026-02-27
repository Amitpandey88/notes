import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { serializeScene, deserializeScene } from '@/lib/scene'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      snapshots: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  return NextResponse.json(board)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  
  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  const updates: { title?: string; visibility?: string } = {}
  if (body.title !== undefined) updates.title = String(body.title).slice(0, 200)
  if (body.visibility !== undefined && ['private', 'public_ro'].includes(body.visibility)) {
    updates.visibility = body.visibility
  }

  if (body.sceneJson !== undefined) {
    // Validate scene JSON
    try {
      const scene = deserializeScene(body.sceneJson)
      // Save new snapshot
      const lastSnapshot = await prisma.boardSnapshot.findFirst({
        where: { boardId: id },
        orderBy: { version: 'desc' },
      })
      const nextVersion = (lastSnapshot?.version ?? 0) + 1
      await prisma.boardSnapshot.create({
        data: {
          boardId: id,
          version: nextVersion,
          sceneJson: serializeScene(scene),
        },
      })
    } catch {
      return NextResponse.json({ error: 'Invalid scene JSON' }, { status: 400 })
    }
  }

  const updated = await prisma.board.update({
    where: { id },
    data: updates,
    include: {
      snapshots: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  await prisma.board.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
