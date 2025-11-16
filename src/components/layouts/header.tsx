import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/api/authApi";
import { useTheme } from "@/providers/theme-provider";
import { Menu, Moon, Sun, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  readonly onMenuClick: () => void;
  readonly user: AuthUser;
  readonly sidebarCollapsed?: boolean;
}


export function Header({ onMenuClick, user }: HeaderProps) {
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <header className="flex items-center justify-between h-14 w-full px-4" style={{ backgroundColor: 'var(--navbar)' }} data-testid="header">
      <div className="flex items-center flex-1 min-w-0">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="md:hidden mr-3 flex-shrink-0"
          data-testid="menu-button"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Logo */}
        <div className={cn(
          "flex items-center flex-shrink-0 rounded-md p-1.5",
          // theme === 'light' ? "bg-gray-900" : ""
        )}>
          <img
            src="/vivahlogo.png"
            alt="Vivah"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 flex-shrink-0">
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
