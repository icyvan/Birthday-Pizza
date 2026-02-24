import "dotenv/config";
import { Bot, webhookCallback } from "grammy";
import { loadBirthdays } from "./data/loadBirthdays.js";
import { buildBirthdayMessage, getTodaysBirthdays } from "./birthday/checker.js";
import { buildUpcomingMessage } from "./birthday/schedule.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN не задан в .env");
  process.exit(1);
}

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const chatId = process.env.CHAT_ID;
const dailyCheckTime = process.env.DAILY_CHECK_TIME || "09:00";
const webhookUrl = process.env.WEBHOOK_URL;
const webhookPath = process.env.WEBHOOK_PATH || "/bot";
const webhookSecret = process.env.WEBHOOK_SECRET;
const port = Number(process.env.PORT || 3000);

function getRecords() {
  return loadBirthdays(filePath);
}

function parseDailyTime(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value).trim());
  if (!match) {
    return { hour: 9, minute: 0 };
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function getNextDelayMs(targetHour, targetMinute) {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetHour,
    targetMinute,
    0,
    0
  );
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function sendTomorrowReport() {
  if (!chatId) {
    return;
  }
  const records = getRecords();
  const message = buildUpcomingMessage(records, new Date());
  if (!message) {
    return;
  }
  await bot.api.sendMessage(chatId, message);
}

function scheduleDailyCheck() {
  if (!chatId) {
    console.warn("CHAT_ID не задан — ежедневные уведомления отключены.");
    return;
  }
  const { hour, minute } = parseDailyTime(dailyCheckTime);
  const scheduleNextRun = () => {
    const delayMs = getNextDelayMs(hour, minute);
    setTimeout(async () => {
      try {
        await sendTomorrowReport();
      } catch (error) {
        console.error("Daily check error:", error);
      }
      scheduleNextRun();
    }, delayMs);
  };
  scheduleNextRun();
}

async function startWebhookServer() {
  const { createServer } = await import("node:http");
  const callback = webhookCallback(bot, "http");

  await bot.api.setWebhook(webhookUrl, {
    secret_token: webhookSecret
  });

  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== webhookPath) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    if (webhookSecret && req.headers["x-telegram-bot-api-secret-token"] !== webhookSecret) {
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }
    await callback(req, res);
  });

  server.listen(port, () => {
    console.log(`Webhook server listening on port ${port} at ${webhookPath}`);
  });
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

scheduleDailyCheck();
if (webhookUrl) {
  startWebhookServer().catch((error) => {
    console.error("Webhook start error:", error);
    process.exit(1);
  });
} else {
  bot.start();
}
