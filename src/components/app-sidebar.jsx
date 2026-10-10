import * as React from "react";
import {
  ChevronsUpDown, LogOut, CircleUserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

// Barra lateral de Pepe El Andaluz (base: sidebar-07 de shadcn/ui).
// Se encoge a solo íconos en iPad/compu y en celular sale como cajón.
export function AppSidebar({ secciones, vista, onIr, usuario, onPerfil, onCerrarSesion, ...props }) {
  const { isMobile, setOpenMobile, setOpen } = useSidebar();
  // Como la barra de Aceternity UI: en iPad y compu vive angosta (solo
  // íconos), se ABRE sola al pasar el mouse o tocarla y se GUARDA sola al
  // salir o al elegir una sección. En celular sigue siendo el cajón.
  const ir = (fn) => () => { fn(); if (isMobile) setOpenMobile(false); else setOpen(false); };
  const inicial = (usuario.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      flotante
      onMouseEnter={() => { if (!isMobile) setOpen(true); }}
      onMouseLeave={() => { if (!isMobile) setOpen(false); }}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Pepe El Andaluz" aria-label="Pepe El Andaluz — ir a Hoy" onClick={ir(() => onIr("hoy"))} className="h-auto justify-center py-2 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!p-0">
              <div className="af-logo-mark af-logo-barra shrink-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarMenu>
            {secciones.map((s) => (
              <SidebarMenuItem key={s.key}>
                <SidebarMenuButton tooltip={s.label} isActive={vista === s.key} onClick={ir(() => onIr(s.key))} className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
                  {s.icono}
                  <span>{s.label}</span>
                </SidebarMenuButton>
                {s.badge > 0 && <SidebarMenuBadge className={s.badgeSuave ? "bg-aviso/25 text-higo" : "bg-pimenton text-white"}>{s.badge > 9 ? "9+" : s.badge}</SidebarMenuBadge>}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-md">
                    {usuario.foto && <AvatarImage src={usuario.foto} alt={usuario.nombre} />}
                    <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">{inicial}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{usuario.nombre}</span>
                    <span className="truncate text-xs opacity-70">{usuario.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
                <DropdownMenuLabel className="font-normal">
                  <div className="grid text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{usuario.nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">{usuario.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={ir(onPerfil)}>
                  <CircleUserRound /> Mi perfil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onCerrarSesion}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
