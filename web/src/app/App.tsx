import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AppLayout } from '../layouts/AppLayout';
import { FinanceLayout } from '../layouts/FinanceLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RolesPage } from '../pages/RolesPage';
import { UsersPage } from '../pages/UsersPage';
import { VehiclesPage } from '../pages/VehiclesPage';
import { VehicleDetailPage } from '../pages/VehicleDetailPage';
import { DriversPage } from '../pages/DriversPage';
import { DriverDetailPage } from '../pages/DriverDetailPage';
import { AssetsPage } from '../pages/AssetsPage';
import { AssetDetailPage } from '../pages/AssetDetailPage';
import { AssetCategoriesPage } from '../pages/AssetCategoriesPage';
import { TripsPage } from '../pages/TripsPage';
import { TripDetailPage } from '../pages/TripDetailPage';
import { WorkflowListPage } from '../pages/WorkflowListPage';
import { WorkflowDetailPage } from '../pages/WorkflowDetailPage';
import { RepairListPage } from '../pages/RepairListPage';
import { RepairDetailPage } from '../pages/RepairDetailPage';
import { ComplianceDashboardPage } from '../pages/ComplianceDashboardPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { lazy, Suspense } from 'react';

const FinancePage = lazy(() => import('../pages/FinancePage'));
const FinanceTransactionsPage = lazy(() => import('../pages/FinanceTransactionsPage'));
const FinanceAccountsPage = lazy(() => import('../pages/FinanceAccountsPage'));
const FinanceCategoriesPage = lazy(() => import('../pages/FinanceCategoriesPage'));
const FinanceVendorsPage = lazy(() => import('../pages/FinanceVendorsPage'));
const FinanceCustomersPage = lazy(() => import('../pages/FinanceCustomersPage'));
const FinanceTripBillingsPage = lazy(() => import('../pages/FinanceTripBillingsPage'));
const FinancePaymentsPage = lazy(() => import('../pages/FinancePaymentsPage'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route element={<ProtectedRoute requiredPermissions={['vehicle_view']} />}>
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['driver_view']} />}>
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/drivers/:id" element={<DriverDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['asset_view']} />}>
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/assets/:id" element={<AssetDetailPage />} />
                  <Route path="/asset-categories" element={<AssetCategoriesPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['trip_view']} />}>
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/trips/:id" element={<TripDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['fuel_view']} />}>
                  <Route path="/fuel" element={<WorkflowListPage kind="fuel" />} />
                  <Route path="/fuel/:id" element={<WorkflowDetailPage kind="fuel" />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['expense_view']} />}>
                  <Route path="/expenses" element={<WorkflowListPage kind="expense" />} />
                  <Route path="/expenses/:id" element={<WorkflowDetailPage kind="expense" />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['maintenance_view']} />}>
                  <Route path="/maintenance" element={<WorkflowListPage kind="maintenance" />} />
                  <Route path="/maintenance/:id" element={<WorkflowDetailPage kind="maintenance" />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['repair_view']} />}>
                  <Route path="/repairs" element={<RepairListPage />} />
                  <Route path="/repairs/:id" element={<RepairDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['vehicle_compliance_view']} />}>
                  <Route path="/compliance" element={<ComplianceDashboardPage />} />
                </Route>
                <Route element={<FinanceLayout />}>
                  <Route path="/finance" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinancePage /></Suspense>} />
                  <Route path="/finance/transactions" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceTransactionsPage /></Suspense>} />
                  <Route path="/finance/accounts" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceAccountsPage /></Suspense>} />
                  <Route path="/finance/categories" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceCategoriesPage /></Suspense>} />
                  <Route path="/finance/vendors" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceVendorsPage /></Suspense>} />
                  <Route path="/finance/customers" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceCustomersPage /></Suspense>} />
                  <Route path="/finance/trip-billings" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceTripBillingsPage /></Suspense>} />
                  <Route path="/finance/payments" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinancePaymentsPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['role_view']} />}>
                  <Route path="/roles" element={<RolesPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['user_view']} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
