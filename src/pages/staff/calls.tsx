import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallDialog } from "@/components/dialogs/call-dialog";
import { Plus, Phone, Clock, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Type definitions
type CallStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'missed';
type Call = {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadMobile: string;
  scheduledAt: string;
  status: CallStatus;
  notes?: string;
  outcome?: string;
  nextAction?: string;
  nextActionDate?: string;
  staffId?: string;
  datetime?: string;
  durationSec?: number;
  createdAt?: string;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  company?: string;
  status: string;
  phone?: string;
  source?: string;
};

// Dummy data for UI demonstration
const dummyCalls: Call[] = [
  {
    id: "call-1",
    leadId: "lead-1",
    leadName: "John Smith",
    leadEmail: "john@techcorp.com",
    leadMobile: "+1234567890",
    scheduledAt: "2025-08-28T09:00:00Z",
    staffId: "staff1",
    datetime: "2025-08-28T09:00:00Z",
    durationSec: 900,
    status: "completed",
    notes: "Initial contact, discussed enterprise package requirements",
    nextActionDate: "2025-08-30T14:00:00Z",
    createdAt: "2025-08-28T09:00:00Z"
  },
  {
    id: "call-2",
    leadId: "lead-2",
    leadName: "Sarah Johnson",
    leadEmail: "sarah@abc.com",
    leadMobile: "+1987654321",
    scheduledAt: "2025-08-27T15:30:00Z",
    staffId: "staff1",
    datetime: "2025-08-27T15:30:00Z",
    durationSec: 1200,
    status: "completed",
    notes: "Follow-up call, discussed implementation timeline",
    nextActionDate: "2025-08-29T10:00:00Z",
    createdAt: "2025-08-27T15:30:00Z"
  },
  {
    id: "call-3",
    leadId: "lead-3",
    leadName: "Mike Wilson",
    leadEmail: "mike@wilson.com",
    leadMobile: "+1122334455",
    scheduledAt: "2025-08-26T11:15:00Z",
    staffId: "staff1",
    datetime: "2025-08-26T11:15:00Z",
    durationSec: 1800,
    status: "completed",
    notes: "Product demo call, scheduled in-person meeting",
    createdAt: "2025-08-26T11:15:00Z"
  },
  {
    id: "call-4",
    leadId: "lead-4",
    leadName: "Emma Davis",
    leadEmail: "emma@global.com",
    leadMobile: "+1555666777",
    scheduledAt: "2025-08-25T16:45:00Z",
    staffId: "staff1",
    datetime: "2025-08-25T16:45:00Z",
    durationSec: 600,
    status: "completed",
    notes: "Pricing discussion, sent quotation",
    createdAt: "2025-08-25T16:45:00Z"
  },
  {
    id: "call-5",
    leadId: "lead-6",
    leadName: "Jane Doe",
    leadEmail: "jane@doe.com",
    leadMobile: "+1999888777",
    scheduledAt: "2025-08-28T14:00:00Z",
    staffId: "staff1",
    datetime: "2025-08-28T14:00:00Z",
    status: "missed",
    notes: "Attempted contact, no answer",
    nextActionDate: "2025-08-29T16:00:00Z",
    createdAt: "2025-08-28T14:00:00Z"
  },
  {
    id: "call-6",
    leadId: "lead-7",
    leadName: "John Smith",
    leadEmail: "john@smith.com",
    leadMobile: "+1111222333",
    scheduledAt: "2025-08-29T10:30:00Z",
    staffId: "staff1",
    datetime: "2025-08-29T10:30:00Z",
    status: "scheduled",
    notes: "Scheduled follow-up call",
    createdAt: "2025-08-28T17:00:00Z"
  }
];

const dummyLeads: Lead[] = [
  {
    id: "lead-1",
    name: "John Smith",
    company: "Tech Solutions Inc",
    email: "john.smith@techsolutions.com",
    mobile: "+1-555-0101",
    source: "Website",
    status: "new",
  },
  {
    id: "lead-2",
    name: "Sarah Johnson",
    company: "Global Manufacturing",
    email: "sarah.j@globalmanuf.com",
    mobile: "+1-555-0102",
    source: "Referral",
    status: "in_followup",
  },
  {
    id: "lead-3",
    name: "Michael Chen",
    company: "Innovation Labs",
    email: "m.chen@innovationlabs.com",
    mobile: "+1-555-0103",
    source: "LinkedIn",
    status: "meeting_scheduled",
  },
  {
    id: "lead-4",
    name: "Emily Rodriguez",
    company: "StartupXYZ",
    email: "emily@startupxyz.com",
    mobile: "+1-555-0104",
    source: "Trade Show",
    status: "details_sent",
  },
  {
    id: "lead-6",
    name: "Lisa Thompson",
    company: "Creative Agency",
    email: "lisa@creativeagency.com",
    mobile: "+1-555-0106",
    source: "Website",
    status: "new",
  },
  {
    id: "lead-7",
    name: "Robert Brown",
    company: "Manufacturing Plus",
    email: "r.brown@manufplus.com",
    mobile: "+1-555-0107",
    source: "Referral",
    status: "in_followup",
  }
];

export default function StaffCalls() {
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CallStatus | "all">("all");

  // Use dummy data instead of API calls for demo
  const calls = dummyCalls;
  const leads = dummyLeads;
  const isLoading = false;

  // Create a map of lead names for easy lookup
  const leadMap = leads?.reduce((acc, lead) => {
    acc[lead.id] = lead;
    return acc;
  }, {} as Record<string, any>) || {};

  // Filter calls by status
  const filteredCalls = calls?.filter(call => {
    if (statusFilter === "all") return true;
    return call.status === statusFilter;
  }) || [];

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const columns = [
    {
      key: 'leadId',
      header: 'Lead',
      render: (value: string) => {
        const lead = leadMap[value];
        return lead ? (
          <div>
            <div className="text-sm font-medium text-foreground">{lead.name}</div>
            <div className="text-sm text-muted-foreground">{lead.company}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Unknown Lead</div>
        );
      },
      sortable: true,
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (value: string) => {
        const { date, time } = formatDateTime(value);
        return (
          <div>
            <div className="text-sm font-medium text-foreground">{date}</div>
            <div className="text-sm text-muted-foreground">{time}</div>
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'durationSec',
      header: 'Duration',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{formatDuration(value)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <StatusBadge status={value as any} type="call" />
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (value: string) => (
        <div className="max-w-xs truncate">
          {value || 'No notes'}
        </div>
      ),
    },
    {
      key: 'nextActionDate',
      header: 'Next Action',
      render: (value: string) => {
        if (!value) return 'None';
        const actionDate = new Date(value);
        const today = new Date();
        const isOverdue = actionDate < today;
        const isToday = actionDate.toDateString() === today.toDateString();
        
        return (
          <div className={`text-sm ${
            isOverdue ? 'text-destructive' : 
            isToday ? 'text-accent' : 
            'text-muted-foreground'
          }`}>
            {isToday ? 'Today' : actionDate.toLocaleDateString()}
          </div>
        );
      },
    },
  ];

  const filters = (
    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CallStatus | "all")}>
      <SelectTrigger className="w-40" data-testid="status-filter">
        <SelectValue placeholder="All Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="missed">Missed</SelectItem>
        <SelectItem value="scheduled">Scheduled</SelectItem>
      </SelectContent>
    </Select>
  );

  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter(call => call.status === ('completed' satisfies CallStatus)).length || 0;
  const missedCalls = calls?.filter(call => call.status === ('missed' satisfies CallStatus)).length || 0;

  const todayCalls = calls?.filter(call => {
    if (!call.datetime) return false;
    const callDate = new Date(call.datetime);
    const today = new Date();
    return callDate.toDateString() === today.toDateString();
  }) || [];

  return (
    <DashboardLayout>
      <div className="p-6" data-testid="staff-calls-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Call Management</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage all your calls with leads
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="schedule-call-button">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Call
            </Button>
            <Button onClick={() => setCallDialogOpen(true)} data-testid="log-call-button">
              <Plus className="mr-2 h-4 w-4" />
              Log Call
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-3xl font-bold text-foreground">{totalCalls}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-foreground">{completedCalls}</p>
                </div>
                <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Missed</p>
                  <p className="text-3xl font-bold text-foreground">{missedCalls}</p>
                </div>
                <div className="h-12 w-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Calls</p>
                  <p className="text-3xl font-bold text-foreground">{todayCalls.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calls Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredCalls}
              columns={columns}
              searchKey="notes"
              searchPlaceholder="Search calls..."
              filters={filters}
              isLoading={isLoading}
              emptyMessage="No calls found. Start by logging your first call."
            />
          </CardContent>
        </Card>

        <CallDialog
          open={callDialogOpen}
          onOpenChange={setCallDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
