import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    defaultValues: {
      email: "",
    },
  });

  // Clear errors when component unmounts
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

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await forgotPassword(data);
      setIsEmailSent(true);
      
      toast({
        title: "Email Sent",
        description: "Password reset instructions have been sent to your email address.",
      });
    } catch (error) {
      // Error handling is done in the auth store and useEffect above
      console.error('Forgot password error:', error);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="shadow-lg border border-border">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
                <p className="text-muted-foreground mb-6">
                  We've sent password reset instructions to your email address. 
                  Please check your inbox and follow the link to reset your password.
                </p>
                <div className="space-y-4">
                  <Link to="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsEmailSent(false)}
                    className="w-full"
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg border border-border">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">Forgot Password</h1>
              <p className="text-muted-foreground mt-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
