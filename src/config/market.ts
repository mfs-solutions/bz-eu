import { runtimeEnv } from '../lib/runtimeEnv.ts';

export const STOREFRONT_COUNTRY_NAME = 'United Kingdom';
export const STOREFRONT_COUNTRY_CODE = 'GB';
export const STOREFRONT_CURRENCY_CODE = 'GBP';

export const IS_UK_STOREFRONT = runtimeEnv.VITE_MARKET === STOREFRONT_COUNTRY_CODE;
export const IS_EU_STOREFRONT = runtimeEnv.VITE_MARKET === 'EU';
export const FIXED_STOREFRONT_CURRENCY = IS_UK_STOREFRONT ? 'GBP' : IS_EU_STOREFRONT ? 'EUR' : null;

const europeanCountries = [
  ['AL', 'ALB', 'Albania'], ['AD', 'AND', 'Andorra'], ['AM', 'ARM', 'Armenia'],
  ['AT', 'AUT', 'Austria'], ['AZ', 'AZE', 'Azerbaijan'], ['BY', 'BLR', 'Belarus'],
  ['BE', 'BEL', 'Belgium'], ['BA', 'BIH', 'Bosnia and Herzegovina'], ['BG', 'BGR', 'Bulgaria'],
  ['HR', 'HRV', 'Croatia'], ['CY', 'CYP', 'Cyprus'], ['CZ', 'CZE', 'Czechia', 'Czech Republic'],
  ['DK', 'DNK', 'Denmark'], ['EE', 'EST', 'Estonia'], ['FI', 'FIN', 'Finland'],
  ['FR', 'FRA', 'France'], ['GE', 'GEO', 'Georgia'], ['DE', 'DEU', 'Germany'],
  ['GR', 'GRC', 'Greece'], ['HU', 'HUN', 'Hungary'], ['IS', 'ISL', 'Iceland'],
  ['IE', 'IRL', 'Ireland'], ['IT', 'ITA', 'Italy'], ['KZ', 'KAZ', 'Kazakhstan'],
  ['XK', 'XKX', 'Kosovo'],
  ['LV', 'LVA', 'Latvia'], ['LI', 'LIE', 'Liechtenstein'], ['LT', 'LTU', 'Lithuania'],
  ['LU', 'LUX', 'Luxembourg'], ['MT', 'MLT', 'Malta'], ['MD', 'MDA', 'Moldova', 'Republic of Moldova'],
  ['MC', 'MCO', 'Monaco'], ['ME', 'MNE', 'Montenegro'], ['NL', 'NLD', 'Netherlands'],
  ['MK', 'MKD', 'North Macedonia', 'Macedonia'], ['NO', 'NOR', 'Norway'],
  ['PL', 'POL', 'Poland'], ['PT', 'PRT', 'Portugal'], ['RO', 'ROU', 'Romania'],
  ['RU', 'RUS', 'Russia', 'Russian Federation'], ['SM', 'SMR', 'San Marino'],
  ['RS', 'SRB', 'Serbia'], ['SK', 'SVK', 'Slovakia'], ['SI', 'SVN', 'Slovenia'],
  ['ES', 'ESP', 'Spain'], ['SE', 'SWE', 'Sweden'], ['CH', 'CHE', 'Switzerland'],
  ['TR', 'TUR', 'Turkey', 'Türkiye'], ['UA', 'UKR', 'Ukraine'],
  ['VA', 'VAT', 'Vatican City', 'Holy See'],
  ['AX', 'ALA', 'Åland Islands', 'Aland Islands'], ['FO', 'FRO', 'Faroe Islands'],
  ['GI', 'GIB', 'Gibraltar'], ['GG', 'GGY', 'Guernsey'], ['IM', 'IMN', 'Isle of Man'],
  ['JE', 'JEY', 'Jersey'], ['SJ', 'SJM', 'Svalbard and Jan Mayen'],
  ['England', 'Scotland', 'Wales', 'Northern Ireland'],
];

const europeanCountryTokens = new Set(europeanCountries.flat().map((country) => country.trim().toUpperCase()));

export const isEuropeanCountry = (country: string): boolean =>
  isUKCountry(country) || europeanCountryTokens.has(String(country || '').trim().toUpperCase());

export const isUKCountry = (country: string): boolean => {
  const token = String(country || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return [
    'UNITEDKINGDOM',
    'UK',
    'GB',
    'GBR',
    'GREATBRITAIN',
    'GREATBRITAINANDNORTHERNIRELAND',
    'UNITEDKINGDOMOFGREATBRITAINANDNORTHERNIRELAND',
  ].includes(token);
};
