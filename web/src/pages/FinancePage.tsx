import { useFinanceAccounts, useFinanceTransactions, useFinanceVendors, useFinanceCustomers, useFinanceCategories, useFinancePayments, useFinanceTripBillings } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { IndianRupee } from "lucide-react";

interface FinanceAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  status: string;
}

const accountColumns: ColumnDef<FinanceAccount>[] = [
  { accessorKey: "name", header: "Account Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "balance", header: "Balance", cell: ({ row }) => `₹${row.original.balance.toLocaleString("en-IN")}` },
  { accessorKey: "status", header: "Status" },
];

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  account?: { name: string };
}

const transactionColumns: ColumnDef<Transaction>[] = [
  { accessorKey: "date", header: "Date", cell: ({ row }) => format(new Date(row.original.date), "dd MMM yyyy") },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => (
    <span className={row.original.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
      {row.original.type === "CREDIT" ? "+" : "-"}₹{Math.abs(row.original.amount).toLocaleString("en-IN")}
    </span>
  )},
  { accessorKey: "account.name", header: "Account" },
];

export function FinancePage() {
  const { data: accounts } = useFinanceAccounts();
  const { data: transactions } = useFinanceTransactions();
  const { data: vendors } = useFinanceVendors();
  const { data: customers } = useFinanceCustomers();
  const { data: categories } = useFinanceCategories();
  const { data: payments } = useFinancePayments();
  const { data: tripBillings } = useFinanceTripBillings();

  const totalBalance = accounts?.data?.items?.reduce((a: number, c: any) => a + (c.balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500">Manage accounts, transactions, and billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold">₹{totalBalance.toLocaleString("en-IN")}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Accounts</p>
            <p className="text-2xl font-bold">{accounts?.data?.items?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Vendors</p>
            <p className="text-2xl font-bold">{vendors?.data?.items?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Customers</p>
            <p className="text-2xl font-bold">{customers?.data?.items?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="trip-billing">Trip Billing</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <CrudPage title="Accounts" data={accounts?.data?.items || []} columns={accountColumns} isLoading={false} createPath="/finance/accounts/new" />
        </TabsContent>
        <TabsContent value="transactions">
          <CrudPage title="Transactions" data={transactions?.data?.items || []} columns={transactionColumns} isLoading={false} />
        </TabsContent>
        <TabsContent value="vendors">
          <CrudPage title="Vendors" data={vendors?.data?.items || []} columns={[{ accessorKey: "name", header: "Name" }, { accessorKey: "type", header: "Type" }, { accessorKey: "contact", header: "Contact" }]} isLoading={false} />
        </TabsContent>
        <TabsContent value="customers">
          <CrudPage title="Customers" data={customers?.data?.items || []} columns={[{ accessorKey: "name", header: "Name" }, { accessorKey: "email", header: "Email" }, { accessorKey: "phone", header: "Phone" }]} isLoading={false} />
        </TabsContent>
        <TabsContent value="trip-billing">
          <CrudPage title="Trip Billing" data={tripBillings?.data?.items || []} columns={[{ accessorKey: "trip.tripNumber", header: "Trip" }, { accessorKey: "amount", header: "Amount" }, { accessorKey: "status", header: "Status" }]} isLoading={false} />
        </TabsContent>
        <TabsContent value="payments">
          <CrudPage title="Payments" data={payments?.data?.items || []} columns={[{ accessorKey: "amount", header: "Amount" }, { accessorKey: "method", header: "Method" }, { accessorKey: "status", header: "Status" }]} isLoading={false} />
        </TabsContent>
        <TabsContent value="categories">
          <CrudPage title="Categories" data={categories?.data?.items || []} columns={[{ accessorKey: "name", header: "Name" }, { accessorKey: "type", header: "Type" }]} isLoading={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
