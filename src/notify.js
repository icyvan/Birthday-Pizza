import "dotenv/config";
import { Bot } from "grammy";
import { loadBirthdays } from "./data/loadBirthdays.js";
import { buildUpcomingMessage } from "./birthday/schedule.js";

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
if (!token || !chatId) {
  console.error("BOT_TOKEN и CHAT_ID обязательны для отправки сообщения.");
  process.exit(1);
}

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const records = loadBirthdays(filePath);
const message = buildUpcomingMessage(records, new Date());

if (!message) {
  console.log("На ближайшую дату уведомлений нет.");
  process.exit(0);
}

const bot = new Bot(token);
await bot.api.sendMessage(chatId, message);
process.exit(0);
