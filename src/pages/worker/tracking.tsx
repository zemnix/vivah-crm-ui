import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkEntryDialog } from "@/components/dialogs/work-entry-dialog";
import { useWorkEntryStore } from "@/store/workEntryStore";
import { getUnitLabel, type WorkEntry, WORK_UNITS } from "@/api/workEntryApi";
import { Plus, Search, X, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function WorkerTrackingPage() {
  const {
    workEntries,
    loading,
    error,
    pagination,
    fetchWorkEntries,
    deleteWorkEntry,
  } = useWorkEntryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedWorkEntry, setSelectedWorkEntry] = useState<WorkEntry | null>(null);
  const [filterUnits, setFilterUnits] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch work entries when filters change
  useEffect(() => {
    const fetchData = async () => {
      const queryParams: any = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        units: filterUnits || undefined,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      };
      await fetchWorkEntries(queryParams);
    };
    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, filterUnits, dateFrom, dateTo, fetchWorkEntries]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setSelectedWorkEntry(null);
    setEntryDialogOpen(true);
  };

  const handleEdit = (workEntry: WorkEntry) => {
    setSelectedWorkEntry(workEntry);
    setEntryDialogOpen(true);
  };

  const columns = [
    {
      key: 'workerName',
      header: 'Worker',
      render: (value: string) => value || 'Unknown',
      sortable: true,
    },
    {
      key: 'workName',
      header: 'Work Name',
      render: (value: string) => value || 'No name',
      sortable: true,
    },
    {
      key: 'quantities',
      header: 'Quantity & Size',
      render: (_: any, item: WorkEntry) => {
        const quantities = item.quantities && item.quantities.length > 0
          ? item.quantities
          : item.quantity !== undefined
            ? [{ quantity: item.quantity, size: item.size || undefined }]
            : [];
        
        if (quantities.length === 0) return '-';
        
        return (
          <div className="space-y-1">
            {quantities.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{q.quantity}</span>
                {q.size && <span className="text-muted-foreground">({q.size})</span>}
                {idx === 0 && (
                  <Badge variant="outline" className="text-xs">
                    {getUnitLabel(item.units)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (value: string) => value || '-',
    },
    {
      key: 'attachment',
      header: 'Attachment',
      render: (_: any, item: WorkEntry) =>
        item && (item as any).attachment ? (
          <a href={(item as any).attachment} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            View
          </a>
        ) : '-'
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString();
      },
      sortable: true,
    },
    {
      key: 'createdBy',
      header: 'Recorded By',
      render: (value: any) => value?.name || 'Unknown',
    },
  ];

  const actions = (workEntry: WorkEntry) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEdit(workEntry)}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          if (confirm('Are you sure you want to delete this entry?')) {
            await deleteWorkEntry(workEntry._id);
          }
        }}
        className="text-red-600 hover:text-red-700"
      >
        Delete
      </Button>
    </div>
  );

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Error Loading Work Entries</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => fetchWorkEntries()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-1 sm:p-2 lg:p-3 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Work Tracking</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage work entries
            </p>
          </div>
          
          <Button onClick={handleAddNew} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Work Entry
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search work entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Units Filter */}
              <Select value={filterUnits || "all"} onValueChange={(value) => setFilterUnits(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {WORK_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => setDateFrom(date)}
                    disabled={(date) => date > new Date() || (dateTo ? date > dateTo : false)}
                    autoFocus={false}
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => setDateTo(date)}
                    disabled={(date) => date > new Date() || (dateFrom ? date < dateFrom : false)}
                    autoFocus={false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters */}
            {(filterUnits || dateFrom || dateTo || searchTerm) && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterUnits("");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              data={workEntries}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No work entries found."
              serverSide={true}
              currentPage={pagination?.currentPage || 1}
              totalPages={pagination?.totalPages || 1}
              pageSize={pagination?.itemsPerPage || 10}
              totalItems={pagination?.totalItems || 0}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showPageSizeSelector={false}
            />
          </CardContent>
        </Card>

        {/* Work Entry Dialog */}
        <WorkEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          workEntry={selectedWorkEntry}
          mode={selectedWorkEntry ? 'edit' : 'create'}
        />
      </div>
    </DashboardLayout>
  );
}

