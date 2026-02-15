import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent, validateSignature } from "@line/bot-sdk";
import client from "@/lib/line";
import prisma from "@/lib/prisma";

// Type definition for LINE Webhook Body
interface LineWebhookBody {
  destination: string;
  events: WebhookEvent[];
}

export async function POST(req: NextRequest) {
  // 1. Get Signature
  const signature = req.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  // 2. Get Body as text for validation
  const body = await req.text();

  // 3. Validate Signature
  const channelSecret = process.env.CHANNEL_SECRET || "";
  if (!validateSignature(body, channelSecret, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  // 4. Parse Body
  const data: LineWebhookBody = JSON.parse(body);

  // 5. Handle Events
  try {
    await Promise.all(
      data.events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const text = event.message.text.trim();
          const userId = event.source.userId;

          if (!userId) return;

          // Check if message is an order command (e.g., "A01 +1" or just "A01")
          // Simple logic: check if text starts with a product keyword
          // For MVP, enable any text to be a keyword check
          const potentialKeyword = text.split(" ")[0].toUpperCase();

          const product = await prisma.product.findUnique({
            where: { keyword: potentialKeyword },
          });

          if (product) {
            // It's a valid order!
            // 1. Find or Create User
            let user = await prisma.user.findUnique({
              where: { lineId: userId },
            });

            if (!user) {
              // Fetch profile if possible, simple creation for now
              user = await prisma.user.create({
                data: {
                  lineId: userId,
                },
              });

              // Try to get profile in background
              try {
                const profile = await client.getProfile(userId);
                await prisma.user.update({
                  where: { id: user.id },
                  data: { name: profile.displayName, avatarUrl: profile.pictureUrl }
                });
              } catch (e) {
                console.log("Failed to fetch profile", e);
              }
            }

            // 2. Create Order
            const quantity = 1; // Default to 1 for now, can parse form text later
            await prisma.order.create({
              data: {
                userId: user.id,
                productId: product.id,
                quantity: quantity,
                totalAmount: product.price * quantity,
                status: "CONFIRMED",
              },
            });

            // 3. Reply
            try {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [
                  {
                    type: "text",
                    text: `✅ Order Confirmed!\n\nItem: ${product.name}\nPrice: $${product.price}\nQty: ${quantity}\n\nThank you!`,
                  },
                ],
              });
            } catch (replyError) {
              console.error("Failed to send reply:", replyError);
            }
          } else {
            // Not a product keyword, maybe chat?
            // Optional: Echo or Ignore
            // For debugging, reply so user knows bot is alive
            if (text === "ping") {
              try {
                await client.replyMessage({
                  replyToken: event.replyToken,
                  messages: [{ type: "text", text: "pong" }]
                });
              } catch (replyError) {
                console.error("Failed to send reply:", replyError);
              }
            }
          }
        }
      })
    );
  } catch (err) {
    console.error("Error handling events:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "OK" });
}
