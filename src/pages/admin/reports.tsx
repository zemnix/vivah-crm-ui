import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadsPieChart } from "@/components/charts/leads-pie-chart";
import { ConversionLineChart } from "@/components/charts/conversion-line-chart";
import { useLeads } from "@/hooks/useApi";
import { FileDown, Calendar, TrendingUp, Users, Target } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker";

export default function AdminReports() {
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const totalLeads = leads?.length || 0;
  const wonLeads = leads?.filter(lead => lead.status === 'converted').length || 0;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

  return (
    <DashboardLayout>
      <div className="p-6" data-testid="admin-reports-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Analyze your business performance and track key metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="export-csv-button">
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" data-testid="export-pdf-button">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <DatePickerWithRange />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Staff Member</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="sarah">Sarah Johnson</SelectItem>
                    <SelectItem value="mike">Mike Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Report Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sales Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Performance</SelectItem>
                    <SelectItem value="leads">Lead Analysis</SelectItem>
                    <SelectItem value="service">Service Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold text-foreground">{totalLeads}</p>
                  <p className="text-sm text-accent mt-1">+12% from last month</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
                  <p className="text-sm text-accent mt-1">+2.5% from last month</p>
                </div>
                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Won Deals</p>
                  <p className="text-3xl font-bold text-foreground">{wonLeads}</p>
                  <p className="text-sm text-accent mt-1">+15% from last month</p>
                </div>
                <div className="h-12 w-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Leads by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsPieChart data={leads} isLoading={leadsLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionLineChart />
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: 'New Leads', count: leads?.filter(l => l.status === 'new').length || 0, percentage: 100 },
                { stage: 'In Follow-up', count: leads?.filter(l => l.status === 'follow_up').length || 0, percentage: 75 },
                { stage: 'Meeting Scheduled', count: leads?.filter(l => l.status === 'follow_up').length || 0, percentage: 50 },
                { stage: 'Details Sent', count: leads?.filter(l => l.status === 'quotation_sent').length || 0, percentage: 30 },
                { stage: 'Won', count: wonLeads, percentage: 15 },
              ].map((stage) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-foreground">{stage.stage}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-muted-foreground text-right">{stage.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
