// @vitest-environment-options {"url": "https://bzead.eu/"}
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderSummaryPage from '../pages/user/OrderSummary';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isEu: false,
  user: { id: 'buyer-1', country: 'India' },
  rates: {},
  items: [{
    cartItemId: 'item-1', quantity: 2, selectedSize: 'M', selectedColor: 'Blue',
    product: { id: 'p1', name: 'Test product', price: 100, currency: 'INR', image_url: '/product.png' },
  }],
  fetchPublicPrices: vi.fn(),
  calculatePricing: vi.fn(),
  fetchMultiSellerTat: vi.fn(),
  checkDeliveryServiceability: vi.fn(),
  supabaseFrom: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock('../config/market', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/market')>()),
  get IS_EU_STOREFRONT() { return mocks.isEu; },
}));
vi.mock('../components/layout/Header', () => ({ Header: () => null }));
vi.mock('../components/layout/Footer', () => ({ Footer: () => <footer>Footer component</footer> }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, currentAuthUser: null }),
}));
vi.mock('../contexts/CartContext', () => ({ useCart: () => ({ items: mocks.items }) }));
vi.mock('../contexts/CurrencyContext', () => ({ useCurrency: () => ({ rates: mocks.rates }) }));
vi.mock('../lib/pricingService', () => ({
  fetchPublicProductPrices: mocks.fetchPublicPrices,
}));
vi.mock('../lib/checkoutPricingService', () => ({
  calculateDestinationCheckoutPricing: mocks.calculatePricing,
}));
vi.mock('../lib/tatService', () => ({
  fetchMultiSellerTat: mocks.fetchMultiSellerTat,
  checkDeliveryServiceability: mocks.checkDeliveryServiceability,
}));
vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.supabaseFrom, functions: { invoke: mocks.invoke } },
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));

describe('checkout order summary layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEu = false;
    mocks.rates = {};
    vi.stubEnv('VITE_EU_HOSTED_CHECKOUT', 'false');
    localStorage.clear();
    sessionStorage.clear();
    mocks.fetchPublicPrices.mockResolvedValue({
      data: [{ productId: 'p1', publicUnitPrice: 100 }], error: null,
    });
    mocks.calculatePricing.mockReturnValue(new Promise(() => {}));
    mocks.fetchMultiSellerTat.mockResolvedValue({ maxTatDays: 0, maxExpectedDate: null });
    mocks.checkDeliveryServiceability.mockResolvedValue({ serviceable: true, codAvailable: true });
    mocks.supabaseFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: [{ id: 'p1', name: 'Test product', package_weight: 1, stock: 5 }] }) }),
    });
    localStorage.setItem('beauzead_checkout_shipping', JSON.stringify({
      fullName: 'Test Buyer', street: 'Main Road', street2: 'Near market',
      city: 'Kannur', state: 'Kerala', postalCode: '670702', country: 'India',
      phone: '1234567890', email: 'buyer@example.com', notes: 'Call first',
    }));
    localStorage.setItem('beauzead_checkout_selected_cart_ids', JSON.stringify(['item-1']));
  });

  it('displays the selected address and cart item while preserving change-address navigation', async () => {
    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    expect(await screen.findByText('Test Buyer')).toBeInTheDocument();
    expect(screen.getByText('Main Road')).toBeInTheDocument();
    expect(screen.getByText('Near market')).toBeInTheDocument();
    expect(screen.getByText('Call first')).toBeInTheDocument();
    expect(await screen.findByText('Test product')).toBeInTheDocument();
    expect(screen.getByText('Size: M • Color: Blue')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText('Price Details')).toBeInTheDocument();
    const pricePanel = screen.getByText('Price Details').closest('.order-summary-price-panel');
    expect(pricePanel).toBeInTheDocument();
    expect(screen.getByText('Items & Delivery').closest('.order-summary-items-delivery')).toBeInTheDocument();
    expect(pricePanel?.querySelector('.order-summary-payment-action button')).toBeInTheDocument();
    expect(screen.queryByText('Footer component')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/checkout/shipping');
  });

  it('keeps mobile delivery choices in the scrollable items section', async () => {
    mocks.calculatePricing.mockResolvedValue({
      subtotal: 200,
      total: 200,
      shipping: 0,
      currency: 'INR',
      items: [{
        cartItemId: 'item-1',
        productId: 'p1',
        sourceCurrency: 'INR',
        convertedUnitPrice: 100,
      }],
      codEligible: true,
      codIneligibleItems: [],
      ukDomesticShippingOptions: {
        standard: { shipping: 0, total: 200, etd: '', estimatedDays: '11-15' },
        premium: null,
        express: { shipping: 40, total: 240, etd: '', estimatedDays: '2-4' },
      },
    });

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(document.querySelector('.order-summary-mobile-delivery-options')).not.toBeNull();
    });
    const mobileDeliveryOptions = document.querySelector('.order-summary-mobile-delivery-options');
    expect(mobileDeliveryOptions).toBeInTheDocument();
    expect(mobileDeliveryOptions).toHaveClass('lg:hidden');
    expect(mobileDeliveryOptions).toHaveTextContent('Standard');
    expect(mobileDeliveryOptions).toHaveTextContent('Express');
    expect(mobileDeliveryOptions?.closest('.order-summary-items-delivery')).not.toBeNull();
  });

  it('reuses the current cart quote when the order summary is reopened in the same tab', async () => {
    mocks.calculatePricing.mockResolvedValue({
      subtotal: 200,
      total: 200,
      shipping: 0,
      currency: 'INR',
      items: [{
        cartItemId: 'item-1',
        productId: 'p1',
        sourceCurrency: 'INR',
        convertedUnitPrice: 100,
      }],
      codEligible: true,
      codIneligibleItems: [],
    });

    const firstRender = render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    await screen.findByText('Price Details');
    await waitFor(() => expect(sessionStorage.getItem('beauzead_checkout_quote')).not.toBeNull());
    const publicPriceCallsBeforeReopen = mocks.fetchPublicPrices.mock.calls.length;
    firstRender.unmount();

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    await screen.findByText('Price Details');
    await waitFor(() => {
      expect(mocks.calculatePricing).toHaveBeenCalledTimes(1);
      expect(mocks.fetchPublicPrices).toHaveBeenCalledTimes(publicPriceCallsBeforeReopen);
    });
  });

  it('prevents EU payments when hosted checkout is explicitly disabled', async () => {
    mocks.isEu = true;
    localStorage.setItem('beauzead_checkout_shipping', JSON.stringify({
      fullName: 'Test Buyer', street: 'Main Road', city: 'Paris',
      state: 'Paris', postalCode: '75001', country: 'France',
    }));

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    expect(await screen.findByText(/EU payments are unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Payment unavailable' })).toBeDisabled();
    await waitFor(() => expect(mocks.calculatePricing).toHaveBeenCalledWith(
      expect.objectContaining({ destinationCountry: 'France', targetCurrency: 'EUR' }),
    ));
  });

  it('uses the hosted EUR quote and creates a session by default', async () => {
    mocks.isEu = true;
    mocks.rates = { INR: 100, EUR: 1 };
    vi.stubEnv('VITE_EU_HOSTED_CHECKOUT', undefined);
    localStorage.setItem('beauzead_checkout_shipping', JSON.stringify({
      fullName: 'Test Buyer', street: 'Main Road', city: 'Paris',
      state: 'Paris', postalCode: '75001', country: 'France', countryCode: 'FRA',
    }));
    mocks.calculatePricing.mockResolvedValue({
      subtotal: 2, total: 2, shipping: 0, currency: 'EUR',
      items: [{ cartItemId: 'item-1', productId: 'p1', sourceCurrency: 'INR', convertedUnitPrice: 1 }],
      codEligible: false, codIneligibleItems: [],
    });
    mocks.invoke.mockImplementation(async (name: string) => name === 'quote-uk-hosted-checkout'
      ? { data: { snapshotId: 'snapshot-1', total: 2, currency: 'EUR' }, error: null }
      : { data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test', sessionId: 'cs_test_valid123' }, error: null });
    const navigationWarning = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    const button = await screen.findByRole('button', { name: 'Continue to Stripe' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith(
      'quote-uk-hosted-checkout',
      { body: expect.objectContaining({ market: 'EU', shippingAddress: expect.objectContaining({ country: 'France' }) }) },
    ));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith(
      'create-uk-hosted-checkout', { body: { snapshotId: 'snapshot-1' } },
    ));
    await waitFor(() => {
      expect(localStorage.getItem('beauzead_uk_pending_checkout_session')).toBe('cs_test_valid123');
      expect(localStorage.getItem('beauzead_uk_pending_checkout_snapshot')).toBe('snapshot-1');
    });
    navigationWarning.mockRestore();
  });

  it('rejects a GBP quote instead of opening a EUR payment session', async () => {
    mocks.isEu = true;
    mocks.rates = { INR: 100, EUR: 1 };
    vi.stubEnv('VITE_EU_HOSTED_CHECKOUT', 'true');
    localStorage.setItem('beauzead_checkout_shipping', JSON.stringify({
      fullName: 'Test Buyer', street: 'Main Road', city: 'Paris',
      state: 'Paris', postalCode: '75001', country: 'France',
    }));
    mocks.calculatePricing.mockResolvedValue({
      subtotal: 2, total: 2, shipping: 0, currency: 'EUR',
      items: [{ cartItemId: 'item-1', productId: 'p1', sourceCurrency: 'INR', convertedUnitPrice: 1 }],
      codEligible: false, codIneligibleItems: [],
    });
    mocks.invoke.mockResolvedValue({ data: { snapshotId: 'snapshot-1', total: 2, currency: 'GBP' }, error: null });

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    const button = await screen.findByRole('button', { name: 'Continue to Stripe' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('The checkout quote is invalid. Please return to review.')).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('requires review before creating a session when the verified EUR total changes', async () => {
    mocks.isEu = true;
    mocks.rates = { INR: 100, EUR: 1 };
    vi.stubEnv('VITE_EU_HOSTED_CHECKOUT', 'true');
    localStorage.setItem('beauzead_checkout_shipping', JSON.stringify({
      fullName: 'Test Buyer', street: 'Main Road', city: 'Paris',
      state: 'Paris', postalCode: '75001', country: 'France',
    }));
    mocks.calculatePricing.mockResolvedValue({
      subtotal: 2, total: 2, shipping: 0, currency: 'EUR',
      items: [{ cartItemId: 'item-1', productId: 'p1', sourceCurrency: 'INR', convertedUnitPrice: 1 }],
      codEligible: false, codIneligibleItems: [],
    });
    mocks.invoke.mockImplementation(async (name: string) => name === 'quote-uk-hosted-checkout'
      ? { data: { snapshotId: 'snapshot-1', total: 3, currency: 'EUR' }, error: null }
      : { data: null, error: new Error('Unable to open payment page') });

    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    const button = await screen.findByRole('button', { name: 'Continue to Stripe' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const confirmButton = await screen.findByRole('button', { name: 'Accept updated total and continue to Stripe' });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    fireEvent.click(confirmButton);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith(
      'create-uk-hosted-checkout', { body: { snapshotId: 'snapshot-1' } },
    ));
  });

  it('redirects an EU checkout with a non-European saved destination', async () => {
    mocks.isEu = true;
    render(<MemoryRouter><OrderSummaryPage /></MemoryRouter>);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/checkout/shipping'));
  });
});
