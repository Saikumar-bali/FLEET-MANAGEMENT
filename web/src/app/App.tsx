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
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { DriverPortalLayout } from '../pages/driver-portal/DriverPortalLayout';
import { lazy, Suspense } from 'react';

const Loading = () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

// Core pages — named exports wrapped for lazy()
const RolesPage = lazy(() => import('../pages/RolesPage').then(m => ({ default: m.RolesPage })));
const UsersPage = lazy(() => import('../pages/UsersPage').then(m => ({ default: m.UsersPage })));
const UserDetailPage = lazy(() => import('../pages/UserDetailPage').then(m => ({ default: m.UserDetailPage })));
const MyAccessPage = lazy(() => import('../pages/MyAccessPage').then(m => ({ default: m.MyAccessPage })));
const VehiclesPage = lazy(() => import('../pages/VehiclesPage').then(m => ({ default: m.VehiclesPage })));
const VehicleDetailPage = lazy(() => import('../pages/VehicleDetailPage').then(m => ({ default: m.VehicleDetailPage })));
const DriversPage = lazy(() => import('../pages/DriversPage').then(m => ({ default: m.DriversPage })));
const DriverDetailPage = lazy(() => import('../pages/DriverDetailPage').then(m => ({ default: m.DriverDetailPage })));
const AssetsPage = lazy(() => import('../pages/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AssetDetailPage = lazy(() => import('../pages/AssetDetailPage').then(m => ({ default: m.AssetDetailPage })));
const AssetCategoriesPage = lazy(() => import('../pages/AssetCategoriesPage').then(m => ({ default: m.AssetCategoriesPage })));
const TripsPage = lazy(() => import('../pages/TripsPage').then(m => ({ default: m.TripsPage })));
const TripDetailPage = lazy(() => import('../pages/TripDetailPage').then(m => ({ default: m.TripDetailPage })));
const DispatchBoardPage = lazy(() => import('../pages/DispatchBoardPage'));
const WorkflowListPage = lazy(() => import('../pages/WorkflowListPage').then(m => ({ default: m.WorkflowListPage })));
const WorkflowDetailPage = lazy(() => import('../pages/WorkflowDetailPage').then(m => ({ default: m.WorkflowDetailPage })));
const FuelEntryPage = lazy(() => import('../pages/FuelEntryPage').then(m => ({ default: m.FuelEntryPage })));
const RepairListPage = lazy(() => import('../pages/RepairListPage').then(m => ({ default: m.RepairListPage })));
const RepairDetailPage = lazy(() => import('../pages/RepairDetailPage').then(m => ({ default: m.RepairDetailPage })));
const ComplianceDashboardPage = lazy(() => import('../pages/ComplianceDashboardPage').then(m => ({ default: m.ComplianceDashboardPage })));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const AlertsPage = lazy(() => import('../pages/AlertsPage').then(m => ({ default: m.AlertsPage })));

// Finance pages — most have default exports
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

// Driver portal pages — named exports
const DriverPortalHome = lazy(() => import('../pages/driver-portal/DriverPortalHome').then(m => ({ default: m.DriverPortalHome })));
const DriverProfilePage = lazy(() => import('../pages/driver-portal/DriverProfilePage').then(m => ({ default: m.DriverProfilePage })));
const DriverTripsPage = lazy(() => import('../pages/driver-portal/DriverTripsPage').then(m => ({ default: m.DriverTripsPage })));
const DriverVehiclesPage = lazy(() => import('../pages/driver-portal/DriverVehiclesPage').then(m => ({ default: m.DriverVehiclesPage })));
const DriverDocumentsPage = lazy(() => import('../pages/driver-portal/DriverDocumentsPage').then(m => ({ default: m.DriverDocumentsPage })));
const DriverFuelPage = lazy(() => import('../pages/driver-portal/DriverFuelPage').then(m => ({ default: m.DriverFuelPage })));
const DriverExpensesPage = lazy(() => import('../pages/driver-portal/DriverExpensesPage').then(m => ({ default: m.DriverExpensesPage })));
const DriverTripCreatePage = lazy(() => import('../pages/driver-portal/DriverTripCreatePage').then(m => ({ default: m.DriverTripCreatePage })));
const DriverFuelCreatePage = lazy(() => import('../pages/driver-portal/DriverFuelCreatePage').then(m => ({ default: m.DriverFuelCreatePage })));
const DriverExpenseCreatePage = lazy(() => import('../pages/driver-portal/DriverExpenseCreatePage').then(m => ({ default: m.DriverExpenseCreatePage })));
const DriverDocumentUploadPage = lazy(() => import('../pages/driver-portal/DriverDocumentUploadPage').then(m => ({ default: m.DriverDocumentUploadPage })));
const DriverVehicleIssuePage = lazy(() => import('../pages/driver-portal/DriverVehicleIssuePage').then(m => ({ default: m.DriverVehicleIssuePage })));
const DriverVehicleInspectionPage = lazy(() => import('../pages/driver-portal/DriverVehicleInspectionPage').then(m => ({ default: m.DriverVehicleInspectionPage })));

// Driver submissions
>>>>>>> Stashed changes
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
                <Route path="/alerts" element={<Suspense fallback={<Loading />}><AlertsPage /></Suspense>} />
                <Route element={<ProtectedRoute requiredPermissions={['vehicle_view']} />}>
                  <Route path="/vehicles" element={<Suspense fallback={<Loading />}><VehiclesPage /></Suspense>} />
                  <Route path="/vehicles/:id" element={<Suspense fallback={<Loading />}><VehicleDetailPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['driver_view']} />}>
                  <Route path="/drivers" element={<Suspense fallback={<Loading />}><DriversPage /></Suspense>} />
                  <Route path="/drivers/:id" element={<Suspense fallback={<Loading />}><DriverDetailPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['asset_view']} />}>
                  <Route path="/assets" element={<Suspense fallback={<Loading />}><AssetsPage /></Suspense>} />
                  <Route path="/assets/:id" element={<Suspense fallback={<Loading />}><AssetDetailPage /></Suspense>} />
                  <Route path="/asset-categories" element={<Suspense fallback={<Loading />}><AssetCategoriesPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['trip_view']} />}>
                  <Route path="/dispatch-board" element={<Suspense fallback={<Loading />}><DispatchBoardPage /></Suspense>} />
                  <Route path="/trips" element={<Suspense fallback={<Loading />}><TripsPage /></Suspense>} />
                  <Route path="/trips/:id" element={<Suspense fallback={<Loading />}><TripDetailPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['fuel_view']} />}>
                  <Route path="/fuel" element={<Suspense fallback={<Loading />}><WorkflowListPage kind="fuel" /></Suspense>} />
                  <Route path="/fuel/:id" element={<Suspense fallback={<Loading />}><FuelEntryPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['expense_view']} />}>
                  <Route path="/expenses" element={<Suspense fallback={<Loading />}><WorkflowListPage kind="expense" /></Suspense>} />
                  <Route path="/expenses/:id" element={<Suspense fallback={<Loading />}><WorkflowDetailPage kind="expense" /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['maintenance_view']} />}>
                  <Route path="/maintenance" element={<Suspense fallback={<Loading />}><WorkflowListPage kind="maintenance" /></Suspense>} />
                  <Route path="/maintenance/:id" element={<Suspense fallback={<Loading />}><WorkflowDetailPage kind="maintenance" /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['repair_view']} />}>
                  <Route path="/repairs" element={<Suspense fallback={<Loading />}><RepairListPage /></Suspense>} />
                  <Route path="/repairs/:id" element={<Suspense fallback={<Loading />}><RepairDetailPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['vehicle_compliance_view']} />}>
                  <Route path="/compliance" element={<Suspense fallback={<Loading />}><ComplianceDashboardPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['documents_view']} />}>
                  <Route path="/documents" element={<Suspense fallback={<Loading />}><DocumentsPage /></Suspense>} />
                </Route>
                <Route element={<FinanceLayout />}>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view', 'pnl_view']} />}>
                    <Route path="/finance" element={<Suspense fallback={<Loading />}><FinancePage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_transactions_view']} />}>
                    <Route path="/finance/transactions" element={<Suspense fallback={<Loading />}><FinanceTransactionsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view']} />}>
                    <Route path="/finance/accounts" element={<Suspense fallback={<Loading />}><FinanceAccountsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view']} />}>
                    <Route path="/finance/categories" element={<Suspense fallback={<Loading />}><FinanceCategoriesPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['vendors_view']} />}>
                    <Route path="/finance/vendors" element={<Suspense fallback={<Loading />}><FinanceVendorsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['customers_view']} />}>
                    <Route path="/finance/customers" element={<Suspense fallback={<Loading />}><FinanceCustomersPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['trip_billing_view']} />}>
                    <Route path="/finance/pod-chain" element={<Suspense fallback={<Loading />}><PodBillingChainPage /></Suspense>} />
                    <Route path="/finance/trip-billings" element={<Suspense fallback={<Loading />}><FinanceTripBillingsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['payments_view']} />}>
                    <Route path="/finance/payments" element={<Suspense fallback={<Loading />}><FinancePaymentsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['finance_view', 'pnl_view']} />}>
                    <Route path="/finance/reports" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceReportsPage /></Suspense>} />
                  </Route>
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['role_view']} />}>
                  <Route path="/roles" element={<Suspense fallback={<Loading />}><RolesPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['user_view']} />}>
                  <Route path="/users" element={<Suspense fallback={<Loading />}><UsersPage /></Suspense>} />
                  <Route path="/users/:id" element={<Suspense fallback={<Loading />}><UserDetailPage /></Suspense>} />
                </Route>
                <Route path="/my-access" element={<Suspense fallback={<Loading />}><MyAccessPage /></Suspense>} />
                <Route element={<DriverPortalLayout />}>
                  <Route path="/driver-portal" element={<Suspense fallback={<Loading />}><DriverPortalHome /></Suspense>} />
                  <Route path="/driver-portal/profile" element={<Suspense fallback={<Loading />}><DriverProfilePage /></Suspense>} />
                  <Route path="/driver-portal/trips" element={<Suspense fallback={<Loading />}><DriverTripsPage /></Suspense>} />
                  <Route path="/driver-portal/vehicles" element={<Suspense fallback={<Loading />}><DriverVehiclesPage /></Suspense>} />
                  <Route path="/driver-portal/documents" element={<Suspense fallback={<Loading />}><DriverDocumentsPage /></Suspense>} />
                  <Route path="/driver-portal/fuel" element={<Suspense fallback={<Loading />}><DriverFuelPage /></Suspense>} />
                  <Route path="/driver-portal/expenses" element={<Suspense fallback={<Loading />}><DriverExpensesPage /></Suspense>} />
                  <Route path="/driver-portal/trips/create" element={<Suspense fallback={<Loading />}><DriverTripCreatePage /></Suspense>} />
                  <Route path="/driver-portal/fuel/create" element={<Suspense fallback={<Loading />}><DriverFuelCreatePage /></Suspense>} />
                  <Route path="/driver-portal/expenses/create" element={<Suspense fallback={<Loading />}><DriverExpenseCreatePage /></Suspense>} />
                  <Route path="/driver-portal/documents/upload" element={<Suspense fallback={<Loading />}><DriverDocumentUploadPage /></Suspense>} />
                  <Route path="/driver-portal/vehicles/issue" element={<Suspense fallback={<Loading />}><DriverVehicleIssuePage /></Suspense>} />
                  <Route path="/driver-portal/vehicles/inspect" element={<Suspense fallback={<Loading />}><DriverVehicleInspectionPage /></Suspense>} />
                </Route>
                <Route element={<ProtectedRoute requiredPermissions={['driver_submission_view']} />}>
                  <Route path="/driver-submissions/fuel" element={<Suspense fallback={<Loading />}><FuelSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/expenses" element={<Suspense fallback={<Loading />}><ExpenseSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/documents" element={<Suspense fallback={<Loading />}><DocumentSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/issues" element={<Suspense fallback={<Loading />}><IssueSubmissionsPage /></Suspense>} />
                  <Route path="/driver-submissions/inspections" element={<Suspense fallback={<Loading />}><InspectionSubmissionsPage /></Suspense>} />
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
