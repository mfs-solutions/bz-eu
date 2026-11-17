import { describe, expect, it, vi } from 'vitest';
import {
  getHostedCheckoutMarket,
  isEuropeanAddress,
  isHostedCheckoutCountryAllowed,
  isHostedCheckoutCurrency,
} from '../../supabase/functions/_shared/hosted-checkout-market';
import { captureEuSellerUnitPrice } from '../../supabase/functions/_shared/eu-checkout-pricing';

vi.mock('../lib/supabase', () => ({ supabase: {} }));

describe('hosted checkout market', () => {
  it('keeps GBP as the default and selects EU for EU origins or explicit requests', () => {
    expect(getHostedCheckoutMarket(undefined, 'https://bzead.uk')).toBe('GB');
    expect(getHostedCheckoutMarket(undefined, '')).toBe('GB');
    expect(getHostedCheckoutMarket(undefined, 'https://www.bzead.eu')).toBe('EU');
    expect(getHostedCheckoutMarket('EU', '')).toBe('EU');
    expect(getHostedCheckoutMarket('GB', 'https://bzead.eu')).toBe('GB');
    expect(getHostedCheckoutMarket('US', '')).toBeNull();
  });

  it('restricts UK addresses and accepts European countries including the UK', () => {
    expect(isHostedCheckoutCountryAllowed('GB', 'United Kingdom')).toBe(true);
    expect(isHostedCheckoutCountryAllowed('GB', 'France')).toBe(false);
    expect(isHostedCheckoutCountryAllowed('EU', 'United Kingdom')).toBe(true);
    expect(isHostedCheckoutCountryAllowed('EU', 'France')).toBe(true);
    expect(isHostedCheckoutCountryAllowed('EU', 'United States')).toBe(false);
  });

  it('requires a provided European country code to match the country', () => {
    expect(isEuropeanAddress('France', 'FRA')).toBe(true);
    expect(isEuropeanAddress('United Kingdom', 'GBR')).toBe(true);
    expect(isEuropeanAddress('Czech Republic', 'CZ')).toBe(true);
    expect(isEuropeanAddress('France', undefined)).toBe(true);
    expect(isEuropeanAddress('France', '   ')).toBe(true);
    expect(isEuropeanAddress('France', 'DE')).toBe(false);
    expect(isEuropeanAddress('France', 'US')).toBe(false);
    expect(isEuropeanAddress('India', 'IN')).toBe(false);
  });

  it('accepts only Stripe GBP and EUR currency codes', () => {
    expect(isHostedCheckoutCurrency('gbp')).toBe(true);
    expect(isHostedCheckoutCurrency('eur')).toBe(true);
    expect(isHostedCheckoutCurrency('usd')).toBe(false);
    expect(isHostedCheckoutCurrency(null)).toBe(false);
  });

  it('captures seller prices in the selected settlement currency', () => {
    const rates = { GBP: 0.8, EUR: 1, INR: 100 };
    expect(captureEuSellerUnitPrice(10, 'GBP', 'INR', rates)).toBe(1250);
    expect(captureEuSellerUnitPrice(400, 'INR', 'GBP', rates)).toBe(3.2);
    expect(() => captureEuSellerUnitPrice(10, 'GBP', 'INR', { GBP: 0.8 })).toThrow();
    expect(() => captureEuSellerUnitPrice(0.001, 'GBP', 'GBP', rates)).toThrow();
  });
});
