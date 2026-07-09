import { useState, createContext, useContext } from "react";
import { cn } from "../../utils/cn";

const TabsContext = createContext<{ value: string; onChange: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, onChange: setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex space-x-1 rounded-lg bg-gray-100 p-1", className)}>{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  return (
    <button
      onClick={() => ctx.onChange(value)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
        ctx.value === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div className="mt-4">{children}</div>;
}
