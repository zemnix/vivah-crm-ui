import { useEffect, useState } from 'react';
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, RefreshCw, Clock, CheckCircle, AlertCircle, Phone, FileText, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardFilters } from '@/api/dashboardApi';
import { EventsCalendar } from '@/components/events-calendar';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  BarChart,
  Bar
} from 'recharts';

export default function StaffDashboard() {
  const { getCurrentUserDashboard } = useDashboard();
  const { data, isLoading, error, fetchData } = getCurrentUserDashboard('staff');
  
  // Type assertion for staff data
  const staffData = data as any;
  
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'month' | 'range'>('all');

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  const handleFilterChange = (type: 'all' | 'month' | 'range') => {
    setFilterType(type);
    let newFilters: DashboardFilters = {};
    
    if (type === 'month' && selectedMonth) {
      newFilters = { month: selectedMonth };
    } else if (type === 'range' && dateRange.from && dateRange.to) {
      newFilters = {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      };
    }
    
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    fetchData(filters);
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const interactionStatsCards = [
    {
      title: 'Total Interactions',
      value: staffData?.interactions?.stats?.total || 0,
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All calls & meetings'
    },
    {
      title: 'Scheduled',
      value: staffData?.interactions?.stats?.scheduled || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Upcoming interactions'
    },
    {
      title: 'Completed',
      value: staffData?.interactions?.stats?.completed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Successfully completed'
    },
    {
      title: 'Missed',
      value: staffData?.interactions?.stats?.missed || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Missed interactions'
    }
  ];

  const quotationStatsCards = [
    {
      title: 'Total Quotations',
      value: staffData?.quotations?.stats?.total || 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'All quotations created'
    },
    {
      title: 'Draft',
      value: staffData?.quotations?.stats?.draft || 0,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      description: 'In draft status'
    },
    {
      title: 'Sent',
      value: staffData?.quotations?.stats?.sent || 0,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Sent to customers'
    },
    {
      title: 'Accepted',
      value: staffData?.quotations?.stats?.accepted || 0,
      icon: ThumbsUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Accepted by customers'
    },
    {
      title: 'Rejected',
      value: staffData?.quotations?.stats?.rejected || 0,
      icon: ThumbsDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Rejected by customers'
    }
  ];

  const interactionChartData = staffData?.interactions?.monthlyData?.map((item: any) => ({
    date: format(new Date(item.date), 'MMM dd'),
    scheduled: item.scheduled,
    completed: item.completed,
    missed: item.missed
  })) || [];

  const quotationChartData = staffData?.quotations?.monthlyData?.map((item: any) => ({
    date: format(new Date(item.date), 'MMM dd'),
    draft: item.draft,
    sent: item.sent,
    accepted: item.accepted,
    rejected: item.rejected
  })) || [];

  const interactionPieData = [
    { name: 'Completed', value: staffData?.interactions?.stats?.completed || 0, color: '#00C49F' },
    { name: 'Scheduled', value: staffData?.interactions?.stats?.scheduled || 0, color: '#FFBB28' },
    { name: 'Missed', value: staffData?.interactions?.stats?.missed || 0, color: '#FF8042' }
  ].filter(item => item.value > 0);

  const quotationPieData = [
    { name: 'Accepted', value: staffData?.quotations?.stats?.accepted || 0, color: '#00C49F' },
    { name: 'Sent', value: staffData?.quotations?.stats?.sent || 0, color: '#0088FE' },
    { name: 'Draft', value: staffData?.quotations?.stats?.draft || 0, color: '#FFBB28' },
    { name: 'Rejected', value: staffData?.quotations?.stats?.rejected || 0, color: '#FF8042' }
  ].filter(item => item.value > 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-1 sm:p-2 lg:p-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your interactions performance
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Events Calendar */}
        <EventsCalendar />

        {/* Filters */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                  className="flex-shrink-0"
                >
                  All Time
                </Button>
                <Button
                  variant={filterType === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('month')}
                  className="flex-shrink-0"
                >
                  By Month
                </Button>
                <Button
                  variant={filterType === 'range' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('range')}
                  className="flex-shrink-0"
                >
                  Date Range
                </Button>
                </div>

              {filterType === 'month' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'range' && (
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-48 justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-48 justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {(filterType === 'month' || filterType === 'range') && (
                <Button onClick={() => handleFilterChange(filterType)} size="sm">
                  Apply Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interaction Stats Cards */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Interactions (Calls & Meetings)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {interactionStatsCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quotation Stats Cards */}
        <div className="hidden">
          <h2 className="text-2xl font-bold mb-4">Quotations</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {quotationStatsCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Interaction Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Interactions Timeline</CardTitle>
              <CardDescription>
                Daily scheduled, completed, and missed interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={interactionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="scheduled"
                      stackId="1"
                      stroke="#FFBB28"
                      fill="#FFBB28"
                      name="Scheduled"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="2"
                      stroke="#00C49F"
                      fill="#00C49F"
                      name="Completed"
                    />
                    <Area
                      type="monotone"
                      dataKey="missed"
                      stackId="3"
                      stroke="#FF8042"
                      fill="#FF8042"
                      name="Missed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Interaction Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Interaction Status Distribution</CardTitle>
              <CardDescription>
                Current breakdown of interaction statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={interactionPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {interactionPieData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quotation Charts */}
        <div className="grid gap-6 md:grid-cols-2 hidden">
          {/* Quotation Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Quotations Timeline</CardTitle>
              <CardDescription>
                Daily quotation status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quotationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="draft" stackId="a" fill="#FFBB28" name="Draft" />
                    <Bar dataKey="sent" stackId="a" fill="#0088FE" name="Sent" />
                    <Bar dataKey="accepted" stackId="a" fill="#00C49F" name="Accepted" />
                    <Bar dataKey="rejected" stackId="a" fill="#FF8042" name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quotation Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Status Distribution</CardTitle>
              <CardDescription>
                Current breakdown of quotation statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={quotationPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {quotationPieData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>
              Interaction completion rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interactionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Completed Interactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}