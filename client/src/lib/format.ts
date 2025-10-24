import type { Locale } from "@shared/schema";

/**
 * Format numbers for display based on locale
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeString = locale === "ar" ? "ar-JO" : "en-US";
  return new Intl.NumberFormat(localeString, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Format currency (JD) based on locale
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  showSymbol: boolean = true
): string {
  const formatted = formatNumber(value, locale);
  
  if (!showSymbol) return formatted;
  
  // For Arabic, symbol goes after the number
  if (locale === "ar") {
    return `${formatted} د.أ`;
  }
  
  // For English, symbol goes before
  return `JD ${formatted}`;
}

/**
 * Format date based on locale
 */
export function formatDate(date: Date, locale: Locale): string {
  const localeString = locale === "ar" ? "ar-JO" : "en-US";
  return new Intl.DateTimeFormat(localeString, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Get Arabic or Western numerals
 */
export function getLocalizedDigits(value: string, locale: Locale): string {
  if (locale !== "ar") return value;
  
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return value.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

/**
 * Parse input that might contain Arabic numerals
 */
export function parseLocalizedNumber(value: string): number {
  // Convert Arabic numerals to Western numerals
  const arabicToWestern: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  
  const westernValue = value.replace(/[٠-٩]/g, (digit) => arabicToWestern[digit] || digit);
  return parseFloat(westernValue);
}
