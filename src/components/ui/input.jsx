import * as React from "react";
import { cn } from "@/lib/utils";

// Campo de shadcn/ui, estilo MAIA (píldora con relleno suave). "af-input" se conserva solo como gancho de
// acomodo (anchos en filas de filtros, fechas de Safari, etc.); ya no da
// estilo. La letra es de 16px en celular para que el iPhone no haga zoom.
export const campoClases =
  "af-input flex h-9 w-full min-w-0 rounded-[2rem] border border-input bg-input/30 px-3 py-1 text-base transition-colors outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(campoClases, className)} {...props} />
));
Input.displayName = "Input";

export { Input };
