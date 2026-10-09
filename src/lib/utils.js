import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Junta clases de Tailwind sin que se peleen (la última gana). Es la ayuda
// estándar de shadcn/ui que usan todos sus componentes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
