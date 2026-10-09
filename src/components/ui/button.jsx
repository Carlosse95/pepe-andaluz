import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Botón ORIGINAL de shadcn/ui (new-york). Además de sus variantes de fábrica
// (default, destructive, outline, secondary, ghost, link) trae tres que usa la
// app, hechas con el mismo estilo:
//   destructive-outline  borde de error (eliminar con cuidado)
//   exito                verde de "pagado"/confirmar
// y dos tamaños: icon-sm (botones de solo ícono chicos) y auto (botones de
// texto dentro de una línea, sin alto ni relleno).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "destructive-outline": "border border-destructive/50 bg-background text-destructive shadow-sm hover:bg-destructive/10",
        exito: "bg-exito text-white shadow-sm hover:bg-exito/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        auto: "h-auto p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
