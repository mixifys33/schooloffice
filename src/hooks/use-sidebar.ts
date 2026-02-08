import { createContext, useContext } from 'react';

type SidebarState = {
  isMobile: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}