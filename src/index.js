import "dotenv/config";
import { Bot } from "grammy";
import { loadBirthdays } from "./data/loadBirthdays.js";
import {
  buildBirthdayMessage,
  formatChance,
  getTodaysBirthdays
} from "./birthday/checker.js";
import { toDayMonthString } from "./utils/date.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN не задан в .env");
  process.exit(1);
}

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const chatId = process.env.CHAT_ID;
const dailyCheckTime = process.env.DAILY_CHECK_TIME || "09:00";

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
  const now = new Date();
  const records = getRecords();
  const datesToCheck = getDatesToCheck(now);
  const birthdays = collectBirthdaysForDates(records, datesToCheck);
  const pizzaMonday = datesToCheck.some(isFirstMonday);
  const message = buildScheduleMessage(birthdays, pizzaMonday);
  if (!message) {
    return;
  }
  await bot.api.sendMessage(chatId, message);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDatesToCheck(now) {
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 5) {
    return [addDays(now, 1), addDays(now, 2)];
  }
  return [addDays(now, 1)];
}

function collectBirthdaysForDates(records, dates) {
  return dates.flatMap((date) => {
    const matches = getTodaysBirthdays(records, date);
    return matches.map((record) => ({ ...record, date }));
  });
}

function buildScheduleMessage(items, pizzaMonday) {
  if (!items.length && !pizzaMonday) {
    return null;
  }
  const lines = [];
  if (items.length) {
    lines.push("Ближайшие дни рождения:");
    for (const item of items) {
      const chance = formatChance(item.chance);
      const dateLabel = toDayMonthString(item.date);
      lines.push(`• ${item.name} — ${dateLabel} — вероятность пиццы: ${chance}`);
    }
  }
  if (pizzaMonday) {
    lines.push("\nПицца-понедельник: в офисе покупают пиццу.");
  }
  return lines.join("\n");
}

function isFirstMonday(date) {
  return date.getDay() === 1 && date.getDate() <= 7;
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
bot.start();
