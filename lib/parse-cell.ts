export interface ParsedCell {
  persian: string;
  roman: string;
}

export function parseCell(cell: string): ParsedCell {
  const match = cell.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { persian: match[1].trim(), roman: match[2].trim() };
  }
  return { persian: cell.trim(), roman: "" };
}

export function extractRoman(cell: string): string {
  const match = cell.match(/\(([^)]+)\)/);
  return match ? match[1] : cell;
}
