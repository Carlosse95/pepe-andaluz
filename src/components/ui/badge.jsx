import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badge ORIGINAL de shadcn/ui (default, secondary, destructive, outline) más
// los de la app con el mismo estilo y los colores de estado:
//   neutral (información), marca (lavanda), oro (aviso), exito, plain (sin
//   color: lo pone su className).
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        neutral: "border-transparent bg-info/10 text-info",
        marca: "border-transparent bg-secondary text-secondary-foreground",
        oro: "border-transparent bg-aviso/15 text-aviso-fuerte",
        exito: "border-transparent bg-exito/15 text-exito-fuerte",
        plain: "border-transparent",
      },
    },
    defaultVariants: { variant: "plain" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
