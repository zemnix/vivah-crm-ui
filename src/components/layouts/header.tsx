import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/api/authApi";
import { useTheme } from "@/providers/theme-provider";
import { Menu, Moon, Sun, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  readonly onMenuClick: () => void;
  readonly user: AuthUser;
  readonly sidebarCollapsed?: boolean;
}


export function Header({ onMenuClick, user, sidebarCollapsed = false }: HeaderProps) {
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const getBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];

    const breadcrumbs = [segments[0].charAt(0).toUpperCase() + segments[0].slice(1)];
    if (segments.length > 1) {
      breadcrumbs.push(segments[1].charAt(0).toUpperCase() + segments[1].slice(1));
    }
    return breadcrumbs;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const breadcrumbs = getBreadcrumbs();
  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <header className="bg-card border-b border-border flex items-center justify-between h-14" data-testid="header">
      <div className="flex items-center flex-1 min-w-0">
        {/* Logo Section - responsive width */}
        <div className={cn(
          "bg-card border-r border-border flex items-center justify-center transition-all duration-300",
          // Mobile: narrow logo section, Desktop: full sidebar width
          sidebarCollapsed ? "w-16 px-2" : "w-28 sm:w-36 md:w-48 lg:w-60",
          "px-4 py-3"
        )}>
          {sidebarCollapsed ? (
            <div className="w-8 h-6 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">VI</span>
            </div>
          ) : (
            <img
              src="/vinayak_enterprise_logo.jpeg"
              alt="Vinayak Enterprise"
              className="h-6 sm:h-8 md:h-10 lg:h-12 w-auto max-w-full object-contain"
            />
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="md:hidden ml-1 flex-shrink-0"
          data-testid="menu-button"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Breadcrumb - responsive with truncation */}
        <nav className="flex items-center text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2 min-w-0 flex-1" data-testid="breadcrumb">
          <div className="flex items-center min-w-0">
            {breadcrumbs.map((crumb, index) => (
              <div key={`breadcrumb-${crumb}-${index}`} className="flex items-center min-w-0">
                {index > 0 && <span className="mx-1 sm:mx-2 flex-shrink-0">/</span>}
                <span className={cn(
                  index === breadcrumbs.length - 1 ? "text-foreground" : "",
                  "truncate"
                )}>
                  {crumb}
                </span>
              </div>
            ))}
          </div>
        </nav>
      </div>

      <div className="flex items-center space-x-0 sm:space-x-0.5 px-0 sm:px-1 py-1 sm:py-2 flex-shrink-0">
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
          data-testid="theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 sm:h-4 sm:w-4" />
          ) : (
            <Moon className="h-4 w-4 sm:h-4 sm:w-4" />
          )}
        </Button>

        {/* Notifications */}
        {/* <Button variant="ghost" size="sm" className="relative" data-testid="notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button> */}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-0 sm:space-x-0.5 p-0 sm:p-0.5" data-testid="user-menu">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-16">
                {user.name}
              </span>
              <ChevronDown className="h-3 w-3 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{user.name}</span>
                <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.role === 'admin' && (
              <>
                <DropdownMenuItem>
                  <Link to="/product-master">
                    Product Master
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem asChild>
              <Link to={user.role === 'admin' ? '/admin/settings' : '/staff/settings'} className="flex items-center">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
