import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createPayment, getFinanceAccounts, getPayments, getTripBillings } from '../services/api';
import type { FinanceAccount, PaymentRecord, TripBilling } from '../types/auth';
import { ApiError } from '../types/api';

type ClosureBilling = TripBilling & {
  trip?: { id: string; tripNumber: string; originName?: string; destinationName?: string } | null;
};

type ClosurePayment = PaymentRecord & {
  tripBilling?: ClosureBilling | null;
  account?: FinanceAccount | null;
  customer?: { id: string; name: string } | null;
};

type PaymentForm = {
  amount: string;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  accountId: string;
  referenceNumber: string;
  bankUtrNumber: string;
  upiReference: string;
  notes: string;
};

const initialForm: PaymentForm = {
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMode: 'BANK_TRANSFER',
  accountId: '',
  referenceNumber: '',
  bankUtrNumber: '',
  upiReference: '',
  notes: '',
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

function statusClass(status: string) {
  if (status === 'PAID') return 'status-pill status-pill-success';
  if (status === 'PARTIALLY_PAID') return 'status-pill status-pill-warning';
  if (status === 'BILLED') return 'status-pill status-pill-info';
  if (status === 'CANCELLED') return 'status-pill status-pill-danger';
  return 'status-pill status-pill-default';
}

function outstandingAmount(billing: ClosureBilling) {
  return Number(billing.balanceAmount ?? billing.netReceivable ?? 0);
}

function tripDisplay(billing: ClosureBilling) {
  const trip = billing.trip;
  if (!trip) return billing.tripId;
  const route = trip.originName && trip.destinationName ? ` · ${trip.originName} → ${trip.destinationName}` : '';
  return `${trip.tripNumber}${route}`;
}

export default function FinancePaymentClosurePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [billings, setBillings] = useState<ClosureBilling[]>([]);
  const [payments, setPayments] = useState<ClosurePayment[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBilling = useMemo(
    () => billings.find((billing) => billing.id === selectedBillingId) || null,
    [billings, selectedBillingId],
  );

  const pendingCollection = useMemo(
    () => billings.filter((billing) => ['BILLED', 'PARTIALLY_PAID'].includes(billing.paymentStatus)),
    [billings],
  );

  const fullyPaid = useMemo(
    () => billings.filter((billing) => billing.paymentStatus === 'PAID'),
    [billings],
  );

  const totalOutstanding = useMemo(
    () => pendingCollection.reduce((sum, billing) => sum + outstandingAmount(billing), 0),
    [pendingCollection],
  );

  const recentPayments = useMemo(
    () => payments.slice(0, 8),
    [payments],
  );

  const load = async () => {
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [billed, partial, paid, paymentRes, accountRes] = await Promise.all([
        getTripBillings(auth.accessToken, { status: 'BILLED', limit: 100 }),
        getTripBillings(auth.accessToken, { status: 'PARTIALLY_PAID', limit: 100 }),
        getTripBillings(auth.accessToken, { status: 'PAID', limit: 25 }),
        getPayments(auth.accessToken, { limit: 100 }),
        getFinanceAccounts(auth.accessToken, { limit: 100 }),
      ]);

      const billingMap = new Map<string, ClosureBilling>();
      [...(billed.data?.items || []), ...(partial.data?.items || []), ...(paid.data?.items || [])].forEach((billing) => {
        billingMap.set(billing.id, billing as ClosureBilling);
      });

      setBillings(Array.from(billingMap.values()));
      setPayments((paymentRes.data?.items || []) as ClosurePayment[]);
      setAccounts(accountRes.data?.items || []);
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load payment closure data.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [auth.accessToken]);

  const selectBilling = (billing: ClosureBilling) => {
    setSelectedBillingId(billing.id);
    setForm((current) => ({
      ...current,
      amount: String(outstandingAmount(billing)),
      notes: `Payment against ${billing.invoiceNumber || billing.tripId}`,
    }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.accessToken || !selectedBilling) return;

    const amount = Number(form.amount || 0);
    if (amount <= 0) {
      const msg = 'Payment amount must be greater than zero.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await createPayment(auth.accessToken, {
        tripBillingId: selectedBilling.id,
        customerId: selectedBilling.customerId || undefined,
        accountId: form.accountId || undefined,
        amount,
        paymentDate: new Date(form.paymentDate).toISOString(),
        paymentMode: form.paymentMode,
        referenceNumber: form.referenceNumber || undefined,
        bankUtrNumber: form.bankUtrNumber || undefined,
        upiReference: form.upiReference || undefined,
        notes: form.notes || undefined,
      });

      showToast(`Payment recorded: ${money(response.data.amount)}`, 'success');
      setForm(initialForm);
      setSelectedBillingId(null);
      await load();
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to record payment.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && billings.length === 0) return <LoadingState message="Loading payment closure..." />;
  if (error && billings.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <section className="payment-closure-page">
      <PageHeader
        eyebrow="Finance Operations"
        title="Payment Closure"
        description="Collect payments against approved billings, track partial payments, and close receivables."
        actions={<button type="button" className="secondary-button" onClick={load}>Refresh</button>}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="closure-metrics">
        <div><strong>{pendingCollection.length}</strong><span>Awaiting collection</span></div>
        <div><strong>{money(totalOutstanding)}</strong><span>Total outstanding</span></div>
        <div><strong>{fullyPaid.length}</strong><span>Recently closed</span></div>
        <div><strong>{payments.filter((p) => (p.reconciledStatus || 'UNRECONCILED') === 'UNRECONCILED').length}</strong><span>Unreconciled payments</span></div>
      </div>

      <div className="closure-grid">
        <section className="closure-card">
          <header>
            <div>
              <h2>Invoices ready for collection</h2>
              <p>Only approved billings with outstanding balance are shown here.</p>
            </div>
          </header>

          {pendingCollection.length === 0 ? (
            <EmptyState message="No approved billing is waiting for payment." />
          ) : (
            <div className="closure-list">
              {pendingCollection.map((billing) => (
                <article
                  key={billing.id}
                  className={`closure-item ${selectedBillingId === billing.id ? 'selected' : ''}`}
                  onClick={() => selectBilling(billing)}
                >
                  <div>
                    <strong>{billing.invoiceNumber || 'Invoice pending number'}</strong>
                    <span>{tripDisplay(billing)}</span>
                    <small>{billing.customer?.name || 'No customer linked'} · {billing.vehicle?.vehicleNumber || 'No vehicle'}</small>
                  </div>
                  <div className="closure-amount">
                    <span className={statusClass(billing.paymentStatus)}>{billing.paymentStatus}</span>
                    <strong>{money(outstandingAmount(billing))}</strong>
                    <small>Paid {money(billing.paidAmount)}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="closure-card">
          <header>
            <div>
              <h2>Collect payment</h2>
              <p>{selectedBilling ? `Recording against ${selectedBilling.invoiceNumber || selectedBilling.tripId}` : 'Select a billing to start.'}</p>
            </div>
          </header>

          {!selectedBilling ? (
            <div className="state-panel"><h3>No billing selected</h3><p>Choose an approved billing from the left.</p></div>
          ) : (
            <form className="closure-form" onSubmit={handleSubmit}>
              <div className="selected-invoice-card">
                <label>Outstanding</label>
                <strong>{money(outstandingAmount(selectedBilling))}</strong>
                <small>Net receivable {money(selectedBilling.netReceivable)} · Paid {money(selectedBilling.paidAmount)}</small>
              </div>

              <label>
                Payment amount
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </label>
              <label>
                Payment date
                <input type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} required />
              </label>
              <label>
                Account
                <select value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
                  <option value="">No account selected</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} · {account.type}</option>
                  ))}
                </select>
              </label>
              <label>
                Mode
                <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentForm['paymentMode'] }))}>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT">Credit</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Reference number
                <input value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} placeholder="Receipt/reference number" />
              </label>
              <label>
                Bank UTR
                <input value={form.bankUtrNumber} onChange={(e) => setForm((f) => ({ ...f, bankUtrNumber: e.target.value }))} placeholder="Bank transfer UTR" />
              </label>
              <label>
                UPI reference
                <input value={form.upiReference} onChange={(e) => setForm((f) => ({ ...f, upiReference: e.target.value }))} placeholder="UPI transaction ref" />
              </label>
              <label>
                Notes / proof details
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Payment proof note, customer confirmation, attachment reference, etc." />
              </label>

              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Recording...' : 'Record payment'}
              </button>
            </form>
          )}
        </aside>
      </div>

      <section className="closure-card">
        <header>
          <div>
            <h2>Recent payment trail</h2>
            <p>Latest collections and reconciliation state.</p>
          </div>
        </header>
        {recentPayments.length === 0 ? (
          <EmptyState message="No payment records yet." />
        ) : (
          <div className="payment-trail-grid">
            {recentPayments.map((payment) => (
              <article key={payment.id} className="payment-trail-card">
                <span className="status-pill status-pill-default">{payment.reconciledStatus || 'UNRECONCILED'}</span>
                <strong>{payment.paymentNumber || payment.referenceNumber || payment.id}</strong>
                <small>{money(payment.amount)} · {payment.paymentMode} · {new Date(payment.paymentDate).toLocaleDateString('en-IN')}</small>
                <small>{payment.customer?.name || payment.tripBilling?.customer?.name || 'No customer'} · {payment.notes || 'No notes'}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .payment-closure-page { display: flex; flex-direction: column; gap: 1rem; }
        .closure-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
        .closure-metrics div { padding: 1rem; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 16px; }
        .closure-metrics strong { display: block; color: var(--color-text-primary); font-size: 1.45rem; }
        .closure-metrics span { color: var(--color-text-secondary); font-size: .85rem; }
        .closure-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 1rem; align-items: start; }
        .closure-card { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 18px; padding: 1rem; }
        .closure-card header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
        .closure-card h2 { margin: 0; color: var(--color-text-primary); font-size: 1rem; }
        .closure-card p { margin: .25rem 0 0; color: var(--color-text-secondary); font-size: .85rem; }
        .closure-list { display: flex; flex-direction: column; gap: .75rem; }
        .closure-item { display: flex; justify-content: space-between; gap: 1rem; padding: .9rem; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-background); cursor: pointer; }
        .closure-item:hover, .closure-item.selected { border-color: var(--color-primary); }
        .closure-item div:first-child { display: flex; flex-direction: column; gap: .25rem; min-width: 0; }
        .closure-item strong { color: var(--color-text-primary); }
        .closure-item span, .closure-item small { color: var(--color-text-secondary); }
        .closure-amount { display: flex; flex-direction: column; align-items: flex-end; gap: .25rem; min-width: 150px; }
        .closure-form { display: flex; flex-direction: column; gap: .75rem; }
        .closure-form label { display: flex; flex-direction: column; gap: .35rem; color: var(--color-text-secondary); font-size: .82rem; }
        .closure-form input, .closure-form select, .closure-form textarea { border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text-primary); border-radius: 10px; padding: .65rem .75rem; }
        .selected-invoice-card { padding: .9rem; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-background); display: flex; flex-direction: column; gap: .3rem; }
        .selected-invoice-card label { color: var(--color-text-secondary); font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; }
        .selected-invoice-card strong { color: var(--color-text-primary); font-size: 1.4rem; }
        .selected-invoice-card small { color: var(--color-text-secondary); }
        .payment-trail-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
        .payment-trail-card { display: flex; flex-direction: column; gap: .35rem; padding: .85rem; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-background); }
        .payment-trail-card strong { color: var(--color-text-primary); }
        .payment-trail-card small { color: var(--color-text-secondary); }
        @media (max-width: 1100px) { .closure-grid, .closure-metrics, .payment-trail-grid { grid-template-columns: 1fr; } .closure-item { flex-direction: column; } .closure-amount { align-items: flex-start; } }
      `}</style>
    </section>
  );
}
