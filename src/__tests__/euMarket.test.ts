import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/runtimeEnv', () => ({ runtimeEnv: { VITE_MARKET: 'EU' } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('European storefront', () => {
  it('fixes the display currency to EUR and rejects missing exchange rates', async () => {
    vi.resetModules();
    const market = await import('../config/market');
    const currency = await import('../utils/currency');

    expect(market.FIXED_STOREFRONT_CURRENCY).toBe('EUR');
    expect(currency.convertAmount(100, 'GBP', 'EUR', { GBP: 0.8, EUR: 0.9 })).toBeCloseTo(112.5);
    expect(currency.convertAmount(100, 'GBP', 'EUR', { GBP: 0.8 })).toBeNaN();
    expect(currency.formatCurrency(Number.NaN, 'EUR')).toBe('EUR price unavailable');
  });

  it('recognizes European countries and rejects non-European countries', async () => {
    const { isEuropeanCountry } = await import('../config/market');
    for (const country of ['France', 'DE', 'GBR', 'United Kingdom', 'Norway', 'Turkey']) {
      expect(isEuropeanCountry(country)).toBe(true);
    }
    for (const country of ['India', 'United States', '', 'Australia']) {
      expect(isEuropeanCountry(country)).toBe(false);
    }
  });
});
