/**
 * Converts KingsChat millisecond timestamp to YYYY-MM-DD
 * Example: 1017961200000 -> "2002-04-05"
 */
export const formatKingsChatDate = (
  millis: number | string | null,
): string | null => {
  if (!millis) return 'null';

  // Convert to number if it came as a string
  const timestamp = typeof millis === 'string' ? parseInt(millis, 10) : millis;
  const date = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  // Months are 0-indexed in JS, so add 1 and pad with '0'
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
