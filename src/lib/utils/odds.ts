/**
 * Convert fractional odds (e.g. "3/1") to decimal
 */
export function fractionalToDecimal(fractional: string): number {
  const parts = fractional.split('/')
  if (parts.length !== 2) return parseFloat(fractional)
  const num = parseFloat(parts[0])
  const den = parseFloat(parts[1])
  if (isNaN(num) || isNaN(den) || den === 0) return 0
  return +(num / den + 1).toFixed(4)
}

/**
 * Convert American/moneyline odds to decimal
 */
export function americanToDecimal(american: number): number {
  if (american > 0) return +(american / 100 + 1).toFixed(4)
  return +(100 / Math.abs(american) + 1).toFixed(4)
}

/**
 * Convert decimal odds to implied probability %
 */
export function decimalToImpliedProb(decimal: number): number {
  if (decimal <= 1) return 0
  return +((1 / decimal) * 100).toFixed(2)
}

/**
 * Convert decimal to fractional string
 */
export function decimalToFractional(decimal: number): string {
  const fraction = decimal - 1
  // Find GCD
  const precision = 100
  const num = Math.round(fraction * precision)
  const den = precision
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const d = gcd(num, den)
  return `${num / d}/${den / d}`
}

/**
 * Parse odds input — accepts decimal, fractional, or American
 * Returns decimal odds or null if invalid
 */
export function parseOdds(input: string): number | null {
  const trimmed = input.trim()

  // American (starts with + or -, or large number like -110)
  if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
    const val = parseInt(trimmed)
    if (isNaN(val)) return null
    const dec = americanToDecimal(val)
    return dec > 1 ? dec : null
  }

  // Fractional (contains /)
  if (trimmed.includes('/')) {
    const dec = fractionalToDecimal(trimmed)
    return dec > 1 ? dec : null
  }

  // Decimal
  const dec = parseFloat(trimmed)
  return !isNaN(dec) && dec > 1 ? dec : null
}
