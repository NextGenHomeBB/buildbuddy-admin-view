import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Worker {
  id: string;
  full_name: string;
  avatar_url?: string;
  task_count?: number;
}

interface WorkerCardProps {
  worker: Worker;
  onClick: () => void;
}

export function WorkerCard({ worker, onClick }: WorkerCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow bg-card border-border"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={worker.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {worker.full_name?.charAt(0) || 'W'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">
              {worker.full_name || 'Unknown Worker'}
            </h3>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary" className="text-xs">
          Your number of to-do tasks
        </Badge>
      </CardContent>
    </Card>
  );
}