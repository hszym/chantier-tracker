import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"

const client = new Anthropic()

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = await request.json()

  if (!imageBase64 || !mimeType) {
    return Response.json({ error: "Missing imageBase64 or mimeType" }, { status: 400 })
  }

  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!validMimeTypes.includes(mimeType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 })
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Analyse ce ticket de caisse ou cette facture et extrais les informations suivantes en JSON.
Réponds UNIQUEMENT avec le JSON, sans explication ni markdown.

{
  "date": "YYYY-MM-DD ou null si non trouvée",
  "total_amount": nombre décimal ou null,
  "store_name": "nom du magasin/fournisseur ou null",
  "payment_method": "cb|cash|cheque|virement|autre ou null",
  "vat_amount": nombre décimal ou null
}`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

  try {
    const data = JSON.parse(text)
    return Response.json(data)
  } catch {
    return Response.json({ error: "Failed to parse OCR response", raw }, { status: 422 })
  }
}
