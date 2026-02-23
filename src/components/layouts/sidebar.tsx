import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/providers/theme-provider";
import { 
  Users, 
  MessageSquare, 
  LayoutDashboard,
  FileText,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle
} from "lucide-react";

interface SidebarProps {
  readonly onClose?: () => void;
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
}

export function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const adminMenuItems = [
    { href: "/admin/todos", icon: CheckCircle, label: "Todos" },
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/leads", icon: Users, label: "Leads" },
    { href: "/admin/converted-leads", icon: Users, label: "Converted Leads" },
    { href: "/admin/enquiries", icon: ClipboardList, label: "Enquiries" },
    { href: "/admin/interactions", icon: MessageSquare, label: "Calls & Meetings" },
    { href: "/admin/quotations", icon: FileText, label: "Quotations" },
    { href: "/admin/master-config", icon: Settings, label: "Master Config" },
    // { href: "/admin/staff", icon: UserCheck, label: "Staff" },
    // { href: "/admin/reports", icon: BarChart3, label: "Reports" },
  ];

  const staffMenuItems = [
    { href: "/staff/todos", icon: CheckCircle, label: "Todos" },
    { href: "/staff/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/staff/leads", icon: Users, label: "My Leads" },
    { href: "/staff/converted-leads", icon: Users, label: "Converted Leads" },
    { href: "/staff/enquiries", icon: ClipboardList, label: "Enquiries" },
    { href: "/staff/interactions", icon: MessageSquare, label: "Calls & Meetings" },
    { href: "/staff/quotations", icon: FileText, label: "Quotations" },
  ];

  const getMenuItems = () => {
    switch (user.role) {
      case 'admin': return adminMenuItems;
      case 'staff': return staffMenuItems;
      default: return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex flex-col h-full relative" data-testid="sidebar" style={{ backgroundColor: 'var(--sidebar)' }}>
      {/* Mobile header with logo and close button */}
      <div className="flex items-center justify-between p-3 md:hidden border-b border-sidebar-border">
        <div className={cn(
          "flex items-center flex-shrink-0 rounded-md p-1.5",
          theme === 'light' ? "bg-gray-900" : ""
        )}>
          <img
            src="/vinayak_enterprise_logo.jpeg"
            alt="Vivah Creations"
            className="h-8 w-auto object-contain"
          />
        </div>
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
        "flex-1 p-2 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto",
        collapsed ? "p-2" : ""
      )} data-testid="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          const handleClick = (e: React.MouseEvent) => {
            // Only close sidebar on mobile (not on desktop)
            // On desktop, clicking menu items should not affect collapsed state
            // Check if we're on mobile by checking if the sidebar is in overlay mode
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
              onClose?.();
            }
            // Prevent any side effects on desktop
            e.stopPropagation();
          };

          const menuItemContent = (
            <div className={cn(
              "flex items-center text-sm font-medium rounded-md transition-colors",
              collapsed ? "justify-center p-2 sm:p-3" : "px-2 sm:px-3 py-2",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-all duration-500 ease-in-out",
                collapsed ? "" : "mr-2 sm:mr-3"
              )} />
              <span className={cn(
                "truncate text-xs sm:text-sm transition-all duration-500 ease-in-out",
                collapsed 
                  ? "opacity-0 w-0 overflow-hidden" 
                  : "opacity-100 w-auto"
              )}>
                {item.label}
              </span>
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link to={item.href} onClick={handleClick}>
                    {menuItemContent}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={item.href} to={item.href} onClick={handleClick}>
              {menuItemContent}
            </Link>
          );
        })}
      </nav>

      {/* Collapse/Expand Button - Only on desktop, as a menu item at the bottom */}
      {onToggleCollapse && (
        <div className={cn(
          "hidden md:block p-2 sm:p-4 border-t border-sidebar-border",
          collapsed ? "p-2" : ""
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className={cn(
                    "w-full flex items-center justify-center text-sm font-medium rounded-md transition-colors",
                    "p-2 sm:p-3",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <ChevronRight className="h-4 w-4 flex-shrink-0 transition-all duration-500 ease-in-out" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Collapse Sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "w-full flex items-center text-sm font-medium rounded-md transition-colors",
                "px-2 sm:px-3 py-2",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <ChevronLeft className="h-4 w-4 flex-shrink-0 mr-2 sm:mr-3 transition-all duration-500 ease-in-out" />
              <span className="truncate text-xs sm:text-sm transition-all duration-500 ease-in-out">
                Collapse Sidebar
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
