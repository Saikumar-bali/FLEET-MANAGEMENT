import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const financeGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', testId: 'finance-tab-dashboard', path: '/finance', permissionKeys: ['finance_view', 'pnl_view'] }],
  },
  {
    label: 'Cash & claims',
    items: [
      { label: 'Staff cash', testId: 'finance-tab-staff-cash', path: '/finance/staff-cash', permissionKeys: ['staff_wallet_view', 'staff_advance_manage'] },
      { label: 'Transactions', testId: 'finance-tab-transactions', path: '/finance/transactions', permissionKeys: ['finance_transactions_view'] },
    ],
  },
  {
    label: 'Billing & collections',
    items: [
      { label: 'POD chain', testId: 'finance-tab-pod-chain', path: '/finance/pod-chain', permissionKeys: ['trip_billing_view', 'finance_approve', 'driver_document_verify', 'documents_verify'] },
      { label: 'Invoices', testId: 'finance-tab-trip-billing', path: '/finance/trip-billings', permissionKeys: ['trip_billing_view'] },
      { label: 'Payments', testId: 'finance-tab-payments', path: '/finance/payments', permissionKeys: ['payments_view'] },
    ],
  },
  {
    label: 'Ledger & setup',
    items: [
      { label: 'Accounts', testId: 'finance-tab-accounts', path: '/finance/accounts', permissionKeys: ['finance_view'] },
      { label: 'Vendors', testId: 'finance-tab-vendors', path: '/finance/vendors', permissionKeys: ['vendors_view'] },
      { label: 'Customers', testId: 'finance-tab-customers', path: '/finance/customers', permissionKeys: ['customers_view'] },
      { label: 'Reports', testId: 'finance-tab-reports', path: '/finance/reports', permissionKeys: ['finance_view', 'pnl_view'] },
      { label: 'Categories', testId: 'finance-tab-categories', path: '/finance/categories', permissionKeys: ['finance_view'] },
    ],
  },
];

export function FinanceLayout() {
  const auth = useAuth();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;

  return (
    <section className="finance-layout">
      <div className="finance-nav" data-testid="finance-grouped-navigation">
        {financeGroups.map((group) => {
          const visible = group.items.filter((item) => auth.hasAnyPermission(item.permissionKeys));
          if (visible.length === 0) return null;
          return (
            <div className="finance-nav-group" key={group.label}>
              <span className="finance-nav-label">{group.label}</span>
              <div className="finance-nav-items">
                {visible.map((item) => {
                  const active = item.path === '/finance'
                    ? location.pathname === '/finance'
                    : currentPath === item.path || location.pathname.startsWith(item.path);
                  return <NavLink key={item.path} to={item.path} end={item.path === '/finance'} data-testid={item.testId} className={`finance-tab${active ? ' finance-tab-active' : ''}`}>{item.label}</NavLink>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="finance-content"><Outlet /></div>
    </section>
  );
}
