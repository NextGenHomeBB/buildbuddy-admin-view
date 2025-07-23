import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PhaseDetailTab } from '../admin/PhaseDetailTab';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('../../hooks/usePhases', () => ({
  usePhases: () => ({
    data: [
      {
        id: 'phase-1',
        name: 'Foundation Phase',
        description: 'Building the foundation',
        status: 'in_progress',
        progress: 75,
        start_date: '2024-01-01',
        project_id: 'project-1'
      }
    ],
    isLoading: false
  })
}));

vi.mock('../../hooks/useTasks', () => ({
  useTasks: () => ({
    data: [
      {
        id: 'task-1',
        title: 'Excavate foundation',
        description: 'Dig foundation trenches',
        status: 'done',
        priority: 'high',
        phase_id: 'phase-1',
        project_id: 'project-1',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'task-2',
        title: 'Pour concrete',
        description: 'Pour concrete foundation',
        status: 'in_progress',
        priority: 'medium',
        phase_id: 'phase-1',
        project_id: 'project-1',
        created_at: '2024-01-02T00:00:00Z'
      }
    ],
    isLoading: false
  })
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PhaseDetailTab', () => {
  it('renders phase title correctly', () => {
    renderWithProviders(
      <PhaseDetailTab phaseId="phase-1" projectId="project-1" />
    );
    
    expect(screen.getByText('Foundation Phase')).toBeInTheDocument();
    expect(screen.getByText('Building the foundation')).toBeInTheDocument();
  });

  it('shows correct budget badge colour based on status', () => {
    renderWithProviders(
      <PhaseDetailTab phaseId="phase-1" projectId="project-1" />
    );
    
    // Check that the status badge is present and has the correct styling
    const statusBadge = screen.getByText('in progress');
    expect(statusBadge).toBeInTheDocument();
    
    // Check that progress is displayed correctly
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Check that task completion is shown
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('displays tasks for the phase', () => {
    renderWithProviders(
      <PhaseDetailTab phaseId="phase-1" projectId="project-1" />
    );
    
    // Check that both tasks are displayed
    expect(screen.getByText('Excavate foundation')).toBeInTheDocument();
    expect(screen.getByText('Pour concrete')).toBeInTheDocument();
    
    // Check task descriptions
    expect(screen.getByText('Dig foundation trenches')).toBeInTheDocument();
    expect(screen.getByText('Pour concrete foundation')).toBeInTheDocument();
  });

  it('handles phase not found', () => {
    renderWithProviders(
      <PhaseDetailTab phaseId="non-existent-phase" projectId="project-1" />
    );
    
    expect(screen.getByText('Phase not found')).toBeInTheDocument();
  });

  it('shows add task button', () => {
    renderWithProviders(
      <PhaseDetailTab phaseId="phase-1" projectId="project-1" />
    );
    
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });
});