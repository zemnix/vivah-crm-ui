import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  type?: 'call' | 'meeting' | 'note' | 'status' | 'quotation';
  user?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  const getTypeIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'call':
        return '📞';
      case 'meeting':
        return '📅';
      case 'note':
        return '📝';
      case 'status':
        return '🔄';
      case 'quotation':
        return '💰';
      default:
        return '•';
    }
  };

  const getTypeColor = (type: TimelineItem['type']) => {
    switch (type) {
      case 'call':
        return 'bg-purple-500';
      case 'meeting':
        return 'bg-blue-500';
      case 'note':
        return 'bg-gray-500';
      case 'status':
        return 'bg-orange-500';
      case 'quotation':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No activity yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="timeline">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                getTypeColor(item.type)
              )}
            >
              {getTypeIcon(item.type)}
            </div>
            {index < items.length - 1 && (
              <div className="w-0.5 h-8 bg-border mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
                {item.user && (
                  <p className="text-xs text-muted-foreground mt-1">by {item.user}</p>
                )}
              </div>
              <time className="text-xs text-muted-foreground">
                {formatTimestamp(item.timestamp)}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
