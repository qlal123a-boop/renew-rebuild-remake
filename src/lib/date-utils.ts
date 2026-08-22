/**
 * Centralized date / academic-year utilities.
 * Nothing in the app should hard-code a year — everything derives from here.
 */

export type LocaleDir = "ar" | "en";

/** Current calendar year, always derived from the system clock. */
export function currentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

/**
 * Palestinian academic year: starts in September.
 * Sep 2026 → "2026/2027"; Feb 2027 → "2026/2027".
 */
export function academicYear(now: Date = new Date()): { start: number; end: number; label: string } {
  const y = now.getFullYear();
  const start = now.getMonth() >= 8 ? y : y - 1;
  return { start, end: start + 1, label: `${start}/${start + 1}` };
}

/** "الجمعة" / "Friday" */
export function weekdayName(now: Date = new Date(), locale: LocaleDir = "ar"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now);
}

/** "14 أغسطس 2026" / "August 14, 2026" */
export function longDate(now: Date = new Date(), locale: LocaleDir = "ar"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(now);
}

/** "الجمعة، 14 أغسطس 2026" — "Friday, August 14, 2026" in English. */
export function fullDate(now: Date = new Date(), locale: LocaleDir = "ar"): string {
  const sep = locale === "ar" ? "، " : ", ";
  return `${weekdayName(now, locale)}${sep}${longDate(now, locale)}`;
}

/** Hijri date, empty string when the runtime lacks the islamic calendar. */
export function hijriDate(now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  } catch {
    return "";
  }
}

/** Localized clock string. */
export function clockTime(now: Date = new Date(), locale: LocaleDir = "ar"): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
}

/** Stable day index (days since epoch) — used for deterministic daily content. */
export function dayIndex(now: Date = new Date()): number {
  return Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
}

/** Deterministic "pick of the day" from any list — same item all day long. */
export function pickOfTheDay<T>(items: readonly T[], now: Date = new Date()): T | undefined {
  if (!items.length) return undefined;
  return items[dayIndex(now) % items.length];
}
