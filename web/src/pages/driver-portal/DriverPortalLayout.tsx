import { Outlet } from 'react-router-dom';

export function DriverPortalLayout() {
  return (
    <section className="driver-portal-layout">
      <Outlet />
    </section>
  );
}
