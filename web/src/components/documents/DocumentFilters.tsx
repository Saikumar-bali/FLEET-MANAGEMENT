import { useState } from 'react';

type FilterState = {
  search: string;
  documentCategory: string;
  documentType: string;
  status: string;
  verificationStatus: string;
  expiringBefore: string;
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

const CATEGORIES = ['', 'VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL'];
const STATUSES = ['', 'ACTIVE', 'ARCHIVED'];
const VERIFICATION_STATUSES = ['', 'PENDING', 'VERIFIED', 'REJECTED'];
const EXPIRY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Expiring in 7 days', value: '7' },
  { label: 'Expiring in 30 days', value: '30' },
  { label: 'Expiring in 90 days', value: '90' },
];

export function DocumentFilters({ filters, onChange }: Props) {
  const [local, setLocal] = useState(filters);

  const update = (key: keyof FilterState, value: string) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <input
          type="text"
          value={local.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search documents..."
          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
        <select
          value={local.documentCategory}
          onChange={(e) => update('documentCategory', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || 'All Categories'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          value={local.status}
          onChange={(e) => update('status', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Verification</label>
        <select
          value={local.verificationStatus}
          onChange={(e) => update('verificationStatus', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {VERIFICATION_STATUSES.map((v) => (
            <option key={v} value={v}>{v || 'All'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Expiry</label>
        <select
          value={local.expiringBefore}
          onChange={(e) => {
            const days = e.target.value;
            if (days) {
              const d = new Date();
              d.setDate(d.getDate() + Number(days));
              update('expiringBefore', d.toISOString());
            } else {
              update('expiringBefore', '');
            }
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {EXPIRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value === '' ? '' : new Date(Date.now() + Number(o.value) * 86400000).toISOString()}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
