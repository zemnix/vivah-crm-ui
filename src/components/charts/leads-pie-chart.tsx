import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Lead } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';

interface LeadsPieChartProps {
  readonly data: Lead[] | undefined;
  readonly isLoading: boolean;
}

export function LeadsPieChart({ data, isLoading }: LeadsPieChartProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const statusCounts = data.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    status,
  }));

  const COLORS = {
    new: '#3b82f6',
    assigned: '#10b981',
    in_followup: '#f59e0b',
    meeting_scheduled: '#8b5cf6',
    won: '#22c55e',
    lost: '#ef4444',
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.status as keyof typeof COLORS] || '#666'} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
