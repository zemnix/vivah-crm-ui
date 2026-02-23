import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError, user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin/leads');
          break;
        case 'staff':
          navigate('/staff/leads');
          break;
        default:
          navigate('/login');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Clear errors when component unmounts or form changes
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
      
      toast({
        title: "Success",
        description: "Successfully logged in!",
      });
      
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error handling is done in the auth store and useEffect above
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg border border-border">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">SWAGAT EVENTS</h1>
              <p className="text-muted-foreground mt-2">Sign in to your account</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="login-form">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                          data-testid="email-input"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                            data-testid="password-input"
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="toggle-password"
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="login-button"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <Link 
                to="/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
