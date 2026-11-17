export const getLeadConversionWarning = (
  status: string | undefined,
  events: ReadonlyArray<{ date?: string | null }> | null | undefined,
  previousStatus?: string,
): string | null => {
  if (status !== "converted" || previousStatus === "converted") return null;

  if (!events?.length) {
    return "Add at least one event with a date before marking this lead as Converted.";
  }

  if (events.some((event) => !event.date?.trim())) {
    return "Add a date for every event before marking this lead as Converted.";
  }

  return null;
};
