import { FormEvent, useEffect, useState } from 'react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Vendor } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type VendorForm = {
  name: string;
  vendorType: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
};

const initialForm: VendorForm = { name: '', vendorType: 'GENERAL', phone: '', email: '', gstin: '', address: '' };

const VENDOR_TYPE_OPTIONS = [
  { value: 'FUEL_STATION', label: 'Fuel Station' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PERMIT_AGENT', label: 'Permit Agent' },
  { value: 'RTO_AGENT', label: 'RTO Agent' },
  { value: 'GPS_VENDOR', label: 'GPS Vendor' },
  { value: 'GENERAL', label: 'General' },
];

export function FinanceVendorsPage() {
  const auth = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = vendors.find((v) => v.id === selectedId) ?? null;
  const canCreate = auth.hasPermission('vendors_create');
  const canUpdate = auth.hasPermission('vendors_update');
  const canDelete = auth.hasPermission('vendors_delete');
  const isCreateMode = selectedId === null;
  const canSubmit = isCreateMode ? canCreate : canUpdate;
  const submitLabel = isCreateMode ? 'Create Vendor' : 'Update Vendor';

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getVendors(auth.accessToken);
        setVendors(response.data.items);
        if (response.data.items.length > 0) {
          const first = response.data.items[0];
          setSelectedId(first.id);
          setForm({
            name: first.name,
            vendorType: first.vendorType,
            phone: first.phone ?? '',
            email: first.email ?? '',
            gstin: first.gstin ?? '',
            address: first.address ?? '',
          });
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load vendors.');
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
      vendorType: selected.vendorType,
      phone: selected.phone ?? '',
      email: selected.email ?? '',
      gstin: selected.gstin ?? '',
      address: selected.address ?? '',
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
      vendorType: form.vendorType,
      phone: form.phone || null,
      email: form.email || null,
      gstin: form.gstin || null,
      address: form.address || null,
    };

    try {
      if (selectedId) {
        const response = await updateVendor(auth.accessToken, selectedId, payload);
        setVendors((items) => items.map((v) => (v.id === selectedId ? response.data : v)));
        setMessage('Vendor updated.');
      } else {
        const response = await createVendor(auth.accessToken, payload);
        setVendors((items) => [...items, response.data]);
        setSelectedId(response.data.id);
        setMessage('Vendor created.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save vendor.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken || !window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await deleteVendor(auth.accessToken, id);
      setVendors((items) => items.filter((v) => v.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Vendor deleted.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete vendor.');
    }
  }

  if (isLoading) return <LoadingState message="Loading vendors..." />;
  if (error && vendors.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Vendors"
            description="Manage vendors and supplier information."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Vendor
            </button>
          ) : null}
        </div>
      </div>

      {error && !vendors.length ? <div className="error-banner">{error}</div> : null}

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Vendors</h3>
              <p className="table-toolbar-copy">{vendors.length} total vendors</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Vendor
              </button>
            ) : null}
          </div>

          {vendors.length === 0 ? (
            <EmptyState message="No vendors found. Create the first vendor to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>GSTIN</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className={vendor.id === selectedId ? 'row-active' : ''}
                    onClick={() => setSelectedId(vendor.id)}
                  >
                    <td><strong>{vendor.name}</strong></td>
                    <td>{vendor.vendorType}</td>
                    <td>{vendor.phone ?? '-'}</td>
                    <td>{vendor.email ?? '-'}</td>
                    <td>{vendor.gstin ?? '-'}</td>
                    <td><StatusBadge status={vendor.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td>
                      {canDelete ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(vendor.id); }}
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
                <h3 className="table-toolbar-title">{isCreateMode ? 'Create Vendor' : 'Edit Vendor'}</h3>
                <p className="table-toolbar-copy">
                  {selected ? `Editing ${selected.name}` : 'Add a new vendor'}
                </p>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Vendor Type</span>
                <select value={form.vendorType} onChange={(e) => setForm((f) => ({ ...f, vendorType: e.target.value }))}>
                  {VENDOR_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
                <span className="field-label">Address</span>
                <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={3} />
              </label>

              {error ? <div className="error-banner">{error}</div> : null}
              {message ? <div className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canSubmit ? (
                  <button type="submit" className="primary-button" disabled={isSaving}>
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

export default FinanceVendorsPage;
