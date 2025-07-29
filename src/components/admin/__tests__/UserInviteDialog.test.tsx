import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { UserInviteDialog } from '../UserInviteDialog';
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

describe('UserInviteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onUserInvited: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'fake-token', refresh_token: 'fake-refresh', expires_in: 3600, token_type: 'bearer', user: { id: 'fake-user' } } as any },
      error: null,
    });
  });

  it('renders invite form correctly', () => {
    render(<UserInviteDialog {...mockProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Invite Team Members')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Addresses')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Role')).toBeInTheDocument();
  });

  it('validates email addresses correctly', async () => {
    render(<UserInviteDialog {...mockProps} />, { wrapper: createWrapper() });
    
    const emailInput = screen.getByLabelText('Email Addresses');
    fireEvent.change(emailInput, { 
      target: { value: 'valid@email.com, invalid-email, another@valid.com' } 
    });

    await waitFor(() => {
      expect(screen.getByText('valid@email.com')).toBeInTheDocument();
      expect(screen.getByText('another@valid.com')).toBeInTheDocument();
      expect(screen.getByText('invalid-email')).toBeInTheDocument();
    });
  });

  it('sends invitations successfully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { invited: [{ email: 'test@example.com' }] },
      error: null,
    });

    render(<UserInviteDialog {...mockProps} />, { wrapper: createWrapper() });
    
    fireEvent.change(screen.getByLabelText('Email Addresses'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send.*invitation/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invite_users', {
        body: {
          emails: ['test@example.com'],
          role: 'worker',
          message: '',
          send_welcome: true,
        },
        headers: { Authorization: 'Bearer fake-token' },
      });
    });
  });

  it('handles invitation errors gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Failed to send invitations' },
    });

    render(<UserInviteDialog {...mockProps} />, { wrapper: createWrapper() });
    
    fireEvent.change(screen.getByLabelText('Email Addresses'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send.*invitation/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });
});