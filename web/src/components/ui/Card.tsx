import { cn } from "../../utils/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("bg-white rounded-lg border shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-6 py-4 border-b", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
