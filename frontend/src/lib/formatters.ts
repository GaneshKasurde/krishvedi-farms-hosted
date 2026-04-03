/**
 * Indian numbering system formatters.
 * Examples: 1,23,456.00  /  12,34,567
 */

/**
 * Format a number using Indian numbering system (e.g., 1,23,456.78).
 */
export function formatIndianNumber(value: number, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return "-";

  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");

  // Indian grouping: last 3 digits, then groups of 2
  let result = "";
  const len = intPart.length;

  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + "," + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + "," + result;
    }
  }

  if (decPart) {
    result = result + "." + decPart;
  }

  return isNegative ? "-" + result : result;
}

/**
 * Format as Indian Rupee currency string.
 */
export function formatCurrency(value: number, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return "\u20B9" + formatIndianNumber(value, decimals);
}

/**
 * Format as percentage with given decimal places.
 */
export function formatPercent(value: number, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toFixed(decimals) + "%";
}

/**
 * Format volume in cubic meters.
 */
export function formatVolume(value: number, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return formatIndianNumber(value, decimals) + " m\u00B3";
}

/**
 * Compact number formatting for chart axes.
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_00_00_000) {
    return "\u20B9" + (value / 1_00_00_000).toFixed(1) + " Cr";
  }
  if (Math.abs(value) >= 1_00_000) {
    return "\u20B9" + (value / 1_00_000).toFixed(1) + " L";
  }
  if (Math.abs(value) >= 1_000) {
    return "\u20B9" + (value / 1_000).toFixed(1) + " K";
  }
  return "\u20B9" + value.toFixed(0);
}
