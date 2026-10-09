import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Toggle ORIGINAL de shadcn/ui (variante "outline"), sin Radix: es un botón
// con aria-pressed y data-state. Es la pieza de las pestañas y selectores.
//   segmento  reparten el ancho (Por entregar / Entregados, Recoger / A domicilio…)
//   pastilla  filtros chicos que se deslizan de lado
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-transparent text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        segmento: "h-9 min-w-0 flex-1 px-3",
        pastilla: "h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-xs",
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
