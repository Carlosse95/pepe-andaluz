import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badge ORIGINAL de shadcn/ui (default, secondary, destructive, outline) más
// los de la app con el mismo estilo y los colores de estado:
//   neutral (información), marca (lavanda), oro (aviso), exito, plain (sin
//   color: lo pone su className).
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-[2rem] border border-transparent px-2 py-0.5 text-xs font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-border bg-input/30 text-foreground",
        neutral: "bg-info/10 text-info",
        marca: "bg-secondary text-secondary-foreground",
        oro: "bg-aviso/15 text-aviso-fuerte",
        exito: "bg-exito/15 text-exito-fuerte",
        plain: "",
      },
    },
    defaultVariants: { variant: "plain" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
