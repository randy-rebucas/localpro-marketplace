export interface CommissionBreakdown {
  gross: number;
  commission: number;
  netAmount: number;
  rate: number;
}

/**
 * Calculate platform commission on a transaction.
 * @param amount - Gross amount paid by client
 * @param rate - Commission rate as decimal (default 10%)
 */
export function calculateCommission(
  amount: number,
  rate = 0.1
): CommissionBreakdown {
  const commission = Math.round(amount * rate * 100) / 100;
  const netAmount = Math.round((amount - commission) * 100) / 100;
  return { gross: amount, commission, netAmount, rate };
}
