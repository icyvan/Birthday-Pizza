import { isBirthdayToday, parseBirthdayDate, toDayMonthString } from "../utils/date.js";

export function getTodaysBirthdays(records, date = new Date()) {
  return records
    .map((record) => ({
      ...record,
      parsedBirthday: parseBirthdayDate(record.birthday)
    }))
    .filter((record) => isBirthdayToday(record.parsedBirthday, date));
}

export function formatChance(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "да") {
    return "да";
  }
  if (normalized === "no" || normalized === "нет") {
    return "нет";
  }
  if (normalized === "maybe" || normalized.includes("вопрос")) {
    return "возможно";
  }
  if (!normalized) {
    return "неизвестно";
  }
  return normalized;
}

export function buildBirthdayMessage(records, date = new Date()) {
  if (!records.length) {
    return "Сегодня именинников нет.";
  }

  const dateLabel = toDayMonthString(date);
  const lines = records.map((record) => {
    const chance = formatChance(record.chance);
    return `• ${record.name} — ${dateLabel} — вероятность пиццы: ${chance}`;
  });

  return ["Сегодня день рождения:", ...lines].join("\n");
}

