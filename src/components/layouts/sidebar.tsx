import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { 
  Users, 
  MessageSquare, 
  LayoutDashboard,
  ClipboardList,
  FileText,
  X
} from "lucide-react";

interface SidebarProps {
  readonly onClose?: () => void;
  readonly collapsed?: boolean;
}

export function Sidebar({ onClose, collapsed = false }: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const adminMenuItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/leads", icon: Users, label: "Leads" },
    { href: "/admin/interactions", icon: MessageSquare, label: "Calls & Meetings" },
    { href: "/admin/quotations", icon: FileText, label: "Quotations" },
    { href: "/worker/tracking", icon: ClipboardList, label: "Work Tracking" },
    // { href: "/admin/staff", icon: UserCheck, label: "Staff" },
    // { href: "/admin/reports", icon: BarChart3, label: "Reports" },
  ];

  const staffMenuItems = [
    { href: "/staff/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/staff/leads", icon: Users, label: "My Leads" },
    { href: "/staff/interactions", icon: MessageSquare, label: "Calls & Meetings" },
    { href: "/staff/quotations", icon: FileText, label: "Quotations" },
  ];

  const workerMenuItems = [
    { href: "/worker/tracking", icon: ClipboardList, label: "Work Tracking" },
  ];

  const getMenuItems = () => {
    switch (user.role) {
      case 'admin': return adminMenuItems;
      case 'staff': return staffMenuItems;
      case 'worker': return workerMenuItems;
      default: return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex flex-col h-full" data-testid="sidebar">
      {/* Mobile close button at top */}
      <div className="flex justify-end p-2 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className={cn(
        "flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2",
        collapsed ? "p-2" : ""
      )} data-testid="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          const handleClick = () => {
            // Always navigate to the page, regardless of collapsed state
            onClose?.();
          };

          return (
            <Link key={item.href} to={item.href} onClick={handleClick}>
              <div className={cn(
                "flex items-center text-sm font-medium rounded-md transition-colors group relative",
                collapsed ? "justify-center p-2 sm:p-3" : "px-2 sm:px-3 py-2",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  collapsed ? "" : "mr-2 sm:mr-3"
                )} />
                {!collapsed && (
                  <span className="truncate text-xs sm:text-sm">
                    {item.label}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
