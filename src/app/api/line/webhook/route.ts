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

          // --- TOTAL AMOUNT INQUIRY ---
          if (text === "總金額") {
            const user = await prisma.user.findUnique({ where: { lineId: userId } });
            if (!user) {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "目前沒有進行中的訂單喔！" }]
              });
              return;
            }

            const orders = await prisma.order.findMany({
              where: {
                userId: user.id,
                isArchived: false,
                status: { in: ["CONFIRMED", "PURCHASED"] }
              },
              include: { product: true }
            });

            if (orders.length === 0) {
              await client.replyMessage({
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "目前沒有進行中的訂單喔！" }]
              });
              return;
            }

            let totalAmount = 0;
            const orderList = orders.map((order, index) => {
              totalAmount += order.totalAmount;
              return `${index + 1}. ${order.product.keyword} 🏷️ ${order.product.name} - ${order.size} x ${order.quantity} ($${order.totalAmount})`;
            }).join("\n");

            const replyText = `🛍️ 目前訂單明細：\n\n${orderList}\n\n💰 總金額：$${totalAmount}\n\n連線結束後，會再依序傳送下單連結唷！感謝您的購買🫶🏻`;

            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: replyText }]
            });
            return;
          }

          // --- ADMIN PRODUCT UPLOAD ---
          if (text.includes("連線商品")) {
            let user = await prisma.user.findUnique({ where: { lineId: userId } });

            if (!user || user.role !== "ADMIN") {
              // Ignore non-admin
            } else {
              // Parse usage:
              // 連線商品
              // 商品編號：N01
              // 商品名：adidas唐衣-紅
              // size：S:100, M:120, L:120
              // 商品描述：無

              const lines = text.split("\n");
              let keyword = "";
              let name = "";
              let variantsData: { size: string, price: number }[] = []; // { size, price }
              let description = "";

              // Parse line by line
              for (const line of lines) {
                if (line.includes("商品編號：") || line.includes("商品編號:") || line.includes("代號：") || line.includes("代號:")) {
                  keyword = line.split(/：|:/)[1]?.trim().toUpperCase() || "";
                } else if (line.includes("商品名：") || line.includes("商品名:")) {
                  name = line.split(/：|:/)[1].trim();
                } else if (line.includes("size：") || line.includes("size:")) {
                  const sizeContent = line.split(/：|:/)[1].trim(); // e.g. "S:100, M:120"
                  const items = sizeContent.split(/[ ,、]+/); // ["S:100", "M:120"]

                  for (const item of items) {
                    if (item.includes(":") || item.includes("：")) {
                      const [s, p] = item.split(/[:：]/);
                      if (s && p) {
                        variantsData.push({ size: s.trim(), price: parseInt(p.trim(), 10) || 0 });
                      }
                    } else {
                      // Fallback if no price specified? Maybe assume 0 or handle error?
                      // For flexibility, if only size is given, maybe price is 0?
                      if (item.trim()) {
                        variantsData.push({ size: item.trim(), price: 0 });
                      }
                    }
                  }

                } else if (line.includes("商品描述：") || line.includes("商品描述:")) {
                  description = line.split(/：|:/)[1].trim();
                }
              }

              if (keyword && name) {
                try {
                  // Update or Create Product
                  // Use findFirst because keyword is not unique across history
                  const existing = await prisma.product.findFirst({
                    where: { keyword: keyword, status: "ACTIVE" }
                  });

                  if (existing) {
                    // Update basic info
                    await prisma.product.update({
                      where: { id: existing.id },
                      data: {
                        name,
                        description: description === "無" ? null : description,
                      }
                    });
                    // Recreate variants
                    await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
                    if (variantsData.length > 0) {
                      await prisma.productVariant.createMany({
                        data: variantsData.map(v => ({
                          productId: existing.id,
                          size: v.size,
                          price: v.price
                        }))
                      });
                    }
                  } else {
                    // Create new
                    await prisma.product.create({
                      data: {
                        keyword,
                        name,
                        description: description === "無" ? null : description,
                        status: "ACTIVE",
                        variants: {
                          create: variantsData.map(v => ({
                            size: v.size,
                            price: v.price
                          }))
                        }
                      }
                    });
                  }

                  // Reply
                  const variantDisplay = variantsData.map(v => `${v.size}($${v.price})`).join(", ");
                  const replyText = `✅ 商品上架成功！\n${name} (${keyword})\n規格: ${variantDisplay}\n\n👇 發送以下文字下單:\n---------------\n商品編號：${keyword}\n數量：1\n尺寸：${variantsData[0]?.size || "F"}`;

                  await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: [{ type: "text", text: replyText }]
                  });
                } catch (e) {
                  console.error("Product creation failed", e);
                  await client.replyMessage({
                    replyToken: event.replyToken,
                    messages: [{ type: "text", text: "❌ 商品上架失敗。" }]
                  });
                }
              }
            }
            return; // Stop processing
          }


          // --- USER ORDERING ---
          // Template:
          // 商品編號：N01
          // 數量：2
          // 尺寸：L

          // CHECK: Strict prefix or likely format
          const hasStrictPrefix = text.includes("商品編號：") || text.includes("商品編號:") || text.includes("代號：") || text.includes("代號:");
          const isLikelyOrder = hasStrictPrefix || (text.includes("\n") && /[A-Za-z0-9]/.test(text));

          if (isLikelyOrder) {

            // 0. Check Global Switch
            const setting = await prisma.systemSetting.findUnique({ where: { key: "ordering_enabled" } });
            if (setting?.value === "false") {
              return;
            }

            const activeProducts = await prisma.product.findMany({
              where: { status: "ACTIVE" },
              select: { keyword: true }
            });
            const validKeywords = new Set(activeProducts.map(p => p.keyword.toUpperCase()));

            const lines = text.split("\n");
            const parsedItems: { keyword: string, quantity: number, size: string }[] = [];
            let currentItem: { keyword: string, quantity: number, size: string } | null = null;

            for (let line of lines) {
              line = line.trim();
              if (!line) continue;

              // 1. Strict pattern
              if (line.includes("商品編號：") || line.includes("商品編號:") || line.includes("代號：") || line.includes("代號:")) {
                if (currentItem && currentItem.keyword) {
                  parsedItems.push(currentItem);
                }
                const rawKeyword = line.split(/：|:/)[1]?.trim().toUpperCase() || "";
                currentItem = {
                  keyword: rawKeyword.split(/[\s(（]/)[0],
                  quantity: 1,
                  size: ""
                };
                continue;
              } else if ((line.includes("數量：") || line.includes("數量:")) && currentItem) {
                const q = line.split(/：|:/)[1].trim();
                currentItem.quantity = parseInt(q, 10) || 1;
                continue;
              } else if ((line.includes("尺寸：") || line.includes("尺寸:")) && currentItem) {
                currentItem.size = line.split(/：|:/)[1].trim();
                continue;
              }

              // 2. Free-form pattern
              const potentialKeyword = line.split(/[\s(（]/)[0].toUpperCase();
              
              if (validKeywords.has(potentialKeyword)) {
                if (currentItem && currentItem.keyword) parsedItems.push(currentItem);
                currentItem = { keyword: potentialKeyword, quantity: 1, size: "" };
              } else if (currentItem) {
                const qMatch = line.match(/^([+＋]\d+)|\d+\s*(件|個|雙|套|組)$/);
                if (qMatch) {
                  const qStr = line.replace(/[+＋件個雙套組\s]/g, "");
                  const q = parseInt(qStr, 10);
                  if (q > 0) currentItem.quantity = q;
                } else if (!currentItem.size) {
                  let s = line;
                  if (s.endsWith("號") && s.length > 1) {
                     s = s.replace("號", "").trim();
                  }
                  currentItem.size = s;
                } else {
                  if (/^\d+$/.test(line)) {
                     const q = parseInt(line, 10);
                     if (q > 0) currentItem.quantity = q;
                  }
                }
              }
            }
            if (currentItem && currentItem.keyword) {
              parsedItems.push(currentItem);
            }

            if (parsedItems.length > 0) {
              // Find/Create User ONCE
              let user = await prisma.user.findUnique({ where: { lineId: userId } });
              if (!user) {
                user = await prisma.user.create({ data: { lineId: userId } });
                try {
                  const profile = await client.getProfile(userId);
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { name: profile.displayName, avatarUrl: profile.pictureUrl }
                  });
                } catch (e) { }
              }

              let successText = "";
              let failText = "";

              for (const item of parsedItems) {
                const { keyword, quantity } = item;
                let { size } = item;

                const product = await prisma.product.findFirst({
                  where: { keyword: keyword, status: "ACTIVE" },
                  include: { variants: true }
                });

                if (!product) {
                  failText += `❌ ${keyword} - 找不到此商品\n`;
                  continue;
                }

                if (!size) {
                  if (product.variants.length === 1) {
                    size = product.variants[0].size;
                  } else {
                    size = "F";
                  }
                }

                const variant = product.variants.find(v => v.size === size) ||
                  product.variants.find(v => v.size.toLowerCase() === size.toLowerCase());

                if (!variant) {
                  const availableSizes = product.variants.map(v => v.size).join(", ");
                  failText += `❌ ${keyword} - ${product.name} 找不到尺寸 "${size}"\n`;
                  continue;
                }

                try {
                  const result = await prisma.$executeRaw`
                    UPDATE "ProductVariant"
                    SET "sold" = "sold" + ${quantity}
                    WHERE "id" = ${variant.id}
                      AND ("stock" IS NULL OR "sold" + ${quantity} <= "stock")
                  `;

                  if (result === 0) {
                    failText += `❌ ${keyword} - ${product.name} 庫存不足或已完售了😭\n`;
                    continue;
                  }
                } catch (e) {
                  console.error("Stock update failed", e);
                  failText += `❌ ${keyword} - ${product.name} 系統異常無法更新庫存\n`;
                  continue;
                }

                // Create Order
                await prisma.order.create({
                  data: {
                    userId: user.id,
                    productId: product.id,
                    quantity: quantity,
                    size: variant.size,
                    totalAmount: variant.price * quantity,
                    status: "CONFIRMED"
                  }
                });

                successText += `編號：${keyword}\n商品：${product.name}\n尺寸：${variant.size}\n數量：${quantity}\n金額：$${variant.price * quantity}\n\n`;
              }

              let replyText = "";
              if (successText) {
                replyText += `✅ 訂單已確認！\n\n${successText}喊單確認後無法更改或取消\n感謝您的購買！\n\n💬輸入關鍵字「總金額」\n即可查看目前喊單品項與總額\n\n`;
              }
              if (failText) {
                replyText += `【⚠️未成功入單項目】\n${failText}趕快到群組逛逛其他選品～手刀喊單搶購🔥`;
              }

              if (replyText) {
                await client.replyMessage({
                  replyToken: event.replyToken,
                  messages: [{ type: "text", text: replyText.trim() }]
                });
              }
            }
            return;
          }

          // If strict check fails, do NOTHING (ignore spam)
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
