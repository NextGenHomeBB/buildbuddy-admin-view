import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SystemOverview } from '../SystemOverview';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SystemOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'fake-token', refresh_token: 'fake-refresh', expires_in: 3600, token_type: 'bearer', user: { id: 'fake-user' } } as any },
      error: null,
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        total_users: 10,
        active_users: 8,
        total_projects: 5,
        active_projects: 3,
        total_tasks: 25,
        completed_tasks: 15,
        pending_invitations: 2,
      },
      error: null,
    });
  });

  it('renders system overview correctly', async () => {
    render(<SystemOverview />, { wrapper: createWrapper() });
    
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Monitor system health, security, and activity.')).toBeInTheDocument();
  });

  it('displays system statistics', async () => {
    render(<SystemOverview />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total users
      expect(screen.getByText('5')).toBeInTheDocument();  // Total projects
      expect(screen.getByText('25')).toBeInTheDocument(); // Total tasks
      expect(screen.getByText('2')).toBeInTheDocument();  // Pending invitations
    });
  });

  it('handles refresh functionality', async () => {
    render(<SystemOverview />, { wrapper: createWrapper() });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('get_system_stats', {
        headers: { Authorization: 'Bearer fake-token' },
      });
    });
  });

  it('handles export report functionality', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { report: 'System Report CSV Data' },
      error: null,
    });

    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'fake-blob-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

    render(<SystemOverview />, { wrapper: createWrapper() });
    
    const exportButton = screen.getByRole('button', { name: /export report/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('export_system_report', {
        headers: { Authorization: 'Bearer fake-token' },
      });
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('displays loading state initially', () => {
    render(<SystemOverview />, { wrapper: createWrapper() });
    
    // Should show skeleton loaders
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});