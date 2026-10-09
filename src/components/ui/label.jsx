import * as React from "react";
import { cn } from "@/lib/utils";

// Etiqueta ORIGINAL de shadcn/ui (sin Radix: es un <label> con su estilo).
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-2 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
