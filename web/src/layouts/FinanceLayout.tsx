import { Outlet } from 'react-router-dom';

export function FinanceLayout() {
  return (
    <section className="finance-layout">
      <div className="finance-content">
        <Outlet />
      </div>
    </section>
  );
}
