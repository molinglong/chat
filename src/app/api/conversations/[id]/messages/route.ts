import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor") ?? undefined
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100)

  // Verify the conversation belongs to the user
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // fetch one extra to determine if there's a next page
    ...(cursor
      ? {
          skip: 1, // skip the cursor itself
          cursor: { id: cursor },
        }
      : {}),
    select: {
      id: true,
      role: true,
      content: true,
      attachments: true,
      createdAt: true,
    },
  })

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? page[page.length - 1]?.id : null

  return NextResponse.json({
    messages: page,
    nextCursor,
  })
}
