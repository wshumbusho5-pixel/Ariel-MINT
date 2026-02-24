export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPL(amount: number, currency = 'USD'): string {
  const formatted = formatCurrency(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

export function formatPct(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}
