import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { name: string };
  phase?: { name: string };
  task_list?: { name: string; color_hex: string };
}

interface WorkerTaskItemProps {
  task: Task;
}

export function WorkerTaskItem({ task }: WorkerTaskItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-500';
      case 'in_progress': return 'bg-blue-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 border-red-300';
      case 'medium': return 'text-yellow-600 border-yellow-300';
      case 'low': return 'text-green-600 border-green-300';
      default: return 'text-muted-foreground border-gray-300';
    }
  };

  return (
    <div className="relative">
      {/* Left accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/30 rounded-full"></div>
      
      <div className="ml-4 p-5 border-2 border-border rounded-xl bg-card hover:shadow-xl hover:border-primary/30 transition-all duration-300 space-y-4">
        {/* Task Title */}
        <h4 className="font-semibold text-xl text-card-foreground leading-tight">{task.title}</h4>
        
        {/* Status and Priority Row */}
        <div className="flex items-center gap-3">
          <Badge 
            variant="secondary" 
            className={`text-sm font-medium px-4 py-2 ${getStatusColor(task.status)} text-white rounded-full`}
          >
            {task.status.replace('_', ' ').toUpperCase()}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={`text-sm font-medium px-4 py-2 border-2 rounded-full ${getPriorityColor(task.priority)}`}
          >
            {task.priority.toUpperCase()} PRIORITY
          </Badge>
        </div>

        {/* Project, Phase, and List Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {task.project && (
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border-2 border-blue-200">
              <span className="text-blue-600">📁</span>
              <span className="text-sm font-medium text-blue-700">{task.project.name}</span>
            </div>
          )}

          {task.phase && (
            <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 border-2 border-purple-200">
              <span className="text-purple-600">🏗️</span>
              <span className="text-sm font-medium text-purple-700">{task.phase.name}</span>
            </div>
          )}

          {task.task_list && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border-2 border-gray-200">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: task.task_list.color_hex }}
              />
              <span className="text-sm font-medium text-gray-700">📋 {task.task_list.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}