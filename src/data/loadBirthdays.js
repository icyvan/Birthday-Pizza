import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { parse as parseCsv } from "csv-parse/sync";

export function loadBirthdays(filePath) {
  const absolutePath = path.resolve(filePath);
  const extension = path.extname(absolutePath).toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    return loadFromXlsx(absolutePath);
  }

  return loadFromCsv(absolutePath);
}

function loadFromCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records.map(normalizeRecord);
}

function loadFromXlsx(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  const records = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return records.map(normalizeRecord);
}

function normalizeRecord(raw) {
  const name = String(raw.name ?? "").trim();
  const birthday = String(raw.birthday ?? "").trim();
  const chance = String(raw.chance ?? "").trim();
  const comment = String(raw.comment ?? "").trim();

  return {
    name,
    birthday,
    chance,
    comment
  };
}

