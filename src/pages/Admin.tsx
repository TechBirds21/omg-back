import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin-sidebar';
import AdminAuth from '@/components/AdminAuth';
import { AdminFilterProvider } from '@/contexts/AdminFilterContext';
import { GlobalAdminFilters } from '@/components/GlobalAdminFilters';

const CustomSidebarTrigger = () => {
  const { isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={() => {
        // Toggle using provider helper - keeps state consistent
        if (isMobile) setOpenMobile(!openMobile);
        else toggleSidebar();
      }}
      className="lg:hidden p-2 rounded-md hover:bg-muted"
      aria-label="Open sidebar"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
};

const Admin = () => {
  return (
    <AdminAuth>
      <AdminFilterProvider>
        <SidebarProvider>
          <div className="flex h-screen w-full bg-background">
            <AdminSidebar />
            <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
              <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex-shrink-0">
                <CustomSidebarTrigger />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-medium text-foreground truncate">Admin Dashboard</h1>
                </div>
                <GlobalAdminFilters />
              </header>

              <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 animate-fade-in w-full">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AdminFilterProvider>
    </AdminAuth>
  );
};

export default Admin;
