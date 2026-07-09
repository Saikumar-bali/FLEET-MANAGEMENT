import { cn } from "../../utils/cn";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>
      {children}
    </span>
  );
}
