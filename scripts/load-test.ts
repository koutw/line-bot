import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/line/webhook";

if (!CHANNEL_SECRET) {
  console.error("Error: CHANNEL_SECRET is not set in .env");
  process.exit(1);
}

const PRODUCTS = ["P01", "P02", "P03", "A01", "C01", "C02"];

const generateSignature = (body: string, secret: string) => {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`Starting load test: 100 orders to ${WEBHOOK_URL}`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < 100; i++) {
    const keyword = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const userId = `U${crypto.randomBytes(10).toString("hex")}`; // Valid-looking LINE User ID
    const replyToken = crypto.randomBytes(16).toString("hex");

    const body = JSON.stringify({
      destination: "Uxxxxxxxxxx",
      events: [
        {
          type: "message",
          message: {
            type: "text",
            id: "444573898512345678",
            text: keyword, // Sending just the keyword to trigger order
          },
          timestamp: Date.now(),
          source: {
            type: "user",
            userId: userId,
          },
          replyToken: replyToken,
          mode: "active",
        },
      ],
    });

    const signature = generateSignature(body, CHANNEL_SECRET!);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-line-signature": signature,
        },
        body: body,
      });

      if (res.ok) {
        successCount++;
        // console.log(`[${i + 1}/100] Sent ${keyword} for ${userId} - OK`);
      } else {
        failCount++;
        console.error(`[${i + 1}/100] Failed: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.error("Response:", text);
      }
    } catch (err) {
      failCount++;
      console.error(`[${i + 1}/100] Error:`, err);
    }

    // Optional: Add small delay to simulate realistic traffic (e.g., 100ms)
    // 100 * 100ms = 10 seconds total run time
    await sleep(50);
    process.stdout.write(`\rProgress: ${i + 1}/100`);
  }

  console.log("\n\nLoad Test Complete!");
  console.log(`Successful Orders: ${successCount}`);
  console.log(`Failed Requests: ${failCount}`);
}

main();
