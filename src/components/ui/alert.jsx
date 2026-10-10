import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Alert de shadcn/ui en estilo Maia (redondo). Ícono a la izquierda, título y
// descripción; acepta botones al final (acciones) dentro de la descripción.
//   variant: default | aviso (oro) | destructive (pimentón) | info (lavanda)
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-2xl px-4 py-3 text-sm ring-1 has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground ring-foreground/10 [&>svg]:text-foreground",
        info: "bg-secondary text-secondary-foreground ring-foreground/10 [&>svg]:text-foreground",
        aviso: "bg-aviso/10 text-foreground ring-aviso/30 [&>svg]:text-aviso-fuerte",
        destructive: "bg-error/10 text-foreground ring-error/30 [&>svg]:text-error-fuerte",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="alert-title" className={cn("col-start-2 min-h-4 font-semibold leading-snug tracking-tight", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="alert-description" className={cn("col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
