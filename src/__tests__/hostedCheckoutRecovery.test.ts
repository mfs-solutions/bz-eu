import { describe, expect, it, vi } from 'vitest';

const modulePath = '../../supabase/functions/_shared/uk-hosted-checkout.ts';
const snapshotId = 'c0a80101-1234-4567-89ab-0123456789ab';

function fixture(currency: string) {
  const session = {
    id: 'cs_test_valid123',
    metadata: { uk_checkout_snapshot_id: snapshotId },
    livemode: false,
    currency,
    amount_total: 1234,
    status: 'complete',
    payment_status: 'paid',
    payment_intent: 'pi_valid123',
  };
  const snapshot = {
    user_id: 'buyer',
    stripe_session_id: session.id,
    stripe_account_id: 'acct_123',
    livemode: false,
    amount_minor: 1234,
    currency,
  };
  const payment = {
    id: 'pi_valid123',
    status: 'succeeded',
    livemode: false,
    amount_received: 1234,
    currency,
  };
  const rpc = vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null });
  const stripe = {
    checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(session) } },
    paymentIntents: { retrieve: vi.fn().mockResolvedValue(payment) },
  };
  const db = {
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: snapshot, error: null }) }) }),
    })),
    rpc,
  };
  return { session, snapshot, payment, stripe, db, rpc };
}

describe('hosted checkout payment recovery', () => {
  it.each([
    ['gbp', 'recover_uk_hosted_checkout'],
    ['eur', 'recover_eu_hosted_checkout'],
  ])('routes a paid %s session to the matching recovery RPC', async (currency, rpcName) => {
    const { recoverUkHostedCheckout } = await import(/* @vite-ignore */ modulePath);
    const { stripe, db, rpc } = fixture(currency);
    await expect(recoverUkHostedCheckout(stripe, db, 'cs_test_valid123', 'acct_123', false, 'buyer'))
      .resolves.toMatchObject({ status: 'paid', orderId: 'order-1' });
    expect(rpc).toHaveBeenCalledWith(rpcName, expect.objectContaining({
      p_snapshot_id: snapshotId,
      p_currency: currency,
      p_amount_minor: 1234,
    }));
  });

  it('does not recover unpaid sessions or mismatched captured payments', async () => {
    const { recoverUkHostedCheckout } = await import(/* @vite-ignore */ modulePath);
    const unpaid = fixture('eur');
    unpaid.session.payment_status = 'unpaid';
    await expect(recoverUkHostedCheckout(unpaid.stripe, unpaid.db, 'cs_test_valid123', 'acct_123', false))
      .resolves.toEqual({ status: 'unpaid' });
    expect(unpaid.rpc).not.toHaveBeenCalled();

    const mismatch = fixture('eur');
    mismatch.payment.currency = 'gbp';
    await expect(recoverUkHostedCheckout(mismatch.stripe, mismatch.db, 'cs_test_valid123', 'acct_123', false))
      .rejects.toThrow('Captured payment does not match');
    expect(mismatch.rpc).not.toHaveBeenCalled();
  });

  it('rejects unsupported currencies and another buyer’s snapshot', async () => {
    const { recoverUkHostedCheckout } = await import(/* @vite-ignore */ modulePath);
    const unsupported = fixture('usd');
    await expect(recoverUkHostedCheckout(unsupported.stripe, unsupported.db, 'cs_test_valid123', 'acct_123', false))
      .rejects.toThrow('Invalid UK checkout session');

    const otherBuyer = fixture('eur');
    await expect(recoverUkHostedCheckout(otherBuyer.stripe, otherBuyer.db, 'cs_test_valid123', 'acct_123', false, 'other'))
      .rejects.toThrow('does not match the saved payment');
    expect(otherBuyer.rpc).not.toHaveBeenCalled();
  });
});
