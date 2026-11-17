import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeliveryEstimate } from '../components/products/DeliveryEstimate';
import type { UseDeliveryEstimateReturn } from '../hooks/useDeliveryEstimate';

const mocks = vi.hoisted(() => ({ detect: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../config/market', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/market')>()),
  IS_EU_STOREFRONT: true,
}));
vi.mock('../lib/postcodeLookupService', () => ({
  detectPostcodeFromCurrentLocation: mocks.detect,
}));

const euCountries = ['Italy', 'France'];
const euCodes = ['IT', 'FR'];

const buildDelivery = (): UseDeliveryEstimateReturn => ({
  address: null,
  addresses: [],
  pincode: '',
  country: '',
  tat: null,
  serviceability: null,
  carrier: null,
  loading: false,
  error: null,
  selectAddress: vi.fn(),
  setPincode: vi.fn(),
  setCountry: vi.fn(),
  checkDelivery: vi.fn().mockResolvedValue(undefined),
  isDeliverableCountry: (value: string) => euCountries.includes(value) || euCodes.includes(value),
  deliveryCountries: euCountries.map((name) => ({
    id: name, country_name: name, country_code: name, short_code: name, currency_code: 'EUR', dialing_code: '', is_active: true,
  })),
});

const openPicker = async (delivery: UseDeliveryEstimateReturn) => {
  const user = userEvent.setup();
  render(<MemoryRouter><DeliveryEstimate delivery={delivery} /></MemoryRouter>);
  await user.click(screen.getByText(/Select delivery location/));
  return user;
};

describe('DeliveryEstimate current location', () => {
  beforeEach(() => mocks.detect.mockReset());

  it('checks delivery with the detected EU postcode immediately', async () => {
    mocks.detect.mockResolvedValue({ postalCode: '81100', city: 'Caserta', country: 'Italy', countryCode: 'IT' });
    const delivery = buildDelivery();
    const user = await openPicker(delivery);

    await user.click(screen.getByRole('button', { name: /Use my current location/ }));

    await waitFor(() => expect(delivery.checkDelivery).toHaveBeenCalledWith({ pincode: '81100', country: 'Italy' }));
    expect(delivery.setPincode).toHaveBeenCalledWith('81100');
  });

  it('rejects a detected location outside the EU', async () => {
    mocks.detect.mockResolvedValue({ postalCode: 'KY13 8AA', city: 'Kinross', country: 'United Kingdom', countryCode: 'GB' });
    const delivery = buildDelivery();
    const user = await openPicker(delivery);

    await user.click(screen.getByRole('button', { name: /Use my current location/ }));

    expect(await screen.findByText(/only deliver to EU countries/)).toBeInTheDocument();
    expect(delivery.checkDelivery).not.toHaveBeenCalled();
  });

  it('falls back to manual entry when no postcode is found', async () => {
    mocks.detect.mockResolvedValue({ postalCode: '', city: 'Caserta', country: 'Italy', countryCode: 'IT' });
    const delivery = buildDelivery();
    const user = await openPicker(delivery);

    await user.click(screen.getByRole('button', { name: /Use my current location/ }));
    expect(await screen.findByText(/enter it below/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Postcode'), '81024');
    await user.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => expect(delivery.checkDelivery).toHaveBeenCalledWith({ pincode: '81024', country: 'Italy' }));
  });
});
