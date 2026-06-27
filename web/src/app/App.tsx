import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ui/Toast';
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
import { FuelEntryPage } from '../pages/FuelEntryPage';
import { RepairListPage } from '../pages/RepairListPage';
import { RepairDetailPage } from '../pages/RepairDetailPage';
import { ComplianceDashboardPage } from '../pages/ComplianceDashboardPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { DriverDashboardPage } from '../pages/DriverDashboardPage';
import { MyProfilePage } from '../pages/MyProfilePage';
import { MyTripsPage } from '../pages/MyTripsPage';
import { MyDocumentsPage } from '../pages/MyDocumentsPage';
import { MyTripCreatePage } from '../pages/driver/MyTripCreatePage';
import { MyTripDetailPage } from '../pages/driver/MyTripDetailPage';
import { MyFuelPage } from '../pages/driver/MyFuelPage';
import { MyFuelCreatePage } from '../pages/driver/MyFuelCreatePage';
import { MyFuelReceiptUploadPage } from '../pages/driver/MyFuelReceiptUploadPage';
import { MyExpensesPage } from '../pages/driver/MyExpensesPage';
import { MyExpenseCreatePage } from '../pages/driver/MyExpenseCreatePage';
import { MyVehiclePage } from '../pages/driver/MyVehiclePage';
import { MyVehicleInspectionPage } from '../pages/driver/MyVehicleInspectionPage';
import { MyVehicleIssueReportPage } from '../pages/driver/MyVehicleIssueReportPage';
import { MyMaintenanceReportPage } from '../pages/driver/MyMaintenanceReportPage';
import { MyRepairReportPage } from '../pages/driver/MyRepairReportPage';
import { MyTripDocumentUploadPage } from '../pages/driver/MyTripDocumentUploadPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { DriverOnlyRoute } from '../routes/DriverOnlyRoute';
import { PermissionRoute } from '../routes/PermissionRoute';
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
        <ToastProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route element={<DriverOnlyRoute />}>
                  <Route path="/my-dashboard" element={<DriverDashboardPage />} />
                  <Route path="/my-trips" element={<MyTripsPage />} />
                  <Route path="/my-trips/new" element={<PermissionRoute requiredPermissions={['driver_trip_create']} />}>
                    <Route path="" element={<MyTripCreatePage />} />
                  </Route>
                  <Route path="/my-trips/upload-pod" element={<PermissionRoute requiredPermissions={['driver_pod_upload']} />}>
                    <Route path="" element={<MyTripDocumentUploadPage />} />
                  </Route>
                  <Route path="/my-trips/upload-document" element={<PermissionRoute requiredPermissions={['driver_trip_document_upload', 'driver_lr_upload', 'driver_challan_upload']} />}>
                    <Route path="" element={<MyTripDocumentUploadPage />} />
                  </Route>
                  <Route path="/my-trips/:id" element={<MyTripDetailPage />} />
                  <Route path="/my-fuel" element={<PermissionRoute requiredPermissions={['driver_fuel_view_own']} />}>
                    <Route path="" element={<MyFuelPage />} />
                  </Route>
                  <Route path="/my-fuel/new" element={<PermissionRoute requiredPermissions={['driver_quick_fuel_create']} />}>
                    <Route path="" element={<MyFuelCreatePage />} />
                  </Route>
                  <Route path="/my-fuel/upload-receipt" element={<PermissionRoute requiredPermissions={['driver_fuel_receipt_upload']} />}>
                    <Route path="" element={<MyFuelReceiptUploadPage />} />
                  </Route>
                  <Route path="/my-expenses" element={<PermissionRoute requiredPermissions={['driver_expense_view_own']} />}>
                    <Route path="" element={<MyExpensesPage />} />
                  </Route>
                  <Route path="/my-expenses/new" element={<PermissionRoute requiredPermissions={['driver_expense_create']} />}>
                    <Route path="" element={<MyExpenseCreatePage />} />
                  </Route>
                  <Route path="/my-vehicle" element={<PermissionRoute requiredPermissions={['driver_assigned_vehicle_view']} />}>
                    <Route path="" element={<MyVehiclePage />} />
                  </Route>
                  <Route path="/my-vehicle/inspection" element={<PermissionRoute requiredPermissions={['driver_vehicle_inspection_create']} />}>
                    <Route path="" element={<MyVehicleInspectionPage />} />
                  </Route>
                  <Route path="/my-vehicle/report-issue" element={<PermissionRoute requiredPermissions={['driver_vehicle_issue_report']} />}>
                    <Route path="" element={<MyVehicleIssueReportPage />} />
                  </Route>
                  <Route path="/my-maintenance/report" element={<PermissionRoute requiredPermissions={['driver_maintenance_report_create']} />}>
                    <Route path="" element={<MyMaintenanceReportPage />} />
                  </Route>
                  <Route path="/my-repairs/report" element={<PermissionRoute requiredPermissions={['driver_repair_report_create']} />}>
                    <Route path="" element={<MyRepairReportPage />} />
                  </Route>
                  <Route path="/my-documents" element={<MyDocumentsPage />} />
                  <Route path="/my-profile" element={<MyProfilePage />} />
                </Route>
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
                    <Route path="/finance/trip-billings" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinanceTripBillingsPage /></Suspense>} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermissions={['payments_view']} />}>
                    <Route path="/finance/payments" element={<Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}>Loading...</div>}><FinancePaymentsPage /></Suspense>} />
                  </Route>
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
        <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
