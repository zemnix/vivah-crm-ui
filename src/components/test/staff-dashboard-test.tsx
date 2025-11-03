import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import StaffDashboard from '@/pages/staff/dashboard';

// Mock the dashboard hook
jest.mock('@/hooks/useDashboard');
const mockUseDashboard = useDashboard as jest.MockedFunction<typeof useDashboard>;

// Mock the dashboard layout
jest.mock('@/components/layouts/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>
}));

describe('StaffDashboard', () => {
  beforeEach(() => {
    mockUseDashboard.mockReturnValue({
      getCurrentUserDashboard: jest.fn().mockReturnValue({
        data: {
          interactions: {
            stats: {
              total: 15,
              scheduled: 5,
              completed: 8,
              missed: 2
            },
            monthlyData: [
              { date: '2024-01-01', scheduled: 2, completed: 1, missed: 0 },
              { date: '2024-01-02', scheduled: 3, completed: 2, missed: 1 }
            ]
          },
          quotations: {
            stats: {
              total: 12,
              draft: 3,
              sent: 5,
              accepted: 3,
              rejected: 1
            },
            monthlyData: [
              { date: '2024-01-01', draft: 1, sent: 2, accepted: 1, rejected: 0 },
              { date: '2024-01-02', draft: 2, sent: 3, accepted: 2, rejected: 1 }
            ]
          }
        },
        isLoading: false,
        error: null,
        fetchData: jest.fn()
      }),
      technicianData: null,
      staffData: null,
      adminData: null,
      isLoadingTechnician: false,
      isLoadingStaff: false,
      isLoadingAdmin: false,
      technicianError: null,
      staffError: null,
      adminError: null,
      fetchTechnicianData: jest.fn(),
      fetchStaffData: jest.fn(),
      fetchAdminData: jest.fn(),
      clearTechnicianData: jest.fn(),
      clearStaffData: jest.fn(),
      clearAdminData: jest.fn(),
      clearAllData: jest.fn(),
      clearErrors: jest.fn()
    });
  });

  it('renders staff dashboard with interaction stats', () => {
    render(
      <BrowserRouter>
        <StaffDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Staff Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Interactions (Calls & Meetings)')).toBeInTheDocument();
    expect(screen.getByText('Total Interactions')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Missed')).toBeInTheDocument();
  });

  it('renders quotation stats', () => {
    render(
      <BrowserRouter>
        <StaffDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Quotations')).toBeInTheDocument();
    expect(screen.getByText('Total Quotations')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('displays correct interaction stats values', () => {
    render(
      <BrowserRouter>
        <StaffDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('15')).toBeInTheDocument(); // Total Interactions
    expect(screen.getByText('5')).toBeInTheDocument();  // Scheduled
    expect(screen.getByText('8')).toBeInTheDocument();  // Completed
    expect(screen.getByText('2')).toBeInTheDocument();  // Missed
  });

  it('displays correct quotation stats values', () => {
    render(
      <BrowserRouter>
        <StaffDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('12')).toBeInTheDocument(); // Total Quotations
    expect(screen.getByText('3')).toBeInTheDocument();  // Draft
    expect(screen.getByText('5')).toBeInTheDocument();  // Sent
    expect(screen.getByText('3')).toBeInTheDocument();  // Accepted
    expect(screen.getByText('1')).toBeInTheDocument();  // Rejected
  });

  it('renders charts section', () => {
    render(
      <BrowserRouter>
        <StaffDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Interactions Timeline')).toBeInTheDocument();
    expect(screen.getByText('Interaction Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Quotations Timeline')).toBeInTheDocument();
    expect(screen.getByText('Quotation Status Distribution')).toBeInTheDocument();
    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
  });
});
