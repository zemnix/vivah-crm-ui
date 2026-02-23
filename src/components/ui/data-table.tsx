import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  filters?: React.ReactNode;
  emptyMessage?: string;
  // Server-side pagination props
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean; // Add this prop
  rowClassName?: (item: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  isLoading,
  onRowClick,
  actions,
  filters,
  emptyMessage = "No data available",
  serverSide = false,
  currentPage: serverCurrentPage = 1,
  totalPages: serverTotalPages = 1,
  pageSize: serverPageSize = 10,
  totalItems: serverTotalItems = 0,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true, // Default to true for backward compatibility
  rowClassName,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter data
  const filteredData = data?.filter(item => {
    if (!searchKey || !searchTerm) return true;
    const value = item[searchKey];
    return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = serverSide ? serverTotalPages : Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = serverSide ? data || [] : sortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page: number) => {
    if (serverSide) {
      onPageChange?.(page);
    } else {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (serverSide) {
      onPageSizeChange?.(size);
    } else {
      setPageSize(size);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((_column, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="data-table">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="search-input"
            />
          </div>
        )}
        {filters}
        {showPageSizeSelector && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={(serverSide ? serverPageSize : pageSize).toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead 
                    key={index}
                    className={`${column.sortable ? "cursor-pointer hover:bg-muted/50" : ""} whitespace-nowrap`}
                    onClick={() => column.sortable && handleSort(column.key as string)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{column.header}</span>
                      {column.sortable && sortKey === column.key && (
                        <span className="text-xs flex-shrink-0">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                {actions && <TableHead className="w-[100px] whitespace-nowrap">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {emptyMessage}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow 
                    key={index}
                    className={cn(
                      onRowClick ? "cursor-pointer hover:bg-muted/50" : "",
                      rowClassName?.(item)
                    )}
                    onClick={() => onRowClick?.(item)}
                    data-testid={`table-row-${index}`}
                  >
                    {columns.map((column, cellIndex) => (
                      <TableCell key={cellIndex} className="max-w-[200px]">
                        <div className="truncate">
                          {column.render 
                            ? column.render(item[column.key as keyof T], item)
                            : item[column.key as keyof T]
                          }
                        </div>
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell onClick={(e) => e.stopPropagation()} className="w-[100px]">
                        <div className="flex items-center justify-start">
                          {actions(item)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {serverSide ? (serverCurrentPage - 1) * serverPageSize + 1 : startIndex + 1} to {serverSide ? Math.min(serverCurrentPage * serverPageSize, serverTotalItems) : Math.min(startIndex + pageSize, sortedData.length)} of {serverSide ? serverTotalItems : sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(serverSide ? serverCurrentPage - 1 : currentPage - 1)}
              disabled={serverSide ? serverCurrentPage === 1 : currentPage === 1}
              data-testid="prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-sm whitespace-nowrap">
              Page {serverSide ? serverCurrentPage : currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(serverSide ? serverCurrentPage + 1 : currentPage + 1)}
              disabled={serverSide ? serverCurrentPage === serverTotalPages : currentPage === totalPages}
              data-testid="next-page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
