import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import LoginPage from "./pages/login";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLeads from "@/pages/admin/leads";
import AdminLeadDetail from "@/pages/admin/leads/[id]";
import AdminInteractions from "@/pages/admin/interactions";
import AdminQuotations from "@/pages/admin/quotations";
import AdminQuotationDetail from "@/pages/admin/quotations/[id]";
import AdminQuotationPreview from "@/pages/admin/quotations/preview/[id]";
import AdminNewQuotation from "@/pages/admin/quotations/new";
import AdminStaff from "@/pages/admin/staff";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";
import AdminBaraatConfig from "@/pages/admin/baraat-config";
import AdminEnquiries from "@/pages/admin/enquiries";
import AdminEventConfig from "@/pages/admin/event-config";
import AdminSfxConfig from "@/pages/admin/sfx-config";
import AdminMasterConfig from "@/pages/admin/master-config";
import AdminConvertedLeads from "@/pages/admin/converted-leads";
import StaffDashboard from "@/pages/staff/dashboard";
import StaffLeads from "@/pages/staff/leads";
import StaffLeadDetail from "@/pages/staff/leads/[id]";
import StaffInteractions from "@/pages/staff/interactions";
import StaffQuotations from "@/pages/staff/quotations";
import StaffQuotationDetail from "@/pages/staff/quotations/[id]";
import QuotationPreview from "@/pages/staff/quotations/preview/[id]";
import NewQuotation from "@/pages/staff/quotations/new";
import StaffSettings from "@/pages/staff/settings";
import StaffEnquiries from "@/pages/staff/enquiries";
import StaffConvertedLeads from "@/pages/staff/converted-leads";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "./providers/theme-provider";
import { useNotificationInit } from "./hooks/useNotificationInit";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  // Initialize notifications
  useNotificationInit();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
        <TooltipProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
          <Route path="/admin/interactions" element={<AdminInteractions />} />
          <Route path="/admin/quotations" element={<AdminQuotations />} />
          <Route path="/admin/quotations/new" element={<AdminNewQuotation />} />
          <Route path="/admin/quotations/:id" element={<AdminQuotationDetail />} />
          <Route path="/admin/quotations/:id/preview" element={<AdminQuotationPreview />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/master-config" element={<AdminMasterConfig />} />
          <Route path="/admin/baraat-config" element={<AdminBaraatConfig />} />
          <Route path="/admin/event-config" element={<AdminEventConfig />} />
          <Route path="/admin/sfx-config" element={<AdminSfxConfig />} />
          <Route path="/admin/enquiries" element={<AdminEnquiries />} />
          <Route path="/admin/converted-leads" element={<AdminConvertedLeads />} />

          {/* Staff Routes */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/leads" element={<StaffLeads />} />
          <Route path="/staff/leads/:id" element={<StaffLeadDetail />} />
          <Route path="/staff/interactions" element={<StaffInteractions />} />
          {/* Legacy redirects for backward compatibility */}
          <Route path="/staff/calls" element={<Navigate to="/staff/interactions" replace />} />
          <Route path="/staff/meetings" element={<Navigate to="/staff/interactions" replace />} />
          <Route path="/staff/quotations" element={<StaffQuotations />} />
          <Route path="/staff/quotations/new" element={<NewQuotation />} />
          <Route path="/staff/quotations/:id/preview" element={<QuotationPreview />} />
          <Route path="/staff/quotations/:id" element={<StaffQuotationDetail />} />
          <Route path="/staff/settings" element={<StaffSettings />} />
          <Route path="/staff/enquiries" element={<StaffEnquiries />} />
          <Route path="/staff/converted-leads" element={<StaffConvertedLeads />} />


          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;