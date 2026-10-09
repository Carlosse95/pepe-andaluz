import * as React from "react";
import { cn } from "@/lib/utils";
import { campoClases } from "@/components/ui/input";

// Lista para elegir con el selector NATIVO del sistema: en iPhone y iPad abre
// la rueda/lista de Apple, que es lo más cómodo con el dedo y con listas
// largas (clientes, paellas). Es el "Native Select" de shadcn.
const NativeSelect = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(campoClases, className)} {...props}>
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
