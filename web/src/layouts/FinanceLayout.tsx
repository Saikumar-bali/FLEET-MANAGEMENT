import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const financeTabs = [
  { label: 'Dashboard', path: '/finance', permissionKeys: ['finance_view', 'pnl_view'] },
  { label: 'Transactions', path: '/finance/transactions', permissionKeys: ['finance_transactions_view'] },
  { label: 'Accounts', path: '/finance/accounts', permissionKeys: ['finance_view'] },
  { label: 'Categories', path: '/finance/categories', permissionKeys: ['finance_view'] },
  { label: 'Vendors', path: '/finance/vendors', permissionKeys: ['vendors_view'] },
  { label: 'Customers', path: '/finance/customers', permissionKeys: ['customers_view'] },
  { label: 'Trip Billing', path: '/finance/trip-billings', permissionKeys: ['trip_billing_view'] },
  { label: 'Payments', path: '/finance/payments', permissionKeys: ['payments_view'] },
];

export function FinanceLayout() {
  const auth = useAuth();
  const location = useLocation();

  const visibleTabs = financeTabs.filter((tab) =>
    tab.permissionKeys.length === 0 || auth.hasAnyPermission(tab.permissionKeys)
  );

  return (
    <section className="page-content">
      <nav className="finance-tabs" aria-label="Finance sections">
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
              className={`finance-tab${isActive ? ' finance-tab-active' : ''}`}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="finance-tab-content">
        <Outlet />
      </div>
    </section>
  );
}
