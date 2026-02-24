export function parseBirthdayDate(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split("-");
  if (parts.length !== 3) {
    return null;
  }

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { month, day, raw: trimmed };
}

export function toDayMonthString(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

export function isBirthdayToday(parsed, date) {
  if (!parsed) {
    return false;
  }
  return parsed.month === date.getMonth() + 1 && parsed.day === date.getDate();
}

