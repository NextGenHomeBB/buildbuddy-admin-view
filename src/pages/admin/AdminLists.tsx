import { useState } from 'react';
import { ArrowLeft, Plus, Users, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTaskLists, useListTasks, useUnassignedTasks, useWorkerTasks } from '@/hooks/useTaskLists';
import { useWorkers } from '@/hooks/useWorkers';
import { TaskListCard } from '@/components/lists/TaskListCard';
import { CreateTaskListDialog } from '@/components/lists/CreateTaskListDialog';
import { TaskListItem } from '@/components/lists/TaskListItem';
import { WorkerCard } from '@/components/lists/WorkerCard';
import { WorkerTaskItem } from '@/components/lists/WorkerTaskItem';

export function AdminLists() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lists' | 'workers'>('workers');
  
  const { data: taskLists, isLoading: isLoadingLists } = useTaskLists();
  const { data: listTasks, isLoading: isLoadingListTasks } = useListTasks(selectedListId || '');
  const { data: unassignedTasks, isLoading: isLoadingUnassigned } = useUnassignedTasks();
  const { data: workers, isLoading: isLoadingWorkers } = useWorkers();
  const { data: workerTasks, isLoading: isLoadingWorkerTasks } = useWorkerTasks(selectedWorkerId || '');

  const selectedList = taskLists?.find(list => list.id === selectedListId);
  const selectedWorker = workers?.find(worker => worker.id === selectedWorkerId);

  // Add task counts to workers
  const workersWithTaskCounts = workers?.map(worker => ({
    ...worker,
    task_count: workerTasks && selectedWorkerId === worker.id ? workerTasks.length : 0
  }));

  // Worker view
  if (selectedWorkerId && selectedWorker) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedWorkerId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workers
          </Button>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{selectedWorker.full_name}</h1>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              Assigned Tasks ({workerTasks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingWorkerTasks ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading tasks...
              </div>
            ) : workerTasks && workerTasks.length > 0 ? (
              <div className="space-y-4">
                {workerTasks.map((task, index) => (
                  <div key={task.id} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 to-primary/5 rounded-full"></div>
                    <div className="pl-6">
                      <WorkerTaskItem task={task} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tasks assigned to this worker yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <CreateTaskListDialog />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'lists' | 'workers')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="lists" className="gap-2">
            <List className="h-4 w-4" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="workers" className="gap-2">
            <Users className="h-4 w-4" />
            Workers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-6">
          {/* Task Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingLists ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading lists...
              </div>
            ) : taskLists && taskLists.length > 0 ? (
              taskLists.map((list) => (
                <TaskListCard
                  key={list.id}
                  list={list}
                  onClick={() => setSelectedListId(list.id)}
                />
              ))
            ) : (
              <Card className="col-span-full bg-card border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">No task lists yet</p>
                  <CreateTaskListDialog
                    trigger={
                      <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Your First List
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unassigned Tasks */}
          {unassignedTasks && unassignedTasks.length > 0 && (
            <>
              <Separator className="my-8" />
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Unassigned Tasks ({unassignedTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingUnassigned ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading tasks...
                    </div>
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
        </TabsContent>

        <TabsContent value="workers" className="space-y-6">
          {/* Workers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingWorkers ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading workers...
              </div>
            ) : workersWithTaskCounts && workersWithTaskCounts.length > 0 ? (
              workersWithTaskCounts.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  onClick={() => setSelectedWorkerId(worker.id)}
                />
              ))
            ) : (
              <Card className="col-span-full bg-card border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No workers found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}