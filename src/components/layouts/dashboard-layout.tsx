import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  // Don't render until we have a user
  if (!isAuthenticated || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Fixed Sidebar for Desktop */}
      <div className={cn(
        "bg-card border-r border-border flex-shrink-0 transition-all duration-300 ease-in-out relative",
        "fixed z-30 h-[calc(100vh-3.5rem)] top-14 left-0", // Updated to match h-14 header
        // Desktop sidebar width based on collapsed state
        sidebarCollapsed ? "w-16" : "w-60",
        // Mobile visibility - hidden by default, shown when open
        "md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Sidebar 
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />
        
        {/* Collapse/Expand Button - Only on desktop */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute -right-3 bottom-6 z-50",
            "hidden md:flex h-6 w-6 p-0 rounded-full border border-border bg-card shadow-md",
            "hover:bg-muted transition-colors"
          )}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Main content with left margin to account for fixed sidebar */}
      <div className={cn(
        "mt-14 min-h-[calc(100vh-3.5rem)]", // Updated to match h-14 header
        // Add left margin for fixed sidebar - responsive to match header logo section
        sidebarCollapsed ? "md:ml-16" : "ml-0 sm:ml-36 md:ml-48 lg:ml-60"
      )}>
        <main className="bg-background p-1 sm:p-2 lg:p-3">
          {children}
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden top-14"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
        />
      )}
    </div>
  );
}
