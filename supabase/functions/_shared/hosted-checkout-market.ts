import { getEuropeanCountryCode, isEuropeanCountry, isUKCountry } from "../../../src/config/market.ts";

export type HostedCheckoutMarket = "GB" | "EU";

export function getHostedCheckoutMarket(value: unknown, origin: string): HostedCheckoutMarket | null {
  if (value === undefined) {
    return origin === "https://bzead.eu" || origin === "https://www.bzead.eu" ? "EU" : "GB";
  }
  return value === "GB" || value === "EU" ? value : null;
}

export function isHostedCheckoutCountryAllowed(market: HostedCheckoutMarket, country: string): boolean {
  return market === "EU" ? isEuropeanCountry(country) : isUKCountry(country);
}

export function isEuropeanAddress(country: string, countryCode: unknown): boolean {
  const expectedCode = getEuropeanCountryCode(country);
  if (!expectedCode) return false;
  if (countryCode === undefined || (typeof countryCode === "string" && !countryCode.trim())) return true;
  return typeof countryCode === "string" && getEuropeanCountryCode(countryCode) === expectedCode;
}

export function isHostedCheckoutCurrency(currency: unknown): currency is "gbp" | "eur" {
  return currency === "gbp" || currency === "eur";
}
