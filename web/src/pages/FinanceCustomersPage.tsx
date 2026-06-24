import { FormEvent, useEffect, useState } from 'react';
import { getFinanceCustomers, createFinanceCustomer, updateFinanceCustomer, deleteFinanceCustomer } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Customer } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  customerCode: string;
  legalName: string;
  tradeName: string;
  customerType: string;
  pan: string;
  state: string;
  stateCode: string;
  pincode: string;
  contactPersonName: string;
  contactPersonPhone: string;
  paymentTermsDays: string;
  creditLimit: string;
  isGstRegistered: boolean;
};

const initialForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  gstin: '',
  billingAddress: '',
  shippingAddress: '',
  customerCode: '',
  legalName: '',
  tradeName: '',
  customerType: '',
  pan: '',
  state: '',
  stateCode: '',
  pincode: '',
  contactPersonName: '',
  contactPersonPhone: '',
  paymentTermsDays: '',
  creditLimit: '',
  isGstRegistered: false,
};

export function FinanceCustomersPage() {
  const auth = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const canCreate = auth.hasPermission('customers_create');
  const canUpdate = auth.hasPermission('customers_update');
  const canDelete = auth.hasPermission('customers_delete');
  const isCreateMode = selectedId === null;
  const canSubmit = isCreateMode ? canCreate : canUpdate;
  const submitLabel = isCreateMode ? 'Create Customer' : 'Update Customer';

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getFinanceCustomers(auth.accessToken);
        const items = response.data?.items ?? [];
        setCustomers(items);
        if (items.length > 0) {
          const first = items[0];
          setSelectedId(first.id);
          setForm({
            name: first.name,
            phone: first.phone ?? '',
            email: first.email ?? '',
            gstin: first.gstin ?? '',
            billingAddress: first.billingAddress ?? '',
            shippingAddress: first.shippingAddress ?? '',
            customerCode: first.customerCode ?? '',
            legalName: first.legalName ?? '',
            tradeName: first.tradeName ?? '',
            customerType: first.customerType ?? '',
            pan: first.pan ?? '',
            state: first.state ?? '',
            stateCode: first.stateCode ?? '',
            pincode: first.pincode ?? '',
            contactPersonName: first.contactPersonName ?? '',
            contactPersonPhone: first.contactPersonPhone ?? '',
            paymentTermsDays: first.paymentTermsDays != null ? String(first.paymentTermsDays) : '',
            creditLimit: first.creditLimit != null ? String(first.creditLimit) : '',
            isGstRegistered: first.isGstRegistered ?? false,
          });
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load customers.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name,
      phone: selected.phone ?? '',
      email: selected.email ?? '',
      gstin: selected.gstin ?? '',
      billingAddress: selected.billingAddress ?? '',
      shippingAddress: selected.shippingAddress ?? '',
      customerCode: selected.customerCode ?? '',
      legalName: selected.legalName ?? '',
      tradeName: selected.tradeName ?? '',
      customerType: selected.customerType ?? '',
      pan: selected.pan ?? '',
      state: selected.state ?? '',
      stateCode: selected.stateCode ?? '',
      pincode: selected.pincode ?? '',
      contactPersonName: selected.contactPersonName ?? '',
      contactPersonPhone: selected.contactPersonPhone ?? '',
      paymentTermsDays: selected.paymentTermsDays != null ? String(selected.paymentTermsDays) : '',
      creditLimit: selected.creditLimit != null ? String(selected.creditLimit) : '',
      isGstRegistered: selected.isGstRegistered ?? false,
    });
    setMessage(null);
  }, [selected]);

  function startCreateMode() {
    setSelectedId(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      gstin: form.gstin || null,
      billingAddress: form.billingAddress || null,
      shippingAddress: form.shippingAddress || null,
      customerCode: form.customerCode || null,
      legalName: form.legalName || null,
      tradeName: form.tradeName || null,
      customerType: form.customerType || null,
      pan: form.pan || null,
      state: form.state || null,
      stateCode: form.stateCode || null,
      pincode: form.pincode || null,
      contactPersonName: form.contactPersonName || null,
      contactPersonPhone: form.contactPersonPhone || null,
      paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : null,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
      isGstRegistered: form.isGstRegistered,
    };

    try {
      if (selectedId) {
        const response = await updateFinanceCustomer(auth.accessToken, selectedId, payload);
        setCustomers((items) => items.map((c) => (c.id === selectedId ? response.data : c)));
        setMessage('Customer updated.');
      } else {
        const response = await createFinanceCustomer(auth.accessToken, payload);
        setCustomers((items) => [...items, response.data]);
        setSelectedId(response.data.id);
        setMessage('Customer created.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save customer.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken || !window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteFinanceCustomer(auth.accessToken, id);
      setCustomers((items) => items.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Customer deleted.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete customer.');
    }
  }

  if (isLoading) return <LoadingState message="Loading customers..." />;
  if (error && customers.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Customers"
            description="Manage customer information and billing details."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Customer
            </button>
          ) : null}
        </div>
      </div>

      {error && !customers.length ? <div className="error-banner">{error}</div> : null}

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Customers</h3>
              <p className="table-toolbar-copy">{customers.length} total customers</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Customer
              </button>
            ) : null}
          </div>

          {customers.length === 0 ? (
            <EmptyState message="No customers found. Create the first customer to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>State</th>
                  <th>GSTIN</th>
                  <th>PAN</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={customer.id === selectedId ? 'row-active' : ''}
                    onClick={() => setSelectedId(customer.id)}
                  >
                    <td>{customer.customerCode ?? '-'}</td>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.state ?? '-'}</td>
                    <td>{customer.gstin ?? '-'}</td>
                    <td>{customer.pan ?? '-'}</td>
                    <td><StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td>
                      {canDelete ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(customer.id); }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <aside className="detail-panel">
          <article className="card detail-card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">{isCreateMode ? 'Create Customer' : 'Edit Customer'}</h3>
                <p className="table-toolbar-copy">
                  {selected ? `Editing ${selected.name}` : 'Add a new customer'}
                </p>
              </div>
            </div>

            <form data-testid="finance-customer-form" className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Phone</span>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">GSTIN</span>
                <input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Billing Address</span>
                <textarea value={form.billingAddress} onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))} rows={3} />
              </label>
              <label>
                <span className="field-label">Shipping Address</span>
                <textarea value={form.shippingAddress} onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))} rows={3} />
              </label>
              <label>
                <span className="field-label">Customer Code</span>
                <input value={form.customerCode} onChange={(e) => setForm((f) => ({ ...f, customerCode: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Legal Name</span>
                <input value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Trade Name</span>
                <input value={form.tradeName} onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Customer Type</span>
                <select value={form.customerType} onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}>
                  <option value="">Select type</option>
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                  <option value="GOVERNMENT">GOVERNMENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <label>
                <span className="field-label">PAN</span>
                <input value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">State</span>
                <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">State Code</span>
                <input value={form.stateCode} onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Pincode</span>
                <input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Contact Person Name</span>
                <input value={form.contactPersonName} onChange={(e) => setForm((f) => ({ ...f, contactPersonName: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Contact Person Phone</span>
                <input value={form.contactPersonPhone} onChange={(e) => setForm((f) => ({ ...f, contactPersonPhone: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Payment Terms (Days)</span>
                <input type="number" min="0" value={form.paymentTermsDays} onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Credit Limit</span>
                <input type="number" min="0" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
              </label>
              <label>
                <input type="checkbox" checked={form.isGstRegistered} onChange={(e) => setForm((f) => ({ ...f, isGstRegistered: e.target.checked }))} />
                <span className="field-label">GST Registered</span>
              </label>

              {error ? <div data-testid="finance-error" className="error-banner">{error}</div> : null}
              {message ? <div data-testid="finance-success" className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canSubmit ? (
                  <button data-testid="finance-save-button" type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : submitLabel}
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default FinanceCustomersPage;
