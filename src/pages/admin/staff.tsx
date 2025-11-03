import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useStaff } from "@/hooks/useApi";
import { Plus, MoreHorizontal, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function AdminStaff() {
  const { data: staff, isLoading } = useStaff();

  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (_value: string, member: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{member.name}</div>
            <div className="text-sm text-muted-foreground">{member.email}</div>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (value: string) => value || 'Not provided',
    },
    {
      key: 'active',
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (value: string) => new Date(value).toLocaleDateString(),
      sortable: true,
    },
  ];

  const actions = (member: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`staff-actions-${member.id}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        {/* <DropdownMenuItem>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </DropdownMenuItem> */}
        <DropdownMenuItem>
          {member.active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="p-6" data-testid="admin-staff-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your sales team and track their performance
            </p>
          </div>
          <Button data-testid="add-staff-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                  <p className="text-3xl font-bold text-foreground">{staff?.length || 0}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                  <p className="text-3xl font-bold text-foreground">
                    {staff?.filter(s => s.active).length || 0}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                  <p className="text-3xl font-bold text-foreground">2</p>
                </div>
                <div className="h-12 w-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={staff}
              columns={columns}
              searchKey="name"
              searchPlaceholder="Search staff..."
              actions={actions}
              isLoading={isLoading}
              emptyMessage="No staff members found. Add your first staff member to get started."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
