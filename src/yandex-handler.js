import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN не задан в окружении функции.");
}

const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("Бот работает."));

export async function handler(event) {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method && method !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!event?.body) {
    return { statusCode: 400, body: "Missing body" };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let update;
  try {
    update = JSON.parse(rawBody);
  } catch (error) {
    console.error("Invalid JSON:", error);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  try {
    await bot.handleUpdate(update);
  } catch (error) {
    console.error("Update handling failed:", error);
    return { statusCode: 500, body: "Update failed" };
  }

  return { statusCode: 200, body: "ok" };
}
