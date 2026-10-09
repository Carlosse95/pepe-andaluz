import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Botón que se queda "prendido" (Toggle de shadcn/ui). Es la pieza de todas
// las pestañas y selectores de la app: Por entregar/Entregados, Recoger/A
// domicilio, Paellas/Otros, filtros por categoría…
//   segmento  pestañas y opciones que reparten el ancho (alto de campo)
//   pastilla  filtros chicos y redondos que se deslizan de lado
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 border font-semibold transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 [&_svg]:shrink-0 border-border bg-card text-muted-foreground hover:bg-accent data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary",
  {
    variants: {
      variant: {
        segmento: "flex-1 min-w-0 min-h-[var(--alto-campo)] rounded-md px-3 py-2 text-sm",
        pastilla: "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "segmento" },
  }
);

const Toggle = React.forwardRef(({ className, variant, pressed, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-pressed={!!pressed}
    data-state={pressed ? "on" : "off"}
    className={cn(toggleVariants({ variant }), className)}
    {...props}
  />
));
Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
