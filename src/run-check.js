import "dotenv/config";
import { loadBirthdays } from "./data/loadBirthdays.js";
import { buildBirthdayMessage, getTodaysBirthdays } from "./birthday/checker.js";

function parseDateFromArg() {
  const [, , raw] = process.argv;
  if (!raw) {
    return new Date();
  }
  const parts = raw.split("-");
  if (parts.length !== 3) {
    return new Date();
  }
  const [year, month, day] = parts.map((value) => Number(value));
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

const filePath = process.env.BIRTHDAYS_FILE || "./data/birthdays.csv";
const date = parseDateFromArg();
const records = loadBirthdays(filePath);
const todays = getTodaysBirthdays(records, date);
const message = buildBirthdayMessage(todays, date);

console.log(message);

