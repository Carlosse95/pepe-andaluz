import * as React from "react";
import { cn } from "@/lib/utils";

// Etiqueta de campo de shadcn/ui, con el estilo de la app: mayúsculas
// pequeñas en tinta suave.
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
