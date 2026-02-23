import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  // Initialize from localStorage, default to false if not set
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return saved === "true";
    }
    return false;
  });
  const { user, isAuthenticated } = useAuthStore();

  // Persist collapsed state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // Don't render until we have a user
  if (!isAuthenticated || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sidebar)' }}>
      {/* Fixed Header - Full Width */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: 'var(--navbar)' }}>
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Fixed Sidebar - Full screen on mobile, below header on desktop */}
      <div 
        className={cn(
          "flex-shrink-0 relative",
          // Smooth transition for all properties
          "transition-all duration-500 ease-in-out",
          "will-change-transform",
          // Mobile: full screen and full width
          "fixed z-50 top-0 h-screen w-full left-0",
          // Desktop: below header with specific width
          "md:z-30 md:top-14 md:h-[calc(100vh-3.5rem)]",
          sidebarCollapsed ? "md:w-[4.5rem]" : "md:w-60",
          // Mobile visibility - hidden by default, shown when open
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ backgroundColor: 'var(--sidebar)' }}
      >
        <Sidebar 
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content with left margin to account for fixed sidebar */}
      <div className={cn(
        "fixed top-14 bottom-0 left-0 right-0 z-10 p-2",
        // Smooth transition for left position - consistent timing
        "transition-[left] duration-500 ease-in-out",
        // Add left margin for fixed sidebar
        sidebarCollapsed ? "md:left-[4.5rem]" : "md:left-60",
        // Add padding to create rounded content area
      )}>
        {/* Fixed rounded white container */}
        <div className="h-full bg-background rounded-xl md:rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Scrollable content inside */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black z-40 md:hidden transition-opacity duration-500 ease-in-out",
          sidebarOpen ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setSidebarOpen(false);
          }
        }}
        role="button"
        tabIndex={0}
      />
    </div>
  );
}
