import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── APP-CSE display helpers ──
// Part I items carry their PS-DBM barcode in barcode_value.
// Part II items keep their template code (e.g. 80141505-TS-072) embedded in the
// description as "[CODE] name" — surface that instead of the internal "ITEM:uuid".
export function appCseCode(item: any): string {
  if (item.barcode_value) return String(item.barcode_value);
  const m = String(item.description || "").match(/^\[([^\]]+)\]/);
  return m ? m[1] : "";
}

// Strip a redundant "[CODE] " prefix from the description when it only repeats
// the item name (the code is already shown in its own column).
export function appCseCleanDescription(item: any): string {
  const d = String(item.description || "");
  const m = d.match(/^\[([^\]]+)\]/);
  if (!m) return d;
  const rest = d.slice(m[0].length).trim();
  if (!rest) return "";
  if (rest.toLowerCase() === String(item.name || "").toLowerCase()) return "";
  return d;
}
