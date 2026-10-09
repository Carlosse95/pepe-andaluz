import * as React from "react";
import { cn } from "@/lib/utils";

// Campo ORIGINAL de shadcn/ui. "af-input" se conserva solo como gancho de
// acomodo (anchos en filas de filtros, fechas de Safari, etc.); ya no da
// estilo. La letra es de 16px en celular para que el iPhone no haga zoom.
export const campoClases =
  "af-input flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(campoClases, className)} {...props} />
));
Input.displayName = "Input";

export { Input };
