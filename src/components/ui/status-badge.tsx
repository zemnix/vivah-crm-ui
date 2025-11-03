import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LeadStatus, CallStatus, ServiceRequestStatus, QuotationStatus, ServicePriority } from "@/lib/schema";

interface StatusBadgeProps {
  status: LeadStatus | CallStatus | ServiceRequestStatus | QuotationStatus | ServicePriority;
  type: 'lead' | 'call' | 'service' | 'quotation' | 'priority';
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const getVariant = () => {
    switch (type) {
      case 'lead':
        switch (status as LeadStatus) {
          case 'new': 
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
          case 'details_sent': 
            return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700';
          case 'followup': 
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700';
          case 'not_interested': 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
          
          case 'deal_done': 
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700 shadow-sm';
          case 'lost': 
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
          default: 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
      case 'call':
        switch (status as CallStatus) {
          case 'completed': 
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
          case 'missed': 
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
          case 'scheduled': 
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
          default: 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
      case 'service':
        switch (status as ServiceRequestStatus) {
          case 'pending': 
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-700';
          case 'in_progress': 
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
          case 'resolved': 
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
          default: 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
      case 'quotation':
        switch (status as QuotationStatus) {
          case 'draft': 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
          case 'sent': 
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
          case 'accepted': 
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
          case 'rejected': 
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
          default: 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
      case 'priority':
        switch (status as ServicePriority) {
          case 'low': 
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
          case 'medium': 
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
          case 'high': 
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
          default: 
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        }
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusIcon = () => {
    if (type === 'lead') {
      switch (status as LeadStatus) {
        case 'deal_done': return '✅ ';
        case 'lost': return '❌ ';
        
        case 'followup': return '🔄 ';
        case 'details_sent': return '📧 ';
        case 'new': return '🆕 ';
        case 'not_interested': return '⏸️ ';
        default: return '';
      }
    }
    return '';
  };

  return (
    <Badge 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getVariant(),
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      <span className="mr-1">{getStatusIcon()}</span>
      {formatStatus(status)}
    </Badge>
  );
}
