import { currencyOptions } from './currency-options';

describe('currencyOptions', () => {
  it('provides searchable ISO currencies with names and symbols', () => {
    expect(currencyOptions.length).toBeGreaterThan(100);
    expect(currencyOptions).toContainEqual({
      code: 'INR',
      name: 'Indian Rupee',
      symbol: '₹',
    });
    expect(currencyOptions).toContainEqual({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
    });
  });

  it('contains unique three-letter codes', () => {
    const codes = currencyOptions.map((currency) => currency.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
  });
});
