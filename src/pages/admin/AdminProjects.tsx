import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Calendar, DollarSign, Users } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/types/admin';
import { mockProjects } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';

const getStatusBadgeVariant = (status: Project['status']) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'on_hold':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    case 'planning':
      return 'outline';
    default:
      return 'outline';
  }
};

const getPriorityBadgeVariant = (priority: Project['priority']) => {
  switch (priority) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function AdminProjects() {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="space-y-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{project.name}</div>
            <div className="text-sm text-muted-foreground truncate">{project.client_name}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as Project['status'];
        return (
          <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as Project['priority'];
        return (
          <Badge variant={getPriorityBadgeVariant(priority)} className="capitalize">
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'completion_percentage',
      header: 'Progress',
      cell: ({ row }) => {
        const progress = row.getValue('completion_percentage') as number;
        return (
          <div className="space-y-1 min-w-24">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        );
      },
    },
    {
      accessorKey: 'team_size',
      header: 'Team',
      cell: ({ row }) => {
        const teamSize = row.getValue('team_size') as number;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{teamSize}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'budget',
      header: 'Budget',
      cell: ({ row }) => {
        const budget = row.getValue('budget') as number;
        return budget ? (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              ${budget.toLocaleString()}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'end_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const endDate = row.getValue('end_date') as string;
        return endDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(endDate).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate(`/admin/projects/${project.id}`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all your projects in one place.
          </p>
        </div>
        <Button className="admin-button-primary gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Table */}
      <DataTable
        columns={columns}
        data={projects}
        searchPlaceholder="Search projects..."
      />
    </div>
  );
}