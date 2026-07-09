import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500": variant === "primary",
          "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
          "border border-gray-300 bg-transparent hover:bg-gray-50": variant === "outline",
          "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          "hover:bg-gray-100": variant === "ghost",
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 py-2": size === "md",
          "h-12 px-6 text-lg": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
}
