import "dotenv/config";
import { Bot } from "grammy";
import { loadBirthdays } from "./data/loadBirthdays.js";
import { buildBirthdayMessage, getTodaysBirthdays } from "./birthday/checker.js";

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const webhookSecret = process.env.WEBHOOK_SECRET;

let botInstance = null;

function getRecords() {
  return loadBirthdays(filePath);
}

function getBot() {
  if (botInstance) {
    return botInstance;
  }
  const token = process.env.BOT_TOKEN;
  if (!token) {
    return null;
  }
  const bot = new Bot(token);

  bot.command("start", (ctx) => ctx.reply("Напишите /today чтобы узнать про пиццу."));
  bot.command("today", (ctx) => {
    const todays = getTodaysBirthdays(getRecords(), new Date());
    const message = buildBirthdayMessage(todays, new Date());
    return ctx.reply(message);
  });
  bot.command("checkid", (ctx) => {
    const from = ctx.from;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ");
    const displayName = fullName || from?.username || "без имени";
    const userId = from?.id ?? "неизвестно";
    return ctx.reply(`ID: ${userId}\nИмя: ${displayName}`);
  });

  bot.catch((error) => {
    console.error("Bot error:", error);
  });

  botInstance = bot;
  return botInstance;
}

export async function handler(event) {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method && method !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const bot = getBot();
  if (!bot) {
    console.error("BOT_TOKEN не задан в окружении функции.");
    return { statusCode: 500, body: "Missing BOT_TOKEN" };
  }

  const headers = event?.headers || {};
  const secretHeader =
    headers["x-telegram-bot-api-secret-token"] ||
    headers["X-Telegram-Bot-Api-Secret-Token"];
  if (webhookSecret && secretHeader !== webhookSecret) {
    return { statusCode: 401, body: "Unauthorized" };
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

