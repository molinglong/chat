import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto"
import { providers } from "@/lib/ai/registry"

/**
 * GET /api/keys
 * Returns the current user's stored API keys (masked).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, encryptedKey: true, createdAt: true, updatedAt: true },
  })

  const result = keys.map((k) => {
    let masked = "••••••••"
    try {
      const plain = decrypt(k.encryptedKey)
      masked = plain.slice(0, 4) + "••••" + plain.slice(-4)
    } catch {
      // keep default mask
    }
    return {
      id: k.id,
      provider: k.provider,
      maskedKey: masked,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }
  })

  return NextResponse.json(result)
}

/**
 * POST /api/keys
 * Body: { provider: string, apiKey: string }
 * Creates or updates an API key for the given provider.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { provider, apiKey } = body

  if (!provider || typeof provider !== "string") {
    return NextResponse.json({ error: "provider is required" }, { status: 400 })
  }
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 })
  }
  if (!providers[provider]) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
  }

  const encryptedKey = encrypt(apiKey)

  const record = await prisma.apiKey.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider,
      },
    },
    update: { encryptedKey },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey,
    },
  })

  return NextResponse.json({ id: record.id, provider: record.provider })
}

/**
 * DELETE /api/keys
 * Body: { provider: string }
 * Deletes the API key for the given provider.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { provider } = body

  if (!provider || typeof provider !== "string") {
    return NextResponse.json({ error: "provider is required" }, { status: 400 })
  }

  try {
    await prisma.apiKey.delete({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }
}
