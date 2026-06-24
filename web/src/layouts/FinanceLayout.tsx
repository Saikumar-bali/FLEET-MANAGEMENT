import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const financeTabs = [
  { label: 'Dashboard', testId: 'finance-tab-dashboard', path: '/finance', permissionKeys: ['finance_view', 'pnl_view'] },
  { label: 'Transactions', testId: 'finance-tab-transactions', path: '/finance/transactions', permissionKeys: ['finance_transactions_view'] },
  { label: 'Accounts', testId: 'finance-tab-accounts', path: '/finance/accounts', permissionKeys: ['finance_view'] },
  { label: 'Categories', testId: 'finance-tab-categories', path: '/finance/categories', permissionKeys: ['finance_view'] },
  { label: 'Vendors', testId: 'finance-tab-vendors', path: '/finance/vendors', permissionKeys: ['vendors_view'] },
  { label: 'Customers', testId: 'finance-tab-customers', path: '/finance/customers', permissionKeys: ['customers_view'] },
  { label: 'Trip Billing', testId: 'finance-tab-trip-billing', path: '/finance/trip-billings', permissionKeys: ['trip_billing_view'] },
  { label: 'Payments', testId: 'finance-tab-payments', path: '/finance/payments', permissionKeys: ['payments_view'] },
];

export function FinanceLayout() {
  const auth = useAuth();
  const location = useLocation();

  const visibleTabs = financeTabs.filter((tab) =>
    tab.permissionKeys.length === 0 || auth.hasAnyPermission(tab.permissionKeys)
  );

  return (
    <section className="page-content">
      <div className="finance-tabs">
        {visibleTabs.map((tab) => {
          const isActive =
            tab.path === '/finance'
              ? location.pathname === '/finance'
              : location.pathname.startsWith(tab.path);

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/finance'}
              data-testid={tab.testId}
              className={`finance-tab${isActive ? ' finance-tab-active' : ''}`}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
      <div className="finance-content">
        <Outlet />
      </div>
    </section>
  );
}
