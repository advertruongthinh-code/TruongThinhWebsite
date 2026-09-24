import { createHash } from 'node:crypto';

export const sha = (value) => createHash('sha256').update(value).digest('hex');

export function csvParse(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const [head, ...body] = rows.filter((item) => item.some(Boolean));
  return body.map((item) => Object.fromEntries(head.map((key, position) => [key, item[position] ?? ''])));
}

export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const csvWrite = (columns, rows) => `${columns.join(',')}\n${rows.map((row) => columns.map((key) => csvEscape(row[key])).join(',')).join('\n')}\n`;
