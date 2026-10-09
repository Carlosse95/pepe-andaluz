import * as React from "react";
import { Plus, FilePlus, Search, ChevronsUpDown, LogOut, UserRound } from "lucide-react";
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
export function AppSidebar({ secciones, vista, onIr, onNuevoPedido, onNuevoPresupuesto, onBuscar, usuario, onPerfil, onCerrarSesion, ...props }) {
  const { isMobile, setOpenMobile } = useSidebar();
  // En celular el cajón se cierra solo al elegir algo.
  const ir = (fn) => () => { fn(); if (isMobile) setOpenMobile(false); };
  const inicial = (usuario.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Pepe El Andaluz" onClick={ir(() => onIr("hoy"))} className="hover:bg-transparent active:bg-transparent">
              <div className="af-logo-mark af-logo-barra shrink-0" />
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-display text-sm font-bold">Pepe El Andaluz</span>
                <span className="truncate text-2xs opacity-70">Paellas y más</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Rápido</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Nuevo pedido" onClick={ir(onNuevoPedido)} className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground font-semibold">
                <Plus /> <span>Nuevo pedido</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Nuevo presupuesto" onClick={ir(onNuevoPresupuesto)}>
                <FilePlus /> <span>Nuevo presupuesto</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Buscar pedidos" isActive={vista === "buscar"} onClick={ir(onBuscar)} className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
                <Search /> <span>Buscar pedidos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarMenu>
            {secciones.map((s) => (
              <SidebarMenuItem key={s.key}>
                <SidebarMenuButton tooltip={s.label} isActive={vista === s.key} onClick={ir(() => onIr(s.key))} className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground">
                  {s.icono}
                  <span>{s.label}</span>
                </SidebarMenuButton>
                {s.badge > 0 && <SidebarMenuBadge className="bg-pimenton text-white">{s.badge > 9 ? "9+" : s.badge}</SidebarMenuBadge>}
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
                  <UserRound /> Mi perfil
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
