import "dotenv/config";
import { Bot } from "grammy";
import { loadBirthdays } from "./data/loadBirthdays.js";
import { buildUpcomingMessage } from "./birthday/schedule.js";

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
if (!token || !chatId) {
  throw new Error("BOT_TOKEN и CHAT_ID обязательны для отправки сообщения.");
}

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const schedulerSecret = process.env.SCHEDULER_SECRET;

function getRecords() {
  return loadBirthdays(filePath);
}

const bot = new Bot(token);

export async function handler(event) {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method && method !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = event?.headers || {};
  const authHeader = headers.authorization || headers.Authorization || "";
  const tokenHeader = headers["x-scheduler-token"] || headers["X-Scheduler-Token"];
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (schedulerSecret && tokenHeader !== schedulerSecret && bearer !== schedulerSecret) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const records = getRecords();
  const message = buildUpcomingMessage(records, new Date());
  if (!message) {
    return { statusCode: 200, body: "no notifications" };
  }

  await bot.api.sendMessage(chatId, message);
  return { statusCode: 200, body: "ok" };
}

