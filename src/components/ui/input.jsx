import * as React from "react";
import { cn } from "@/lib/utils";

// Clases comunes de todo lo que se escribe o se elige: un solo alto
// (--alto-campo, 46px: cómodo para el dedo en el iPad) y una sola esquina.
// "af-input" se conserva como gancho para los acomodos de cada pantalla
// (anchos en filas de filtros, fechas de Safari, etc.).
export const campoClases =
  "af-input flex w-full min-w-0 h-[var(--alto-campo)] rounded-md border border-input bg-card px-3.5 font-sans text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-oro focus:ring-[3px] focus:ring-oro/20 disabled:cursor-not-allowed disabled:opacity-60";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(campoClases, className)} {...props} />
));
Input.displayName = "Input";

export { Input };
