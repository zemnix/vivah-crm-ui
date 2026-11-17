const INDIA_TIME_ZONE = "Asia/Kolkata";
const INDIA_UTC_OFFSET = "+05:30";
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const indiaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const isValidDateOnly = (value: string): boolean => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/** Returns the calendar date represented by a timestamp in India. */
export const toIndiaEventDateOnly = (value?: string | Date | null): string => {
  if (!value) return "";

  if (typeof value === "string" && isValidDateOnly(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = indiaDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
};

/** Converts a date-only form value into a local Date for the calendar widget. */
export const eventDateOnlyToLocalDate = (value?: string): Date | undefined => {
  if (!value || !isValidDateOnly(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/** Converts the calendar widget's local Date back to a date-only form value. */
export const localDateToEventDateOnly = (date?: Date): string => {
  if (!date || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Saves changed/new event dates as India midnight. If the India calendar date
 * did not change, the original timestamp is retained to avoid needless writes.
 */
export const serializeIndiaEventDate = (
  dateOnly?: string,
  originalValue?: string,
): string | undefined => {
  if (!dateOnly || !isValidDateOnly(dateOnly)) return undefined;

  if (originalValue && toIndiaEventDateOnly(originalValue) === dateOnly) {
    return originalValue;
  }

  return new Date(`${dateOnly}T00:00:00${INDIA_UTC_OFFSET}`).toISOString();
};

export const todayInIndia = (): string => toIndiaEventDateOnly(new Date());
