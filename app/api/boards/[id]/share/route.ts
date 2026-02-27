import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/hash'

// Rate limiting (simple in-memory for single-instance deployments).
// For multi-instance or serverless deployments, replace with a
// distributed store such as Redis (e.g. via Upstash) before going to production.
const shareRequestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 60_000 // 1 minute
  const limit = 10

  // Clean up expired entries to prevent unbounded growth
  for (const [key, val] of shareRequestCounts) {
    if (val.resetAt < now) shareRequestCounts.delete(key)
  }

  const entry = shareRequestCounts.get(ip)
  if (!entry || entry.resetAt < now) {
    shareRequestCounts.set(ip, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const mode = body.mode === 'rw' ? 'rw' : 'ro'

  const token = generateToken()
  const tokenHash = hashToken(token)

  await prisma.boardShareToken.create({
    data: {
      boardId: id,
      mode,
      tokenHash,
    },
  })

  return NextResponse.json({ token, mode })
}
