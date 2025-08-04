import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectTimeSheets } from '@/hooks/useProjectTimeSheets';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useProjectTimeSheets', () => {
  const mockProjectId = 'test-project-id';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch timesheets for a project', async () => {
    const mockTimesheets = [
      {
        id: '1',
        user_id: 'test-user-id',
        project_id: mockProjectId,
        work_date: '2024-01-15',
        hours: 8,
        note: 'Test work',
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTimesheets, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder
    });

    const { result } = renderHook(
      () => useProjectTimeSheets(mockProjectId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.timesheets).toEqual(mockTimesheets);
    });

    expect(result.current.totalHours).toBe(8);
    expect(result.current.timesheets).toHaveLength(1);
  });

  it('should create a new timesheet entry', async () => {
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'new-id',
        user_id: 'test-user-id',
        project_id: mockProjectId,
        work_date: '2024-01-15',
        hours: 4,
        note: 'New work'
      },
      error: null
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle
    });

    mockInsert.mockReturnValue({
      select: mockSelect,
      single: mockSingle
    });

    mockSelect.mockReturnValue({
      single: mockSingle
    });

    const { result } = renderHook(
      () => useProjectTimeSheets(mockProjectId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.createTimesheet).toBeDefined();
    });

    result.current.createTimesheet({
      project_id: mockProjectId,
      work_date: '2024-01-15',
      hours: 4,
      note: 'New work'
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        project_id: mockProjectId,
        work_date: '2024-01-15',
        hours: 4,
        note: 'New work'
      });
    });
  });

  it('should handle timesheet sync', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.functions.invoke as any).mockImplementation(mockInvoke);

    const { result } = renderHook(
      () => useProjectTimeSheets(mockProjectId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.syncTimesheet).toBeDefined();
    });

    result.current.syncTimesheet('timesheet-id');

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('sync-timesheet', {
        body: { timesheet_id: 'timesheet-id' }
      });
    });
  });

  it('should calculate total hours correctly', async () => {
    const mockTimesheets = [
      { hours: 8, id: '1' },
      { hours: 4, id: '2' },
      { hours: 6, id: '3' }
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTimesheets, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder
    });

    const { result } = renderHook(
      () => useProjectTimeSheets(mockProjectId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.totalHours).toBe(18);
    });
  });
});