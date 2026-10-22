export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

/** Parses a strict `YYYY-MM-DD` calendar date; null for impossible dates. */
export function parseBirthDate(value: string): BirthDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate && year >= 1900 ? { year, month, day } : null;
}

export function ageOn(birthDate: BirthDate, today = new Date()): number {
  const year = today.getUTCFullYear();
  const hadBirthdayThisYear =
    today.getUTCMonth() + 1 > birthDate.month ||
    (today.getUTCMonth() + 1 === birthDate.month &&
      today.getUTCDate() >= birthDate.day);

  return year - birthDate.year - (hadBirthdayThisYear ? 0 : 1);
}

export function sameBirthDate(a: BirthDate, b: BirthDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
