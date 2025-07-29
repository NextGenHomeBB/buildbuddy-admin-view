import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTaskLists, useListTasks, useUnassignedTasks } from '@/hooks/useTaskLists';
import { TaskListCard } from '@/components/lists/TaskListCard';
import { CreateTaskListDialog } from '@/components/lists/CreateTaskListDialog';
import { TaskListItem } from '@/components/lists/TaskListItem';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export function WorkerLists() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: taskLists, isLoading: isLoadingLists, refetch: refetchLists } = useTaskLists();
  const { data: listTasks, isLoading: isLoadingListTasks, refetch: refetchListTasks } = useListTasks(selectedListId || '');
  const { data: unassignedTasks, isLoading: isLoadingUnassigned, refetch: refetchUnassigned } = useUnassignedTasks();
  const { triggerHaptic } = useHapticFeedback();

  const selectedList = taskLists?.find(list => list.id === selectedListId);

  const handleRefresh = async () => {
    triggerHaptic('light');
    await Promise.all([
      refetchLists(),
      selectedListId ? refetchListTasks() : Promise.resolve(),
      refetchUnassigned()
    ]);
  };

  if (selectedListId && selectedList) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedListId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lists
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: selectedList.color_hex }}
            />
            <h1 className="text-2xl font-bold">{selectedList.name}</h1>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              Tasks ({listTasks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingListTasks ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading tasks...
              </div>
            ) : listTasks && listTasks.length > 0 ? (
              <div className="space-y-3">
                {listTasks.map((task) => (
                  <TaskListItem 
                    key={task.id} 
                    task={task} 
                    showRemoveButton={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tasks in this list yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Task Lists</h1>
          <CreateTaskListDialog />
        </div>

        {/* Task Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoadingLists ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : taskLists && taskLists.length > 0 ? (
            taskLists.map((list) => (
              <TaskListCard
                key={list.id}
                list={list}
                onClick={() => setSelectedListId(list.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={Plus}
              title="No task lists yet"
              description="Create your first task list to get organized"
            />
          )}
        </div>

        {/* Unassigned Tasks */}
        {unassignedTasks && unassignedTasks.length > 0 && (
          <>
            <Separator className="my-8" />
            <Card className="bg-card border-border touch-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Unassigned Tasks ({unassignedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUnassigned ? (
                  <SkeletonCard />
                ) : (
                  <div className="space-y-3">
                    {unassignedTasks.map((task) => (
                      <TaskListItem key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}