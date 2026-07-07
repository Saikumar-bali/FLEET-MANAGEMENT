import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { ToastContainer } from '../components/ui/Toast';
import { AppLayout } from '../layouts/AppLayout';
import { FinanceLayout } from '../layouts/FinanceLayout';
import { HomeRoute } from '../pages/HomeRoute';
import { WorkspaceHome } from '../pages/workspace/WorkspaceHome';
import { LoginPage } from '../pages/LoginPage';
import { RolesPage } from '../pages/RolesPage';
import { UsersPage } from '../pages/UsersPage';
import { UserDetailPage } from '../pages/UserDetailPage';
import { MyAccessPage } from '../pages/MyAccessPage';
import { VehiclesPage } from '../pages/VehiclesPage';
import { VehicleDetailPage } from '../pages/VehicleDetailPage';
import { DriversPage } from '../pages/DriversPage';
import { DriverDetailPage } from '../pages/DriverDetailPage';
import { AssetsPage } from '../pages/AssetsPage';
import { AssetDetailPage } from '../pages/AssetDetailPage';
import { AssetCategoriesPage } from '../pages/AssetCategoriesPage';
import { TripsPage } from '../pages/TripsPage';
import { TripDetailPage } from '../pages/TripDetailPage';
import DispatchBoardPage from '../pages/DispatchBoardPage';
import { WorkflowListPage } from '../pages/WorkflowListPage';
import { WorkflowDetailPage } from '../pages/WorkflowDetailPage';
import { FuelEntryPage } from '../pages/FuelEntryPage';
import { RepairListPage } from '../pages/RepairListPage';
import { RepairDetailPage } from '../pages/RepairDetailPage';
import { ComplianceDashboardPage } from '../pages/ComplianceDashboardPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { AlertsPage } from '../pages/AlertsPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { DriverPortalLayout } from '../pages/driver-portal/DriverPortalLayout';
import { DriverPortalHome } from '../pages/driver-portal/DriverPortalHome';
import { DriverProfilePage } from '../pages/driver-portal/DriverProfilePage';
import { DriverTripsPage } from '../pages/driver-portal/DriverTripsPage';
import { DriverVehiclesPage } from '../pages/driver-portal/DriverVehiclesPage';
import { DriverDocumentsPage } from '../pages/driver-portal/DriverDocumentsPage';
import { DriverFuelPage } from '../pages/driver-portal/DriverFuelPage';
import { DriverExpensesPage } from '../pages/driver-portal/DriverExpensesPage';
import { DriverTripCreatePage } from '../pages/driver-portal/DriverTripCreatePage';
import { DriverFuelCreatePage } from '../pages/driver-portal/DriverFuelCreatePage';
import { DriverExpenseCreatePage } from '../pages/driver-portal/DriverExpenseCreatePage';
import { DriverDocumentUploadPage } from '../pages/driver-portal/DriverDocumentUploadPage';
import { DriverVehicleIssuePage } from '../pages/driver-portal/DriverVehicleIssuePage';
import { DriverVehicleInspectionPage } from '../pages/driver-portal/DriverVehicleInspectionPage';
import { lazy, Suspense } from 'react';

const FinancePage = lazy(() => import('../pages/FinancePage'));
const FinanceTransactionsPage = lazy(() => import('../pages/FinanceTransactionsPage'));
const FinanceAccountsPage = lazy(() => import('../pages/FinanceAccountsPage'));
const FinanceCategoriesPage = lazy(() => import('../pages/FinanceCategoriesPage'));
const FinanceVendorsPage = lazy(() => import('../pages/FinanceVendorsPage'));
const FinanceCustomersPage = lazy(() => import('../pages/FinanceCustomersPage'));
const FinanceTripBillingsPage = lazy(() => import('../pages/FinanceTripBillingsPage'));
const FinancePaymentsPage = lazy(() => import('../pages/FinancePaymentsPage'));
const FinanceReportsPage = lazy(() => import('../pages/FinanceReportsPage'));
const PodBillingChainPage = lazy(() => import('../pages/PodBillingChainPage'));
const DriverSubmissionsPage = lazy(() => import('../pages/driver-submissions/DriverSubmissionsPage').then(m => ({ default: m.DriverSubmissionsPage })));
const FuelSubmissionsPage = lazy(() => import('../pages/driver-submissions/FuelSubmissionsPage').then(m => ({ default: m.FuelSubmissionsPage })));
const ExpenseSubmissionsPage = lazy(() => import('../pages/driver-submissions/ExpenseSubmissionsPage').then(m => ({ default: m.ExpenseSubmissionsPage })));
const DocumentSubmissionsPage = lazy(() => import('../pages/driver-submissions/DocumentSubmissionsPage').then(m => ({ default: m.DocumentSubmissionsPage })));
const IssueSubmissionsPage = lazy(() => import('../pages/driver-submissions/IssueSubmissionsPage').then(m => ({ default: m.IssueSubmissionsPage })));
const InspectionSubmissionsPage = lazy(() => import('../pages/driver-submissions/InspectionSubmissionsPage').then(m => ({ default: m.InspectionSubmissionsPage })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <WorkspaceProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/workspace" element={<WorkspaceHome />} />
                <Route path="/alerts" element={<AlertsPage />} />
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
                  <Route path="/dispatch-board" element={<DispatchBoardPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/trips/:id" element={<TripDetailPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['fuel_view']} />}>
                  <Route path="/fuel" element={<WorkflowListPage kind="fuel" />} />
                  <Route path="/fuel/:id" element={<FuelEntryPage />} />
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
                <Route element={<ProtectedRoute requiredPermissions={['documents_view']} />}>
                  <Route path="/documents" element={<DocumentsPage />} />
                </Route>
                <Route element={<FinanceLayout />}>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view', 'pnl_view']} />}>
                    <Route path="/finance" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinancePage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_transactions_view']} />}>
                    <Route path="/finance/transactions" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceTransactionsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view']} />}>
                    <Route path="/finance/accounts" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceAccountsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view']} />}>
                    <Route path="/finance/categories" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceCategoriesPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['vendors_view']} />}>
                    <Route path="/finance/vendors" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceVendorsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['customers_view']} />}>
                    <Route path="/finance/customers" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceCustomersPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['trip_billing_view']} />}>
                    <Route path="/finance/pod-chain" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><PodBillingChainPage /></Suspense>} />
                    <Route path="/finance/trip-billings" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceTripBillingsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['payments_view']} />}>
                    <Route path="/finance/payments" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinancePaymentsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view', 'pnl_view']} />}>
                    <Route path="/finance/reports" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceReportsPage /></Suspense>} />
                  </Route>
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['role_view']} />}>
                  <Route path="/roles" element={<RolesPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['user_view']} />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                </Route>
                <Route path="/my-access" element={<MyAccessPage />} />
                <Route element={<DriverPortalLayout />}>
                  <Route path="/driver-portal" element={<DriverPortalHome />} />
                  <Route path="/driver-portal/profile" element={<DriverProfilePage />} />
                  <Route path="/driver-portal/trips" element={<DriverTripsPage />} />
                  <Route path="/driver-portal/vehicles" element={<DriverVehiclesPage />} />
                  <Route path="/driver-portal/documents" element={<DriverDocumentsPage />} />
                  <Route path="/driver-portal/fuel" element={<DriverFuelPage />} />
                  <Route path="/driver-portal/expenses" element={<DriverExpensesPage />} />
                  <Route path="/driver-portal/trips/create" element={<DriverTripCreatePage />} />
                  <Route path="/driver-portal/fuel/create" element={<DriverFuelCreatePage />} />
                  <Route path="/driver-portal/expenses/create" element={<DriverExpenseCreatePage />} />
                  <Route path="/driver-portal/documents/upload" element={<DriverDocumentUploadPage />} />
                  <Route path="/driver-portal/vehicles/issue" element={<DriverVehicleIssuePage />} />
                  <Route path="/driver-portal/vehicles/inspect" element={<DriverVehicleInspectionPage />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['driver_submission_view']} />}>
                  <Route path="/driver-submissions" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><DriverSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/fuel" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FuelSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/expenses" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><ExpenseSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/documents" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><DocumentSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/issues" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><IssueSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/inspections" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><InspectionSubmissionsPage /></Suspense>} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </WorkspaceProvider>
        </BrowserRouter>
        <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
