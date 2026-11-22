/**
 * APP-CSE 2026 XLSX layout detection, validation and parsing.
 *
 * The official APP-CSE form is re-published by PS-DBM and the layout drifts
 * between revisions (extra header rows, merged cells, different casing,
 * spacing, punctuation, monthly columns labelled "Jan" / "January" /
 * "Jan Qty" / "Jan-2026", ...). Everything in this module therefore works from
 * the *header names and the structure of the sheet* instead of fixed column
 * indexes, so import + export keep working across template revisions.
 *
 * The module is dependency free (plain sheet rows / merges in, parsed records
 * out) which keeps it unit-testable from Node.
 */

export const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Short labels used by the official APP-CSE 2026 template. */
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Full labels (used when a sheet spells the months out). */
export const MONTH_FULL_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `<month>_quantity` database columns, in calendar order. */
export const MONTH_QUANTITY_COLUMNS = MONTH_KEYS.map(
  (month) => `${month}_quantity`,
) as string[];

export type AppCseColumnKey =
  | "name"
  | "code"
  | "unit"
  | "price"
  | "totalQty"
  | "totalAmount"
  | "category"
  | "stockNumber"
  | "reorderLevel"
  | "expiry"
  | "batch"
  | "rowNumber";

export interface AppCseMerge {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface AppCseSheetInput {
  name: string;
  rows: unknown[][];
  merges?: AppCseMerge[];
}

export interface AppCseLayout {
  sheetName: string;
  /** Main header row (holds labels such as "Item & Specifications"). */
  headerRow: number;
  /** Row that holds the month labels (may equal `headerRow`). */
  monthRow: number;
  /** First row that can contain inventory rows. */
  firstDataRow: number;
  /** 12 column indexes (Jan..Dec); -1 when the month could not be located. */
  monthColumns: number[];
  /** Raw header text found for each month (for logging). */
  monthLabels: string[];
  columns: Partial<Record<AppCseColumnKey, number>>;
  /** Header rows that were inspected, with their raw cell text (for logging). */
  headersUsed: { row: number; cells: string[] }[];
  warnings: string[];
  /** True when the month columns were derived from the data instead of labels. */
  monthsInferred: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Month-name matching (spacing / casing / punctuation tolerant)
// ────────────────────────────────────────────────────────────────────────────

const MONTH_ALIASES: string[][] = [
  ["january", "jan"],
  ["february", "febuary", "feb"],
  ["march", "mar"],
  ["april", "apr"],
  ["may"],
  ["june", "jun"],
  ["july", "jul"],
  ["august", "aug"],
  ["september", "sept", "sep"],
  ["october", "oct"],
  ["november", "nov"],
  ["december", "dec"],
];

/** Longest alias first so "sept" wins over "sep" and "january" over "jan". */
const MONTH_REGEXPS = MONTH_ALIASES.map(
  (aliases) =>
    new RegExp(
      `^(?:${[...aliases].sort((a, b) => b.length - a.length).join("|")})\\b`,
    ),
);

/**
 * Normalize a header cell: collapse line breaks / extra spaces, drop accents and
 * punctuation that commonly differs between template revisions.
 * `"Unit Price as of May 14, 2025"` -> `"unit price as of may 14 2025"`.
 */
export function normalizeHeaderText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return (MONTH_FULL_LABELS[value.getMonth()] || "").toLowerCase();
  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._:/\\()[\]{}"'`*·•]+/g, " ")
    .replace(/[-\u2010-\u2015]+/g, " ")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns 0..11 for a month header, -1 when the cell is not a month label. */
export function monthIndexFromHeader(value: unknown): number {
  if (value instanceof Date) return value.getMonth();
  if (typeof value === "number") return -1; // plain numbers are ambiguous (data inference handles them)
  const text = normalizeHeaderText(value);
  if (!text || text.length > 40) return -1;
  for (let month = 0; month < 12; month++) {
    if (MONTH_REGEXPS[month].test(text)) return month;
  }
  return -1;
}

/** Quarter labels ("Q1", "Q1 AMOUNT", "1st Quarter") are skipped on purpose. */
const QUARTER_HINT = /^(q[1-4]\b|[1-4](st|nd|rd|th)? quarter)/;

/** Classify a header cell into a known APP-CSE column, or null. */
export function classifyAppCseHeader(value: unknown): AppCseColumnKey | null {
  const text = normalizeHeaderText(value);
  if (!text || text.length > 90) return null;
  if (monthIndexFromHeader(value) >= 0) return null; // months are handled separately
  if (QUARTER_HINT.test(text)) return null;
  if (/^(note|reminder|introduction|disclaimer)\b/.test(text)) return null;
  // Ignore the agency / signature form fields that live above the table.
  if (
    /(department|bureau|office|region|organization|agency|contact|position|address|mail|telephone|mobile|fund cluster|prepared|certified|approved|supply officer|accountant|head of|uacs)/.test(
      text,
    )
  ) {
    return null;
  }
  if (
    text === "#" ||
    /^(no|sn|number)$/.test(text) ||
    /^row (no|number)$/.test(text)
  )
    return "rowNumber";
  if (
    /\b(code|barcode|sku)\b/.test(text) ||
    /stock (no|number)/.test(text) ||
    /\bps dbm\b/.test(text) ||
    /catalog(ue)? (no|number|code)/.test(text)
  )
    return "code";
  if (
    /unit price|unit cost|\bprice\b|\bcost\b|\brate\b|amount per (unit|piece)/.test(
      text,
    )
  )
    return "price";
  if (/total amount|total cost|\bamount\b/.test(text)) return "totalAmount";
  if (
    /total (qty|quantity)|quantity for the year|annual (qty|quantity)|\bqty\b|\bquantity\b|^total$/.test(
      text,
    )
  )
    return "totalQty";
  if (/unit of (measure|issue)|\buom\b|^unit\b|^measure$/.test(text))
    return "unit";
  if (/reorder/.test(text)) return "reorderLevel";
  if (/expir/.test(text)) return "expiry";
  if (/\bbatch(es)?\b|lot (no|number)/.test(text)) return "batch";
  if (
    /\bcategor|\bclassification\b|\bsection\b|\bgroup\b|\bclass\b|\bcluster\b/.test(
      text,
    )
  )
    return "category";
  if (
    /\bitems?\b|\bspecification|\bdescription\b|\bparticulars\b|\bproduct name\b|\bname of (item|product|supply)\b|^name$|\barticle\b|\binventory item\b/.test(
      text,
    )
  )
    return "name";
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Cell helpers
// ────────────────────────────────────────────────────────────────────────────

const EXCEL_EPOCH_OFFSET_DAYS = 25569; // 1970-01-01 as an Excel serial
const MS_PER_DAY = 86400000;

export function excelSerialFromDate(date: Date): number {
  return date.getTime() / MS_PER_DAY + EXCEL_EPOCH_OFFSET_DAYS;
}

/** Tolerant number parse: "1,234.56", "(1 234,56)", "Php 1,200", "12 pcs", dates. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    const serial = excelSerialFromDate(value);
    return Number.isFinite(serial) ? serial : 0;
  }
  if (value === null || value === undefined) return 0;
  let text = String(value).trim();
  if (!text) return 0;
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[^\d.,-]/g, "");
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators present: the right-most one is the decimal separator.
    text =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = text.length - lastComma - 1;
    text =
      decimals === 3 && text.length > 4
        ? text.replace(/,/g, "")
        : text.replace(",", ".");
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, " ").trim();
}

/** "1", "12" or "-" alone are row numbers / placeholders, not item names. */
export function isPlaceholder(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (/^-+$/.test(text)) return true;
  return /^\d{1,2}$/.test(text);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Excel date serials stored as text (e.g. 45891) or date-like text (8-2-2026). */
export function isDateLike(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (/^\d{4,6}$/.test(text)) {
    const serial = Number(text);
    return serial > 30000 && serial < 60000;
  }
  return /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(text);
}

/** Values that look like a PS-DBM / UNSPSC style item code. */
export function isCodeLike(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > 40) return false;
  if (/\s{2,}/.test(text)) return false;
  return /^[A-Z0-9][A-Z0-9\-. /|_]{2,}$/i.test(text) && /\d/.test(text);
}

const SUMMARY_ROW_RE =
  /^(a|b|c|d|e)\.\s|^(total|grand total|subtotal|approved budget)\b|^total amount|we hereby warrant|additional provision|approved budget by the agency head/i;
const FORM_LABEL_RE =
  /(date prepared|prepared by|prepared,|certified|certifying|approved by|approved,|property\/supply officer|accountant|budget officer|head of office|head of agency|funds available|in figures and words|signature|reminders?$|introduction$)/i;

/** Summary / footer text rows (A–E totals, "We hereby warrant", signatures …). */
export function isSummaryOrFooterRow(values: string[]): boolean {
  const joined = values.filter(Boolean).join(" ");
  if (!joined) return false;
  return SUMMARY_ROW_RE.test(joined) || FORM_LABEL_RE.test(joined);
}

// ────────────────────────────────────────────────────────────────────────────
// Header-block detection
// ────────────────────────────────────────────────────────────────────────────

interface HeaderScan {
  score: number;
  monthCount: number;
  monthColumns: number[];
  monthLabels: string[];
  monthRow: number;
  columns: Partial<Record<AppCseColumnKey, number>>;
  priorities: Partial<Record<AppCseColumnKey, number>>;
}

function emptyScan(): HeaderScan {
  return {
    score: 0,
    monthCount: 0,
    monthColumns: Array(12).fill(-1),
    monthLabels: Array(12).fill(""),
    monthRow: -1,
    columns: {},
    priorities: {},
  };
}

/**
 * How specific a matching label is. Needed because one sheet can use several
 * labels for the same concept, e.g. "Monthly Quantity Requirement" (the Jan–Dec
 * block header) and "Total Quantity for the year" (column Y) both match
 * "quantity": the specific one must win.
 */
function labelPriority(key: AppCseColumnKey, value: unknown): number {
  const text = normalizeHeaderText(value);
  switch (key) {
    case "name":
      // "Product Name" / "Name" is more specific than "Description".
      if (
        /^(name|product name|item name|item and specifications?|item specifications?|name of (item|product|supply)|inventory item)/.test(
          text,
        )
      )
        return 4;
      if (/\bitems?\b/.test(text)) return 3;
      if (/specification|description|particulars|article/.test(text)) return 2;
      return 1;
    case "totalQty":
      if (
        /total (qty|quantity)|quantity for the year|annual (qty|quantity)/.test(
          text,
        )
      )
        return 3;
      if (/monthly/.test(text)) return 1;
      return 2;
    case "totalAmount":
      return /total/.test(text) ? 2 : 1;
    case "price":
      if (/unit (price|cost)|\bcost\b/.test(text)) return 3;
      if (/\bprice\b/.test(text)) return 2;
      return 1;
    default:
      return 2;
  }
}

/** Analyze a single row: month labels (pass 1) + recognised field labels (pass 2). */
function scanHeaderRow(row: unknown[]): HeaderScan {
  const scan = emptyScan();
  const monthColumns = new Set<number>();
  for (let c = 0; c < row.length; c++) {
    const month = monthIndexFromHeader(row[c]);
    if (month < 0) continue;
    monthColumns.add(c);
    if (scan.monthColumns[month] < 0) {
      scan.monthColumns[month] = c;
      scan.monthLabels[month] = toText(row[c]);
      scan.monthCount += 1;
    }
  }
  for (let c = 0; c < row.length; c++) {
    if (monthColumns.has(c)) continue;
    const key = classifyAppCseHeader(row[c]);
    if (!key) continue;
    const priority = labelPriority(key, row[c]);
    const current = scan.priorities[key];
    if (current === undefined || priority > current) {
      scan.columns[key] = c;
      scan.priorities[key] = priority;
    }
  }
  scan.score = scoreColumns(scan.columns, scan.monthCount);
  return scan;
}

function scoreColumns(
  columns: Partial<Record<AppCseColumnKey, number>>,
  monthCount: number,
): number {
  let score = monthCount * 2;
  if (columns.name !== undefined) score += 5;
  if (columns.unit !== undefined) score += 2;
  if (columns.code !== undefined) score += 2;
  if (columns.price !== undefined) score += 2;
  if (columns.totalQty !== undefined) score += 1;
  if (columns.totalAmount !== undefined) score += 1;
  if (columns.rowNumber !== undefined) score += 1;
  return score;
}

/**
 * A row can take part in a header block when it holds no numbers and carries at
 * least two recognizable labels (this keeps data rows out of the block).
 */
function isHeaderishRow(row: unknown[] | undefined): boolean {
  if (!row || !row.length) return false;
  let labels = 0;
  let text = false;
  for (const cell of row) {
    if (typeof cell === "number" && Number.isFinite(cell)) return false;
    if (cell instanceof Date) return false;
    if (toText(cell)) text = true;
    if (classifyAppCseHeader(cell) !== null || monthIndexFromHeader(cell) >= 0)
      labels += 1;
  }
  return text && labels >= 2;
}

/**
 * Merge up to 3 consecutive header rows. APP-CSE uses a two-row header: the top
 * row carries the merged titles ("Unit Price …", "Monthly Quantity
 * Requirement"), the sub-header row carries "#", "Code", "Unit" and the month
 * names. Later rows win for the identifying columns because they are the most
 * specific ("Item & Specifications" -> "Item").
 */
function scanHeaderBlock(
  rows: unknown[][],
  start: number,
): { scan: HeaderScan; blockRows: number[] } {
  const scan = emptyScan();
  const blockRows: number[] = [];
  for (let r = start; r <= Math.min(start + 2, rows.length - 1); r++) {
    const row = rows[r];
    if (!isHeaderishRow(row)) break;
    const rowScan = scanHeaderRow(row);
    if (
      blockRows.length &&
      rowScan.monthCount === 0 &&
      scoreColumns(rowScan.columns, 0) === 0
    )
      break;
    for (let month = 0; month < 12; month++) {
      if (scan.monthColumns[month] < 0 && rowScan.monthColumns[month] >= 0) {
        scan.monthColumns[month] = rowScan.monthColumns[month];
        scan.monthLabels[month] = rowScan.monthLabels[month];
        scan.monthCount += 1;
        scan.monthRow = r;
      }
    }
    for (const [key, col] of Object.entries(rowScan.columns) as [
      AppCseColumnKey,
      number,
    ][]) {
      const priority = rowScan.priorities[key] ?? 0;
      const current = scan.priorities[key];
      const identifying = key === "name" || key === "code";
      if (
        current === undefined ||
        priority > current ||
        (identifying && priority >= current)
      ) {
        scan.columns[key] = col;
        scan.priorities[key] = priority;
      }
    }
    scan.score = scoreColumns(scan.columns, scan.monthCount) + blockRows.length;
    blockRows.push(r);
  }
  return { scan, blockRows };
}

// ────────────────────────────────────────────────────────────────────────────
// Layout detection entry point
// ────────────────────────────────────────────────────────────────────────────

const HEADER_SCAN_LIMIT = 80;
/** name (5) + at least one more recognized column (2) */
const MIN_HEADER_SCORE = 7;

export interface InferredMonths {
  monthColumns: number[];
  reason: string;
}

/**
 * Fallback used when the month labels cannot be read (blank sub-header row,
 * renamed columns …): locate the month block from the shape of the data instead.
 * Month cells are small integers, so the months form a contiguous run of numeric
 * columns whose length is `months × (quantity + amount)`.
 */
export function inferMonthColumnsFromData(
  rows: unknown[][],
  layout: AppCseLayout,
): InferredMonths | null {
  const start = Math.max(0, layout.firstDataRow);
  const numericPerRow: { numeric: number; nonEmpty: number }[] = [];
  const numericPerColumn: number[] = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r] || [];
    let numeric = 0;
    let nonEmpty = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === null || cell === undefined || cell === "") continue;
      nonEmpty += 1;
      if (typeof cell === "number" && Number.isFinite(cell)) {
        numeric += 1;
        numericPerColumn[c] = (numericPerColumn[c] || 0) + 1;
      }
    }
    numericPerRow.push({ numeric, nonEmpty });
  }
  const recordRowIndexes = numericPerRow
    .map((entry, index) => ({ ...entry, index }))
    .filter(
      (entry) => entry.numeric >= 4 && entry.numeric >= entry.nonEmpty - 3,
    )
    .map((entry) => start + entry.index);
  if (recordRowIndexes.length < 5) return null;

  const threshold = Math.max(2, Math.floor(recordRowIndexes.length * 0.5));
  const valueColumns: number[] = [];
  for (let c = 0; c < numericPerColumn.length; c++) {
    if ((numericPerColumn[c] || 0) >= threshold) valueColumns.push(c);
  }
  if (valueColumns.length < 15) return null;

  // Longest contiguous run of numeric columns.
  let bestRun: number[] = [];
  let current: number[] = [];
  for (const c of valueColumns) {
    if (current.length && c !== current[current.length - 1] + 1) {
      if (current.length > bestRun.length) bestRun = current;
      current = [];
    }
    current.push(c);
  }
  if (current.length > bestRun.length) bestRun = current;
  if (bestRun.length < 15) return null;
  const runStart = bestRun[0];
  const runEnd = bestRun[bestRun.length - 1];

  // Columns that hold quantities/amounts but are not months (row no., code …).
  const columnsBefore = valueColumns.filter((c) => c < runStart).length;
  if (columnsBefore < 2 || columnsBefore > 8) return null;
  if (runStart + columnsBefore * 2 + 11 > runEnd) return null;

  const monthColumns = Array.from(
    { length: 12 },
    (_, m) => runStart + columnsBefore * 2 + m,
  );
  // Plausibility check: the inferred month cells must look like small integers.
  let numeric = 0;
  let integral = 0;
  for (const r of recordRowIndexes.slice(0, 25)) {
    for (const c of monthColumns) {
      const cell = (rows[r] || [])[c];
      if (typeof cell === "number" && Number.isFinite(cell)) {
        numeric += 1;
        if (Number.isInteger(cell) && Math.abs(cell) < 1e7) integral += 1;
      }
    }
  }
  if (numeric < 6 || integral / numeric < 0.6) return null;
  return {
    monthColumns,
    reason: `${bestRun.length} numeric columns (${runStart + 1}-${runEnd + 1}) with ${columnsBefore} text columns before them`,
  };
}

export function detectAppCseLayout(input: AppCseSheetInput): AppCseLayout {
  // Merged ranges only carry their value in the top-left cell, which is exactly
  // what the scanner needs: a merged section title ("PART I �", a category row)
  // then shows up as a single filled value, and a merged header ("Item &
  // Specifications" over A:C) is completed by the column-profiling fallbacks
  // below when the label sits left of the real data column.
  const rows = input.rows || [];
  const headersUsed: { row: number; cells: string[] }[] = [];
  const warnings: string[] = [];

  let best: { scan: HeaderScan; blockRows: number[] } | null = null;
  const limit = Math.min(rows.length, HEADER_SCAN_LIMIT);
  for (let start = 0; start < limit; start++) {
    const block = scanHeaderBlock(rows, start);
    if (!block.blockRows.length) continue;
    const { scan } = block;
    if (scan.score < MIN_HEADER_SCORE) continue;
    if (scan.monthCount < 3 && scan.columns.name === undefined) continue;
    if (
      !best ||
      scan.score > best.scan.score ||
      (scan.score === best.scan.score &&
        block.blockRows.length > best.blockRows.length)
    ) {
      best = block;
    }
  }

  if (!best) {
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      headersUsed.push({
        row: r,
        cells: (rows[r] || []).slice(0, 32).map((c) => toText(c)),
      });
    }
    return {
      sheetName: input.name,
      headerRow: -1,
      monthRow: -1,
      firstDataRow: 0,
      monthColumns: Array(12).fill(-1),
      monthLabels: Array(12).fill(""),
      columns: {},
      headersUsed,
      warnings,
      monthsInferred: false,
    };
  }

  const { scan, blockRows } = best;
  blockRows.forEach((r) =>
    headersUsed.push({
      row: r,
      cells: (rows[r] || []).slice(0, 32).map((c) => toText(c)),
    }),
  );
  const lastRow = blockRows[blockRows.length - 1];

  const layout: AppCseLayout = {
    sheetName: input.name,
    headerRow: blockRows[0],
    monthRow: scan.monthRow >= 0 ? scan.monthRow : lastRow,
    firstDataRow: lastRow + 1,
    monthColumns: [...scan.monthColumns],
    monthLabels: [...scan.monthLabels],
    columns: { ...scan.columns },
    headersUsed,
    warnings,
    monthsInferred: false,
  };

  if (scan.monthCount < 12) {
    const inferred = inferMonthColumnsFromData(rows, layout);
    if (inferred) {
      layout.monthColumns = inferred.monthColumns;
      layout.monthLabels = inferred.monthColumns.map(
        (c, m) => scan.monthLabels[m] || `${MONTH_LABELS[m]} (col ${c + 1})`,
      );
      layout.monthsInferred = true;
      warnings.push(
        `Month columns (Jan-Dec) were inferred from the data layout because the header labels could not be read: ${inferred.reason}. ` +
          `Using columns ${inferred.monthColumns.map((c) => c + 1).join(", ")}.`,
      );
    } else {
      warnings.push(
        scan.monthCount > 0
          ? `Only ${scan.monthCount} of the 12 month columns (Jan-Dec) could be detected from the header labels.`
          : "No month columns (Jan-Dec) were detected in the header.",
      );
    }
  }

  // Last resort: an unlabeled wide text column often holds the item name.
  const nameColumnIsWeak =
    layout.columns.name === undefined ||
    isPlaceholderColumn(rows, layout, layout.columns.name);
  if (nameColumnIsWeak) {
    const guessedName = guessItemNameColumn(rows, layout);
    if (guessedName >= 0 && guessedName !== layout.columns.name) {
      warnings.push(
        layout.columns.name === undefined
          ? `The item name column was not labeled; using column ${guessedName + 1} (longest text values).`
          : `Column ${layout.columns.name + 1} only holds row numbers; using column ${guessedName + 1} as the item name column.`,
      );
      layout.columns.name = guessedName;
    }
  }
  // The official template does not label the code column (only the merged
  // "Item & Specifications" block, the unit, the months and the totals).
  if (layout.columns.code === undefined) {
    const guessedCode = guessCodeColumn(rows, layout);
    if (guessedCode >= 0) {
      layout.columns.code = guessedCode;
      warnings.push(
        `The code/barcode column was not labeled; using column ${guessedCode + 1} (values look like item codes).`,
      );
    }
  }
  return layout;
}

/** Column holding the item names — dense text column with the longest values. */
export function guessItemNameColumn(
  rows: unknown[][],
  layout: AppCseLayout,
): number {
  const skip = new Set<number>([
    ...layout.monthColumns.filter((c) => c >= 0),
    ...(layout.columns.rowNumber !== undefined
      ? [layout.columns.rowNumber]
      : []),
    ...(layout.columns.unit !== undefined ? [layout.columns.unit] : []),
    ...(layout.columns.code !== undefined ? [layout.columns.code] : []),
    ...(layout.columns.category !== undefined ? [layout.columns.category] : []),
  ]);
  const end = Math.min(rows.length, layout.firstDataRow + 60);
  // Section / category rows hold a single merged text value; they must not win
  // just because their label is long.
  const recordRows: number[] = [];
  for (let r = layout.firstDataRow; r < end; r++) {
    const filled = (rows[r] || []).map((cell) => toText(cell)).filter(Boolean);
    if (filled.length < 3) continue;
    recordRows.push(r);
  }
  if (recordRows.length < 3) return -1;
  const maxColumn = rows.reduce(
    (max, row) => Math.max(max, (row || []).length),
    0,
  );
  let bestColumn = -1;
  let bestScore = 0;
  for (let c = 0; c < maxColumn; c++) {
    if (skip.has(c)) continue;
    let characters = 0;
    let filled = 0;
    for (const r of recordRows) {
      const cell = (rows[r] || [])[c];
      const text = toText(cell);
      if (!text || /^\d+$/.test(text)) continue;
      characters += text.length;
      filled += 1;
    }
    // Names are present on (almost) every record row, hence the density check.
    if (filled < 3 || filled / recordRows.length < 0.6) continue;
    const score = characters * (filled / recordRows.length);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = c;
    }
  }
  return bestColumn;
}

/**
 * True when a column mostly holds placeholders (row numbers such as 1, 2, 3 …).
 * The APP-CSE template merges "Item & Specifications" across A:C, so the header
 * label points at the "#" column while the real names live in the last sub-column.
 */
function isPlaceholderColumn(
  rows: unknown[][],
  layout: AppCseLayout,
  column: number,
): boolean {
  let placeholders = 0;
  let filled = 0;
  const end = Math.min(rows.length, layout.firstDataRow + 60);
  for (let r = layout.firstDataRow; r < end; r++) {
    const row = rows[r] || [];
    // Only record rows count: part / category / summary rows carry a single
    // merged label in column 0 and would otherwise hide the row numbers.
    if (row.map((cell) => toText(cell)).filter(Boolean).length < 3) continue;
    const cell = row[column];
    const text = toText(cell);
    if (!text) continue;
    filled += 1;
    if (typeof cell === "number" && Number.isInteger(cell)) placeholders += 1;
    else if (isPlaceholder(text)) placeholders += 1;
  }
  return filled >= 3 && placeholders / filled > 0.5;
}

/**
 * Column holding PS-DBM style item codes. Used when the template revision does
 * not label the code column (the official APP-CSE 2026 file only labels the
 * months, the merged item block and the price/total columns).
 */
export function guessCodeColumn(
  rows: unknown[][],
  layout: AppCseLayout,
): number {
  const nameCol = layout.columns.name;
  const skip = new Set<number>([
    ...layout.monthColumns.filter((c) => c >= 0),
    ...(layout.columns.unit !== undefined ? [layout.columns.unit] : []),
    ...(layout.columns.rowNumber !== undefined
      ? [layout.columns.rowNumber]
      : []),
    ...(layout.columns.price !== undefined ? [layout.columns.price] : []),
    ...(layout.columns.totalQty !== undefined ? [layout.columns.totalQty] : []),
    ...(layout.columns.totalAmount !== undefined
      ? [layout.columns.totalAmount]
      : []),
    ...(nameCol !== undefined ? [nameCol] : []),
  ]);
  const maxColumn = rows.reduce(
    (max, row) => Math.max(max, (row || []).length),
    0,
  );
  const end = Math.min(rows.length, layout.firstDataRow + 200);
  let bestColumn = -1;
  let bestRatio = 0.6; // at least 60% of the values must look like codes
  for (let c = 0; c < maxColumn; c++) {
    // Item codes always sit to the left of the item name in the APP-CSE form.
    if (skip.has(c) || (nameCol !== undefined && c > nameCol)) continue;
    let filled = 0;
    let codeLike = 0;
    let integers = 0;
    for (let r = layout.firstDataRow; r < end; r++) {
      const cell = (rows[r] || [])[c];
      const text = toText(cell);
      if (!text) continue;
      filled += 1;
      if (typeof cell === "number" && Number.isInteger(cell)) integers += 1;
      if (isCodeLike(text)) codeLike += 1;
    }
    if (filled < 3) continue;
    if (integers / filled > 0.9) continue; // a plain counter such as the "#" column
    const ratio = codeLike / filled;
    if (
      ratio > bestRatio + 0.05 ||
      (Math.abs(ratio - bestRatio) <= 0.05 && c > bestColumn)
    ) {
      bestRatio = ratio;
      bestColumn = c;
    }
  }
  return bestColumn;
}

// ────────────────────────────────────────────────────────────────────────────
// Layout detection
// ────────────────────────────────────────────────────────────────────────────

/**
 * Score every header cell against every APP-CSE column so the *most specific*
 * label wins. "Monthly Quantity Requirement" (score 2 for totalQty) therefore
 * never beats "Total Quantity for the year" (score 4).
 */
function scoreHeaderCell(
  value: unknown,
): { key: AppCseColumnKey; score: number }[] {
  const text = normalizeHeaderText(value);
  const scores: { key: AppCseColumnKey; score: number }[] = [];
  if (!text || text.length > 90) return scores;
  if (monthIndexFromHeader(value) >= 0) return scores; // month handled separately
  if (QUARTER_HINT.test(text)) return scores;
  if (/^(note|reminders?|introduction|disclaimer)\b/.test(text)) return scores;
  if (
    /(department|bureau|office of|region|organization|agency code|contact person|position|address|mail|telephone|mobile|fund cluster|prepared|certified|approved|supply officer|accountant|head of)/.test(
      text,
    )
  ) {
    return scores;
  }

  const add = (key: AppCseColumnKey, score: number) => {
    if (score > 0) scores.push({ key, score });
  };

  // ── Unit price (checked first: "Unit Price" also contains "unit") ──
  if (/^unit price/.test(text) || /^unit cost/.test(text)) add("price", 5);
  if (/acquisition cost|acquisition price/.test(text)) add("price", 5);
  if (/^(price|cost|rate)$/.test(text) || /unit price as of/.test(text))
    add("price", 4);
  if (/\b(price|cost)\b/.test(text) && !/\bamount\b/.test(text))
    add("price", 3);

  // ── Total amount ──
  if (/^total amount/.test(text) || /^amount$/.test(text))
    add("totalAmount", 4);
  if (/\bamount\b/.test(text)) add("totalAmount", 2);

  // ── Total quantity for the year ──
  if (/^total (quantity|qty)/.test(text)) add("totalQty", 5);
  if (/quantity for the year|annual (quantity|qty)|for the year/.test(text))
    add("totalQty", 4);
  if (/^(quantity|qty|on hand|available|balance)$/.test(text))
    add("totalQty", 3);
  if (/\bquantity\b|\bqty\b/.test(text)) add("totalQty", 2);

  // ── Unit of measure ──
  if (/^unit of (measure|issue)|^uom$/.test(text)) add("unit", 4);
  if (/^unit$|^unit\b/.test(text)) add("unit", 2);
  if (/^measure$/.test(text)) add("unit", 2);

  // ── Code / barcode ──
  if (/barcode/.test(text)) add("code", 4);
  if (/^code$|\bcode\b/.test(text)) add("code", 3);
  if (
    /\bsku\b|stock (no|number)|\barticle no\b|catalog(ue)? (no|number)/.test(
      text,
    )
  )
    add("code", 3);
  if (/\bps dbm\b|\bpsdbm\b/.test(text)) add("code", 2);

  // ── Row number ──
  if (
    text === "#" ||
    text === "no" ||
    /^(no|number|sn)$/.test(text) ||
    /^row (no|number)$/.test(text)
  )
    add("rowNumber", 3);

  // ── Stock number / reorder / expiry / batch ──
  if (/stock (no|number)/.test(text)) add("stockNumber", 3);
  if (/reorder|minimum (stock|level)|safety stock/.test(text))
    add("reorderLevel", 3);
  if (/expir|valid until|best before/.test(text)) add("expiry", 3);
  if (/\bbatch(es)?\b|lot (no|number)/.test(text)) add("batch", 2);

  // ── Category ──
  if (
    /^categor|^classification$|^class$|^group$|^section$|^cluster$/.test(text)
  )
    add("category", 3);
  if (/^type$|item type/.test(text)) add("category", 2);

  // ── Item name (last: "Unit Price" style labels were already handled) ──
  if (
    /item\s*(and|&)\s*specification|item and specifications|^items? and specifications$/.test(
      text,
    )
  )
    add("name", 5);
  if (
    /^(item|items)$|^item name$|^name of (item|product|supply)s?$|^product name$|^inventory item$|^particulars$/.test(
      text,
    )
  )
    add("name", 4);
  if (/^description$|^specification$|^specifications$|^product$/.test(text))
    add("name", 3);
  if (/\bitem\b|\bspecification|\bdescription\b/.test(text)) add("name", 2);

  return scores;
}

/** Merged range lookup: the value in the top-left cell applies to the whole range. */
export function expandMerges(
  rows: unknown[][],
  merges: AppCseMerge[] = [],
): unknown[][] {
  if (!merges.length) return rows;
  const expanded = rows.map((row) => row.slice());
  for (const merge of merges) {
    const value = expanded[merge.s.r]?.[merge.s.c];
    if (value === undefined || value === null || value === "") continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      if (!expanded[r]) expanded[r] = [];
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue;
        const current = expanded[r][c];
        if (current === undefined || current === null || current === "")
          expanded[r][c] = value;
      }
    }
  }
  return expanded;
}

/** Columns of the Jan..Dec block, accounting for Q1..Q4 (and AMOUNT) columns. */
function projectMonthColumns(base: number, gaps: number): number[] {
  return MONTH_KEYS.map(
    (_, month) => base + month + gaps * Math.floor(month / 3),
  );
}

/**
 * Fill in months that carry no (recognisable) label by validating the detected
 * months against the APP-CSE month/quarter rhythm. Nothing is guessed when the
 * detected months do not line up, so other templates are left untouched.
 */
function inferMonthColumns(
  mapped: Map<number, number>,
  columnLimit: number,
): { columns: number[]; inferred: boolean } {
  const columns = Array<number>(12).fill(-1);
  if (!mapped.size) return { columns, inferred: false };
  for (const [column, month] of mapped) columns[month] = column;
  if (mapped.size === 12) return { columns, inferred: false };

  const entries = [...mapped.entries()].sort((a, b) => a[0] - b[0]);
  const firstColumn = entries[0][0];
  const firstMonth = entries[0][1];
  for (let gaps = 0; gaps <= 4; gaps++) {
    const base = firstColumn - (firstMonth + gaps * Math.floor(firstMonth / 3));
    if (base < 0) continue;
    const projected = projectMonthColumns(base, gaps);
    if (projected[11] > columnLimit + 12) continue; // projects too far to the right
    const aligned = entries.every(
      ([column, month]) => projected[month] === column,
    );
    if (!aligned) continue;
    let inferred = false;
    for (let month = 0; month < 12; month++) {
      if (columns[month] < 0) {
        columns[month] = projected[month];
        inferred = true;
      }
    }
    return { columns, inferred };
  }
  return { columns, inferred: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Validation (clear, specific messages)
// ────────────────────────────────────────────────────────────────────────────

const COLUMN_LABELS: Record<AppCseColumnKey, string> = {
  name: "Item & Specifications (item name)",
  code: "Code / Barcode",
  unit: "Unit of Measure",
  price: "Unit Price",
  totalQty: "Total Quantity for the year",
  totalAmount: "Total Amount for the year",
  category: "Category",
  stockNumber: "Stock Number",
  reorderLevel: "Reorder Level",
  expiry: "Expiration Date",
  batch: "Batch",
  rowNumber: "# (row number)",
};

export interface AppCseValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Human readable list of the columns that were detected. */
  detected: string[];
}

export interface AppCseValidationOptions {
  /** When true the Jan–Dec columns are mandatory (APP-CSE 2026 template mode). */
  requireMonths?: boolean;
  /** Only validate the columns this import actually consumes. */
  requiredColumns?: AppCseColumnKey[];
}

export function validateAppCseLayout(
  layout: AppCseLayout,
  options: AppCseValidationOptions = {},
): AppCseValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const detected: string[] = [];

  const monthCount = layout.monthColumns.filter((c) => c >= 0).length;
  for (const [key, column] of Object.entries(layout.columns) as [
    AppCseColumnKey,
    number,
  ][]) {
    detected.push(`${COLUMN_LABELS[key] ?? key} = column ${column + 1}`);
  }
  if (monthCount) {
    detected.push(
      `Monthly quantities (Jan–Dec) = columns ${layout.monthColumns.map((c) => c + 1).join(", ")}` +
        (layout.monthsInferred ? " (inferred)" : ""),
    );
  }

  if (layout.headerRow < 0) {
    errors.push(
      `No inventory table header could be detected in sheet "${layout.sheetName}". ` +
        `Expected a header row with an item name column (for example "Item & Specifications", "Item name" or "Product Name") ` +
        `and, for the APP-CSE 2026 template, "Unit" plus the Jan–Dec monthly quantity columns. ` +
        `Header rows inspected: ${layout.headersUsed.map((entry) => entry.row + 1).join(", ") || "none"}. ` +
        `Detected columns: ${detected.length ? detected.join("; ") : "none"}.`,
    );
    return { ok: false, errors, warnings, detected };
  }

  const required = new Set<AppCseColumnKey>(
    options.requiredColumns ?? ["name"],
  );
  for (const key of required) {
    if (layout.columns[key] === undefined) {
      errors.push(
        `Missing required column: ${COLUMN_LABELS[key]}. ` +
          `Detected columns: ${detected.length ? detected.join("; ") : "none"} ` +
          `(header row ${layout.headerRow + 1}${layout.monthRow !== layout.headerRow ? `, sub-header row ${layout.monthRow + 1}` : ""}).`,
      );
    }
  }

  if (options.requireMonths) {
    const missing = MONTH_LABELS.filter(
      (_, month) => layout.monthColumns[month] < 0,
    );
    if (missing.length) {
      errors.push(
        `Missing monthly quantity columns: ${missing.join(", ")}. ` +
          `Found ${monthCount} of 12 month columns (Jan–Dec). Expected a "Monthly Quantity Requirement" block with one column per month ` +
          `inside the APP-CSE 2026 template. Detected columns: ${detected.join("; ")}.`,
      );
    }
  } else if (monthCount < 12) {
    warnings.push(
      `Only ${monthCount} of the 12 monthly quantity columns (Jan–Dec) were detected; missing months are imported as 0. ` +
        (layout.monthsInferred
          ? "The month columns were inferred from the data layout."
          : `Checked header rows ${layout.headersUsed.map((entry) => entry.row + 1).join(", ") || "none"}.`),
    );
  }

  if (layout.columns.unit === undefined) {
    warnings.push(
      `No "${COLUMN_LABELS.unit}" column was found; imported items use "pcs" as their unit.`,
    );
  }
  if (layout.columns.price === undefined) {
    warnings.push(
      `No "${COLUMN_LABELS.price}" column was found; imported items use 0 as their unit price.`,
    );
  }
  warnings.push(...layout.warnings);

  return { ok: errors.length === 0, errors, warnings, detected };
}

// ────────────────────────────────────────────────────────────────────────────
// Row parsing
// ────────────────────────────────────────────────────────────────────────────

const PART_TWO_RE = /\bPART\s+(II|2|TWO)\b/i;
const PART_ONE_RE = /\bPART\s+(I|1|ONE)\b(?!\s*(I|V|X))/i;
const SKIP_NAME_RE =
  /^(total|grand total|subtotal|part\s+(i|ii|1|2)\b|date prepared|prepared by|prepared,|certified|approved|we hereby|property\/supply|accountant|budget officer|head of office|head of agency|note\s*:|reminder|introduction|engr\.|mr\.|mrs\.|ms\.|dr\.|atty\.|cpa\.)/i;
/** Certification / signature block — nothing below it is inventory data. */
const FOOTER_RE =
  /we hereby warrant|prepared by\s*:|certified funds available|certified appropriate|approved by\s*:|property\/supply officer|date prepared\s*:|in figures and words/i;

export interface AppCseParsedItem {
  name: string;
  description: string | null;
  code: string;
  unit: string;
  quantity: number;
  acquisition_cost: number;
  category: string;
  /** 12 monthly quantities, Jan..Dec. */
  monthly: number[];
  part: 1 | 2;
  sourceRow: number;
}

export interface AppCseParseOptions {
  partOneCategory?: string;
  partTwoCategory?: string;
  /** Safety valve for very large sheets. */
  maxItems?: number;
}

export interface AppCseParseResult {
  items: AppCseParsedItem[];
  skipped: number;
  duplicates: number;
  warnings: string[];
  partOne: number;
  partTwo: number;
}

/** Strip "(Note: …)" and trailing separators from a category/section label. */
export function cleanCategoryLabel(value: string): string {
  return value
    .split(/\r?\n/)[0]
    .replace(/\(note:[^)]*\)/gi, "")
    .replace(/\bnote\s*:.*$/i, "")
    .replace(/[:;,\s]+$/, "")
    .trim();
}

/** Merged, single-value rows such as "ALCOHOL OR ACETONE" are category headers. */
export function isCategoryHeaderRow(value: string): boolean {
  const text = cleanCategoryLabel(value);
  if (text.length < 4 || text.length > 70) return false;
  if (isDateLike(text) || isUuid(text) || /^[\d\s.,%-]+$/.test(text))
    return false;
  if (isSummaryOrFooterRow([text])) return false;
  if (
    /(note:|please|refer|consistent with|we hereby|in figures|annex|circular)/i.test(
      text,
    )
  )
    return false;
  return text.split(/\s+/).filter(Boolean).length <= 8;
}

function guessNameFromRow(texts: string[], layout: AppCseLayout): string {
  const skip = new Set<number>([
    ...layout.monthColumns.filter((c) => c >= 0),
    ...(layout.columns.rowNumber !== undefined
      ? [layout.columns.rowNumber]
      : []),
    ...(layout.columns.unit !== undefined ? [layout.columns.unit] : []),
    ...(layout.columns.code !== undefined ? [layout.columns.code] : []),
  ]);
  let best = "";
  for (let c = 0; c < texts.length; c++) {
    if (skip.has(c)) continue;
    const cell = texts[c];
    if (!cell || isPlaceholder(cell) || isDateLike(cell) || isUuid(cell))
      continue;
    if (SKIP_NAME_RE.test(cell) || isSummaryOrFooterRow([cell])) continue;
    if (cell.length > best.length) best = cell;
  }
  return best;
}

/**
 * Turn sheet rows into inventory records using a detected layout. Rows above
 * `layout.firstDataRow` (form headers, intro text, agency fields) and the
 * summary / certification rows below the table are ignored.
 */
export function parseAppCseRows(
  rows: unknown[][],
  layout: AppCseLayout,
  options: AppCseParseOptions = {},
): AppCseParseResult {
  const warnings: string[] = [];
  const items: AppCseParsedItem[] = [];
  const partOneCategory = options.partOneCategory ?? "PS-DBM SUPPLIES";
  const partTwoCategory = options.partTwoCategory ?? "OTHER ITEMS";
  const maxItems = options.maxItems ?? 20000;

  const nameCol = layout.columns.name ?? -1;
  if (nameCol < 0) {
    return {
      items,
      skipped: 0,
      duplicates: 0,
      warnings: ["No item name column was detected."],
      partOne: 0,
      partTwo: 0,
    };
  }

  const codeCol = layout.columns.code;
  const unitCol = layout.columns.unit;
  const priceCol = layout.columns.price;
  const totalQtyCol = layout.columns.totalQty;
  const categoryCol = layout.columns.category;
  const monthColumns = layout.monthColumns;

  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  let skipped = 0;
  let duplicates = 0;
  let currentCategory = "";
  let inPartTwo = false;

  for (let r = layout.firstDataRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const texts = row.map((cell) => toText(cell));
    const filled = texts.filter(Boolean);
    if (!filled.length) continue;
    const unique = [...new Set(filled)];
    const joined = filled.join(" ");

    // ── Certification / signature block: stop, nothing below is inventory ──
    if (FOOTER_RE.test(joined)) break;

    // ── PART I / PART II section markers ──
    if (unique.length <= 3 && PART_TWO_RE.test(joined)) {
      inPartTwo = true;
      currentCategory = "";
      continue;
    }
    if (unique.length <= 3 && PART_ONE_RE.test(joined)) {
      inPartTwo = false;
      currentCategory = "";
      continue;
    }

    // ── Category column: the row itself carries its category, so keep parsing ──
    if (categoryCol !== undefined && !isSummaryOrFooterRow(texts)) {
      const category = texts[categoryCol];
      if (category) currentCategory = cleanCategoryLabel(category);
    }

    // ── Merged category / section rows (the template spans A:AA) ──
    if (unique.length === 1) {
      const value = unique[0];
      if (isSummaryOrFooterRow([value])) continue;
      if (isCategoryHeaderRow(value)) {
        currentCategory = cleanCategoryLabel(value);
        continue;
      }
      // A single value that is not a category label is normally a form field
      // ("Date Prepared:") rather than an item — unless it is the item name.
      if (texts[nameCol] !== value) continue;
    }

    // ── Items ──
    let name = texts[nameCol] || "";
    if (isPlaceholder(name)) name = guessNameFromRow(texts, layout);
    if (!name || name.length < 2) {
      skipped += 1;
      continue;
    }
    if (
      isSummaryOrFooterRow(texts) ||
      SKIP_NAME_RE.test(name) ||
      isDateLike(name)
    ) {
      skipped += 1;
      continue;
    }

    let code = codeCol !== undefined ? texts[codeCol] || "" : "";
    if (
      code &&
      (isUuid(code) ||
        isDateLike(code) ||
        isPlaceholder(code) ||
        SKIP_NAME_RE.test(code))
    )
      code = "";

    const unit = (unitCol !== undefined ? texts[unitCol] : "") || "pcs";
    const monthly = monthColumns.map((column) =>
      column >= 0 && column < row.length
        ? Math.max(0, toNumber(row[column]))
        : 0,
    );
    const monthSum = monthly.reduce((sum, value) => sum + value, 0);
    const explicitQty =
      totalQtyCol !== undefined ? Math.max(0, toNumber(row[totalQtyCol])) : 0;
    let quantity = Math.max(monthSum, explicitQty);
    if (monthSum === 0 && explicitQty > 0) {
      // Generic exports only carry a single "Quantity" column: keep it as January.
      monthly[0] = explicitQty;
      quantity = explicitQty;
    }
    const price =
      priceCol !== undefined ? Math.max(0, toNumber(row[priceCol])) : 0;

    if (inPartTwo && code) {
      // Part II items must not look like PS-DBM catalog items: keep the template
      // code inside the name so it can still be traced back to the source file.
      name = `[${code}] ${name}`;
      code = "";
    }

    const nameKey = name.toLowerCase().replace(/\s+/g, " ");
    const codeKey = code.toLowerCase();
    if (
      (codeKey && seenCodes.has(codeKey)) ||
      (!codeKey && seenNames.has(nameKey))
    ) {
      duplicates += 1;
      continue;
    }
    if (codeKey) seenCodes.add(codeKey);
    seenNames.add(nameKey);

    items.push({
      name,
      description: null,
      code,
      unit,
      quantity,
      acquisition_cost: price,
      category:
        currentCategory || (inPartTwo ? partTwoCategory : partOneCategory),
      monthly,
      part: inPartTwo ? 2 : 1,
      sourceRow: r + 1,
    });
    if (items.length >= maxItems) {
      warnings.push(
        `Import stopped at the ${maxItems} item limit; the file contains more rows.`,
      );
      break;
    }
  }

  return {
    items,
    skipped,
    duplicates,
    warnings,
    partOne: items.filter((item) => item.part === 1).length,
    partTwo: items.filter((item) => item.part === 2).length,
  };
}
