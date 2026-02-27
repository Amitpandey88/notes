import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/hash'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const tokenHash = hashToken(token)
  
  const shareToken = await prisma.boardShareToken.findUnique({
    where: { tokenHash },
    include: {
      board: {
        include: {
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!shareToken) {
    return NextResponse.json({ error: 'Share token not found' }, { status: 404 })
  }

  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Share token expired' }, { status: 410 })
  }

  return NextResponse.json({
    board: shareToken.board,
    mode: shareToken.mode,
  })
}
