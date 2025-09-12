
export function toISODate(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString()
}
export function addMonths(d: Date, n: number): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  date.setUTCMonth(date.getUTCMonth() + n)
  return date
}
export function firstOfMonthUTC(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1))
}
