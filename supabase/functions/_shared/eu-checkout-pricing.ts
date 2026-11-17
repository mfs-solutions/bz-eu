import { convertAmountStrict } from "../../../src/utils/currency.ts";

export function captureEuSellerUnitPrice(
  amount: number,
  sourceCurrency: string,
  sellerCurrency: string,
  rates: Record<string, number>,
): number {
  const converted = convertAmountStrict(amount, sourceCurrency, sellerCurrency, rates);
  if (converted === null || !Number.isFinite(converted) || converted <= 0) {
    throw new Error("A seller price could not be converted for checkout");
  }
  const rounded = Math.round((converted + Number.EPSILON) * 100) / 100;
  if (rounded <= 0) throw new Error("A seller price is too small to capture for checkout");
  return rounded;
}
