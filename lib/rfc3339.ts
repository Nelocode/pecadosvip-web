const RFC3339_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))$/u;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1] ?? 0;
}

/**
 * Accepts the canonical RFC 3339 subset used by project audit records:
 * a complete calendar date, time to seconds, and an explicit UTC designator
 * or numeric offset. Leap-second values are deliberately rejected because the
 * JavaScript runtime cannot represent them consistently.
 */
export function isCanonicalRfc3339Timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(RFC3339_TIMESTAMP);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetSign = match[8];
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const unknownLocalOffset =
    offsetSign === '-' && offsetHour === 0 && offsetMinute === 0;

  return Boolean(
    month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= daysInMonth(year, month) &&
      hour <= 23 &&
      minute <= 59 &&
      second <= 59 &&
      !unknownLocalOffset &&
      offsetHour <= 23 &&
      offsetMinute <= 59 &&
      Number.isFinite(Date.parse(value)),
  );
}
