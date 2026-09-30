/**
 * Minimal RFC 4180 CSV helpers (quoted fields, escaped quotes, CRLF).
 * Used by the admin bulk product editor so product details can be filled in
 * a spreadsheet instead of one form at a time.
 */

/** Parses CSV text into an array of row arrays. */
export function parseCsv(input: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/** Parses CSV text into objects keyed by the header row (lowercased, trimmed). */
export function parseCsvRecords(input: string, delimiter = ','): Array<Record<string, string>> {
  const rows = parseCsv(input, delimiter);
  if (rows.length === 0) return [];

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((cell) => cell.trim().toLowerCase());

  return body.map((cells) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      record[key] = (cells[index] ?? '').trim();
    });
    return record;
  });
}

const needsQuoting = (value: string) => /[",\n\r]/.test(value);

/** Serialises rows to CSV text. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>, delimiter = ','): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          return needsQuoting(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(delimiter),
    )
    .join('\n');
}
