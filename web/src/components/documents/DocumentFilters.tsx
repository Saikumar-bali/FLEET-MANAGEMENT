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
const DOC_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Vehicle RC', value: 'VEHICLE_RC' },
  { label: 'Insurance', value: 'VEHICLE_INSURANCE' },
  { label: 'Permit', value: 'VEHICLE_PERMIT' },
  { label: 'Fitness', value: 'VEHICLE_FITNESS' },
  { label: 'PUC', value: 'VEHICLE_PUC' },
  { label: 'Road Tax', value: 'ROAD_TAX' },
  { label: 'FASTAG', value: 'FASTAG' },
  { label: 'AIS140 GPS', value: 'AIS140_GPS' },
  { label: 'License', value: 'DRIVER_LICENSE' },
  { label: 'ID Proof', value: 'DRIVER_ID_PROOF' },
  { label: 'POD', value: 'TRIP_POD' },
  { label: 'Challan', value: 'TRIP_CHALLAN' },
  { label: 'LR', value: 'TRIP_LR' },
  { label: 'E-Way Bill', value: 'TRIP_EWAY_BILL' },
  { label: 'Invoice', value: 'INVOICE' },
  { label: 'Payment Proof', value: 'PAYMENT_PROOF' },
  { label: 'Fuel Bill', value: 'FUEL_BILL' },
  { label: 'Expense Bill', value: 'EXPENSE_BILL' },
  { label: 'General', value: 'GENERAL' },
];

export function DocumentFilters({ filters, onChange }: Props) {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="doc-toolbar">
      <div className="doc-toolbar-search">
        <svg className="doc-toolbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search documents..."
          className="doc-toolbar-search-input"
        />
      </div>
      <div className="doc-toolbar-filters">
        <select value={filters.documentCategory} onChange={(e) => update('documentCategory', e.target.value)} className="doc-toolbar-select">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
        <select value={filters.documentType} onChange={(e) => update('documentType', e.target.value)} className="doc-toolbar-select">
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => update('status', e.target.value)} className="doc-toolbar-select">
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select value={filters.verificationStatus} onChange={(e) => update('verificationStatus', e.target.value)} className="doc-toolbar-select">
          {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{v || 'All Verification'}</option>)}
        </select>
        <select
          value={filters.expiringBefore ? String(Math.ceil((new Date(filters.expiringBefore).getTime() - Date.now()) / 86400000)) : ''}
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
          className="doc-toolbar-select"
        >
          {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
