import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar } from "lucide-react";

export default function AdminMasterConfig() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Master Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Manage system-wide configurations for leads and events
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baraat Config Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/baraat-config')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Baraat Configuration</CardTitle>
                  <CardDescription className="mt-1">
                    Manage custom fields for baraat details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure custom fields that appear in lead forms for baraat details. 
                Add, edit, or remove fields like text inputs, numbers, textareas, and dropdowns.
              </p>
              <Button className="w-full" variant="outline">
                Manage Baraat Config
              </Button>
            </CardContent>
          </Card>

          {/* Event Config Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/event-config')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Event Configuration</CardTitle>
                  <CardDescription className="mt-1">
                    Manage event types for leads
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure event types that can be selected when creating or updating leads. 
                Add, edit, or remove event types with their descriptions.
              </p>
              <Button className="w-full" variant="outline">
                Manage Event Config
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

