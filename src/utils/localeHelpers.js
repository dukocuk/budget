/**
 * Locale-aware number parsing and formatting utilities for Danish locale
 *
 * Danish locale uses:
 * - Comma (,) as decimal separator
 * - Period (.) as thousands separator
 *
 * Example: 1.234,56 kr (one thousand, two hundred thirty-four kroner and fifty-six øre)
 */

/**
 * Parse Danish locale number (comma decimal separator) to JavaScript number
 *
 * @param {string|number} value - Input value (e.g., "100,95" or 100.95)
 * @returns {number} - Parsed number
 *
 * @example
 * parseDanishNumber("100,95")      // → 100.95
 * parseDanishNumber("100.95")      // → 100.95 (also accepts period for flexibility)
 * parseDanishNumber("1.234,56")    // → 1234.56 (thousands separator)
 * parseDanishNumber("1234,56")     // → 1234.56
 * parseDanishNumber("100")         // → 100
 * parseDanishNumber("")            // → 0
 * parseDanishNumber(null)          // → 0
 * parseDanishNumber(100.95)        // → 100.95 (already a number)
 */
export const parseDanishNumber = value => {
  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Already a number - return as-is
  if (typeof value === 'number') {
    return value;
  }

  // Convert to string and clean whitespace
  const str = String(value).trim();

  // Empty after trimming
  if (str === '') {
    return 0;
  }

  // Check if the string contains only valid numeric characters (digits, comma, period, minus)
  // This prevents parseFloat from partially parsing strings like "12abc" → 12
  if (!/^-?[\d.,]+$/.test(str)) {
    return 0;
  }

  let normalized;

  // If string contains comma, it's clearly Danish format (comma = decimal, period = thousands)
  if (str.includes(',')) {
    // Remove thousands separators (periods) and replace comma with period
    normalized = str
      .replace(/\./g, '') // Remove thousand separators: "1.234,56" → "1234,56"
      .replace(/,/g, '.'); // Replace comma with period: "1234,56" → "1234.56"
  } else if (str.includes('.')) {
    // Period but no comma - check if period is in thousands separator position
    // Thousands pattern: X.XXX or X.XXX.XXX (period every 3 digits from right)
    // Decimal pattern: XXX.X or XX.XX (period not aligned to thousands)

    // Check if it matches thousands separator pattern (e.g., "1.234" or "1.234.567")
    // Pattern: starts with 1-3 digits, then groups of exactly 3 digits separated by periods
    const thousandsPattern = /^-?\d{1,3}(\.\d{3})+$/;

    if (thousandsPattern.test(str)) {
      // Treat as thousands separator: "1.234" → 1234
      normalized = str.replace(/\./g, '');
    } else {
      // Treat as decimal separator for flexibility: "100.95" → 100.95
      normalized = str;
    }
  } else {
    // No comma or period - just a plain number
    normalized = str;
  }

  const parsed = parseFloat(normalized);

  // Return 0 if parsing failed
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format number as Danish locale string with comma separator
 *
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted string (e.g., "100,95")
 *
 * @example
 * formatDanishNumber(100.95)        // → "100,95"
 * formatDanishNumber(1234.56)       // → "1.234,56"
 * formatDanishNumber(100.95, 0)     // → "101" (rounded)
 * formatDanishNumber(100.95, 1)     // → "101,0"
 */
export const formatDanishNumber = (value, decimals = 2) => {
  // Handle invalid input
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  return value.toLocaleString('da-DK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Validate Danish locale number input format
 *
 * @param {string} value - Input string to validate
 * @returns {boolean} - True if valid format
 *
 * Valid formats:
 * - "100"          - Whole number
 * - "100,95"       - Decimal with comma
 * - "1.234,56"     - Thousands separator with decimal
 * - "1234,56"      - Decimal without thousands separator
 * - "-100,95"      - Negative number
 * - ""             - Empty (treated as valid, converts to 0)
 *
 * Invalid formats:
 * - "100.95"       - Period as decimal (should be comma) - BUT WE ALLOW IT for flexibility
 * - "100,9,5"      - Multiple commas
 * - "abc"          - Non-numeric characters
 *
 * @example
 * isValidDanishNumber("100,95")     // → true
 * isValidDanishNumber("1.234,56")   // → true
 * isValidDanishNumber("abc")        // → false
 * isValidDanishNumber("")           // → true (empty is valid)
 */
export const isValidDanishNumber = value => {
  // Empty, null, or undefined is valid (treated as 0)
  if (value === '' || value === null || value === undefined) {
    return true;
  }

  const str = String(value).trim();

  // Empty after trimming is valid
  if (str === '') {
    return true;
  }

  // Pattern explanation:
  // ^-?                           - Optional negative sign at start
  // \d{1,3}(\.\d{3})*(,\d{1,2})?  - Number with optional thousand separators and decimal
  //   \d{1,3}                     - 1-3 digits
  //   (\.\d{3})*                  - Zero or more groups of ".###" (thousands)
  //   (,\d{1,2})?                 - Optional comma followed by 1-2 decimal digits
  // |                             - OR
  // -?\d+(,\d{1,2})?              - Simple number without thousands separator
  //   -?\d+                       - Optional negative sign and digits
  //   (,\d{1,2})?                 - Optional comma followed by 1-2 decimal digits
  // $                             - End of string
  const pattern = /^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$|^-?\d+(,\d{1,2})?$/;

  return pattern.test(str);
};
