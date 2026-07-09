import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAVIGATION } from "../../config/navigation";
import * as Icons from "lucide-react";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    return permissions.includes(perm) || permissions.includes("*");
  };

  const filteredNav = NAVIGATION.filter((item) => hasPermission(item.permission)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => hasPermission(child.permission)),
  }));

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={cn(
          "bg-slate-900 text-white transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          {sidebarOpen ? (
            <h1 className="text-xl font-bold tracking-tight">FleetOS</h1>
          ) : (
            <Icons.Truck className="w-6 h-6" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {filteredNav.map((item) => {
            const Icon = Icons[item.icon as keyof typeof Icons] || Icons.Circle;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 hover:bg-slate-800 transition-colors",
                    isActive && "bg-slate-800 border-r-2 border-blue-500"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                </Link>

                {sidebarOpen && item.children?.map((child) => {
                  const ChildIcon = Icons[child.icon as keyof typeof Icons] || Icons.Circle;
                  const isChildActive = location.pathname === child.path;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={cn(
                        "flex items-center px-8 py-2 text-sm hover:bg-slate-800 transition-colors",
                        isChildActive && "text-blue-400"
                      )}
                    >
                      <ChildIcon className="w-4 h-4 mr-2" />
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            onClick={() => {
              logout();
              toast.success("Logged out");
              navigate("/login");
            }}
            className="flex items-center w-full hover:bg-slate-800 p-2 rounded transition-colors"
          >
            <Icons.LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3 text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded">
            <Icons.Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
