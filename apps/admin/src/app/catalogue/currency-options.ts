export type CurrencyOption = Readonly<{
  code: string;
  name: string;
  symbol: string;
}>;

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

function currencySymbol(code: string): string {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? code
  );
}

export const currencyOptions: readonly CurrencyOption[] =
  Intl.supportedValuesOf('currency')
    .map((code) => ({
      code,
      name: currencyNames.of(code) ?? code,
      symbol: currencySymbol(code),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
