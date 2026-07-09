import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { label: 'Home', path: '/driver-portal', permissions: ['driver_portal_view'] },
  { label: 'Trips', path: '/driver-portal/trips', permissions: ['driver_my_trips_view', 'driver_trip_view'] },
  { label: 'Vehicle', path: '/driver-portal/vehicles', permissions: ['driver_vehicle_checkout_view_own', 'vehicle_view'] },
  { label: 'Fuel', path: '/driver-portal/fuel', permissions: ['driver_quick_fuel_create', 'driver_fuel_view_own'] },
  { label: 'Expenses', path: '/driver-portal/expenses', permissions: ['driver_expense_create', 'driver_expense_view_own'] },
  { label: 'Advances', path: '/driver-portal/advances', permissions: ['driver_advance_view_own', 'driver_settlement_view_own'] },
  { label: 'Documents', path: '/driver-portal/documents', permissions: ['driver_my_documents_view', 'driver_document_upload'] },
];

export function DriverPortalLayout() {
  const auth = useAuth();
  const location = useLocation();
  const visibleTabs = tabs.filter((tab) => auth.hasAnyPermission(tab.permissions));

  return (
    <section className="driver-portal-layout">
      <div className="finance-tabs" style={{ marginBottom: '1rem' }}>
        {visibleTabs.map((tab) => {
          const active = tab.path === '/driver-portal'
            ? location.pathname === '/driver-portal'
            : location.pathname.startsWith(tab.path);
          return <NavLink key={tab.path} to={tab.path} className={`finance-tab${active ? ' finance-tab-active' : ''}`}>{tab.label}</NavLink>;
        })}
      </div>
      <Outlet />
    </section>
  );
}
