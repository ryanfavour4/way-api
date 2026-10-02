/**
 * Converts a cryptocurrency/token amount to Naira
 * @param tokenAmount - The amount in the source currency (e.g., Espees)
 * @param rate - The exchange rate (Defaulted to 2050 for Espees)
 * @returns The total value in Naira as a formatted string
 */
export const convertEspeesToNaira = (
  tokenAmount: number,
  rate: number = 2050,
): number => {
  if (!tokenAmount || tokenAmount <= 0) return 0.0;

  const totalNaira = tokenAmount * rate;

  // .toFixed(2) ensures we keep it to 2 decimal places like standard currency
  return Number(totalNaira.toFixed(2));
};
