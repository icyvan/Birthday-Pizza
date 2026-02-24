import { formatChance, getTodaysBirthdays } from "./checker.js";
import { toDayMonthString } from "../utils/date.js";

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

function isFirstMonday(date) {
  return date.getDay() === 1 && date.getDate() <= 7;
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

export function buildUpcomingMessage(records, now = new Date()) {
  const datesToCheck = getDatesToCheck(now);
  const birthdays = collectBirthdaysForDates(records, datesToCheck);
  const pizzaMonday = datesToCheck.some(isFirstMonday);
  return buildScheduleMessage(birthdays, pizzaMonday);
}

