import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Users, List, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTaskLists, useListTasks, useUnassignedTasks, useWorkerTasks, useAssignTaskToList } from '@/hooks/useTaskLists';
import { useWorkers } from '@/hooks/useWorkers';
import { useProjects } from '@/hooks/useProjects';
import { TaskListCard } from '@/components/lists/TaskListCard';
import { CreateTaskListDialog } from '@/components/lists/CreateTaskListDialog';
import { DraggableTaskListItem } from '@/components/lists/DraggableTaskListItem';
import { WorkerCard } from '@/components/lists/WorkerCard';
import { WorkerTaskItem } from '@/components/lists/WorkerTaskItem';
import { DragDropProvider } from '@/components/lists/DragDropProvider';
import { DroppableListContainer } from '@/components/lists/DroppableListContainer';
import { AdvancedFilter, FilterState } from '@/components/lists/AdvancedFilter';
import { BulkActions } from '@/components/lists/BulkActions';
import { useBulkTaskActions } from '@/hooks/useBulkTaskActions';
import { useTaskFiltering } from '@/hooks/useTaskFiltering';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function AdminLists() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lists' | 'workers'>('workers');
  const [expandedDoneSections, setExpandedDoneSections] = useState<Record<string, boolean>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    priority: [],
    assignee: [],
    project: [],
  });
  
  // Setup realtime sync
  useRealtimeSync();
  
  // Queries
  const { data: taskLists, isLoading: isLoadingLists } = useTaskLists();
  const { data: listTasks, isLoading: isLoadingListTasks } = useListTasks(selectedListId || '');
  const { data: unassignedTasks, isLoading: isLoadingUnassigned } = useUnassignedTasks();
  const { data: workers, isLoading: isLoadingWorkers } = useWorkers();
  const { data: workerTasks, isLoading: isLoadingWorkerTasks } = useWorkerTasks(selectedWorkerId || '');
  const { data: projects } = useProjects();
  
  // Mutations
  const assignTaskToList = useAssignTaskToList();
  const { bulkUpdateTasks, bulkDeleteTasks } = useBulkTaskActions();

  const selectedList = taskLists?.find(list => list.id === selectedListId);
  const selectedWorker = workers?.find(worker => worker.id === selectedWorkerId);

  // Add task counts to workers
  const workersWithTaskCounts = workers?.map(worker => ({
    ...worker,
    task_count: workerTasks && selectedWorkerId === worker.id ? workerTasks.length : 0
  }));

  // Separate tasks based on context - prioritize list membership
  const adminAssignedTasks = workerTasks?.filter(task => 
    // Admin tasks: have phase_id OR have project_id but NO list_id
    (task.phase_id || task.project_id) && !task.list_id
  ) || [];
  
  const workerCreatedTasks = workerTasks?.filter(task => 
    // Worker tasks: have list_id OR have neither phase_id nor project_id
    task.list_id || (!task.phase_id && !task.project_id)
  ) || [];

  // Group tasks by status
  const groupTasksByStatus = (tasks: any[]) => {
    return {
      todo: tasks.filter(task => task.status === 'todo'),
      in_progress: tasks.filter(task => task.status === 'in_progress'),
      done: tasks.filter(task => task.status === 'done')
    };
  };

  const adminGrouped = groupTasksByStatus(adminAssignedTasks);
  const workerGrouped = groupTasksByStatus(workerCreatedTasks);

  // Calculate progress
  const calculateProgress = (tasks: any[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.status === 'done').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const adminProgress = calculateProgress(adminAssignedTasks);
  const workerProgress = calculateProgress(workerCreatedTasks);

  // Filter data
  const filteredListTasks = useTaskFiltering(listTasks || [], filters);
  const filteredUnassignedTasks = useTaskFiltering(unassignedTasks || [], filters);
  const filteredWorkerTasks = useTaskFiltering(workerTasks || [], filters);

  // Available options for filters
  const availableAssignees = useMemo(() => {
    const uniqueAssignees = new Map();
    [...(listTasks || []), ...(unassignedTasks || []), ...(workerTasks || [])].forEach(task => {
      if ((task as any).assignee_profile) {
        uniqueAssignees.set(task.assignee, {
          id: task.assignee,
          name: (task as any).assignee_profile.full_name
        });
      }
    });
    return Array.from(uniqueAssignees.values());
  }, [listTasks, unassignedTasks, workerTasks]);

  const availableProjects = useMemo(() => {
    return projects?.map(p => ({ id: p.id, name: p.name })) || [];
  }, [projects]);

  const availableLists = useMemo(() => {
    return taskLists?.map(l => ({ id: l.id, name: l.name, color_hex: l.color_hex })) || [];
  }, [taskLists]);

  // Toggle done section visibility
  const toggleDoneSection = (sectionKey: string) => {
    setExpandedDoneSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Selection handlers
  const handleTaskSelect = (taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev => 
      isSelected 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleSelectAll = (taskIds: string[], isSelected: boolean) => {
    setSelectedTaskIds(prev => 
      isSelected
        ? [...new Set([...prev, ...taskIds])]
        : prev.filter(id => !taskIds.includes(id))
    );
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  // Drag and drop handlers
  const handleTaskMove = (taskId: string, newListId: string | null, newPosition: number) => {
    assignTaskToList.mutate({ taskId, listId: newListId });
  };

  const handleTaskReorder = (taskId: string, newPosition: number) => {
    // For now, we'll just update the position in the database
    // This could be enhanced to update a position field if added to the schema
  };

  // Bulk action handlers
  const handleBulkAssign = (assigneeId: string) => {
    bulkUpdateTasks.mutate({
      taskIds: selectedTaskIds,
      updates: { assignee: assigneeId }
    });
    clearSelection();
  };

  const handleBulkMoveToList = (listId: string) => {
    bulkUpdateTasks.mutate({
      taskIds: selectedTaskIds,
      updates: { list_id: listId }
    });
    clearSelection();
  };

  const handleBulkStatusChange = (status: string) => {
    bulkUpdateTasks.mutate({
      taskIds: selectedTaskIds,
      updates: { status }
    });
    clearSelection();
  };

  const handleBulkDelete = () => {
    bulkDeleteTasks.mutate(selectedTaskIds);
    clearSelection();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: [],
      priority: [],
      assignee: [],
      project: [],
    });
  };

  // Render task section
  const renderTaskSection = (title: string, icon: any, tasks: any[], color: string, progress: number, sectionKey: string) => {
    const grouped = groupTasksByStatus(tasks);
    const isDoneExpanded = expandedDoneSections[sectionKey] || false;
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              {title} ({tasks.length})
            </div>
            <div className="text-sm text-muted-foreground">
              {progress}% complete
            </div>
          </CardTitle>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <div className="space-y-6">
              {/* To Do Tasks */}
              {grouped.todo.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleDoneSection(`todo-${sectionKey}`)}
                    className="flex items-center gap-2 mb-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left group"
                  >
                    {expandedDoneSections[`todo-${sectionKey}`] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-muted-foreground">To Do ({grouped.todo.length})</h4>
                  </button>
                  {expandedDoneSections[`todo-${sectionKey}`] && (
                     <div className="space-y-3 pl-6 animate-fade-in">
                       {grouped.todo.map((task) => (
                         <DraggableTaskListItem 
                           key={task.id} 
                           task={task}
                           isSelected={selectedTaskIds.includes(task.id)}
                           onSelect={handleTaskSelect}
                         />
                       ))}
                     </div>
                  )}
                </div>
              )}

              {/* In Progress Tasks */}
              {grouped.in_progress.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-blue-700">In Progress ({grouped.in_progress.length})</h4>
                  </div>
                   <div className="space-y-3 pl-6">
                     {grouped.in_progress.map((task) => (
                       <DraggableTaskListItem 
                         key={task.id} 
                         task={task}
                         isSelected={selectedTaskIds.includes(task.id)}
                         onSelect={handleTaskSelect}
                       />
                     ))}
                   </div>
                </div>
              )}

              {/* Done Tasks */}
              {grouped.done.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleDoneSection(sectionKey)}
                    className="flex items-center gap-2 mb-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left group"
                  >
                    {isDoneExpanded ? (
                      <ChevronDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-green-500" />
                    )}
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium text-green-700">Done ({grouped.done.length})</h4>
                  </button>
                  {isDoneExpanded && (
                     <div className="space-y-3 pl-6 animate-fade-in">
                       {grouped.done.map((task) => (
                         <DraggableTaskListItem 
                           key={task.id} 
                           task={task}
                           isSelected={selectedTaskIds.includes(task.id)}
                           onSelect={handleTaskSelect}
                         />
                       ))}
                     </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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

        <div className="space-y-6">
          {!workerTasks ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <>
              <DragDropProvider
                tasks={filteredWorkerTasks}
                onTaskMove={handleTaskMove}
                onTaskReorder={handleTaskReorder}
              >
                {/* Bulk Actions */}
                <BulkActions
                  selectedTaskIds={selectedTaskIds}
                  onBulkAssign={handleBulkAssign}
                  onBulkMoveToList={handleBulkMoveToList}
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusChange={handleBulkStatusChange}
                  onClearSelection={clearSelection}
                  availableAssignees={availableAssignees}
                  availableLists={availableLists}
                />

                {renderTaskSection(
                  "Admin Assigned Tasks",
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>,
                  adminAssignedTasks,
                  "blue",
                  adminProgress,
                  `admin-${selectedWorkerId}`
                )}
                
                {renderTaskSection(
                  "Worker Created Tasks", 
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>,
                  workerCreatedTasks,
                  "green", 
                  workerProgress,
                  `worker-${selectedWorkerId}`
                )}
              </DragDropProvider>
            </>
          )}
        </div>
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
            <DragDropProvider
              tasks={filteredListTasks}
              onTaskMove={handleTaskMove}
              onTaskReorder={handleTaskReorder}
            >
              {/* Advanced Filter */}
              <div className="mb-4">
                <AdvancedFilter
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableAssignees={availableAssignees}
                  availableProjects={availableProjects}
                  onClearFilters={clearFilters}
                />
              </div>

              {/* Bulk Actions */}
              <BulkActions
                selectedTaskIds={selectedTaskIds}
                onBulkAssign={handleBulkAssign}
                onBulkMoveToList={handleBulkMoveToList}
                onBulkDelete={handleBulkDelete}
                onBulkStatusChange={handleBulkStatusChange}
                onClearSelection={clearSelection}
                availableAssignees={availableAssignees}
                availableLists={availableLists}
              />

              {isLoadingListTasks ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading tasks...
                </div>
              ) : filteredListTasks && filteredListTasks.length > 0 ? (
                <DroppableListContainer id={`list-${selectedListId}`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={filteredListTasks.every(task => selectedTaskIds.includes(task.id))}
                        onChange={(e) => handleSelectAll(filteredListTasks.map(t => t.id), e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all ({filteredListTasks.length})
                      </span>
                    </div>
                    {filteredListTasks.map((task) => (
                      <DraggableTaskListItem 
                        key={task.id} 
                        task={task} 
                        showRemoveButton={true}
                        isSelected={selectedTaskIds.includes(task.id)}
                        onSelect={handleTaskSelect}
                      />
                    ))}
                  </div>
                </DroppableListContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {filters.search || filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0 || filters.project.length > 0
                    ? "No tasks match the current filters."
                    : "No tasks in this list yet."
                  }
                </div>
              )}
            </DragDropProvider>
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
          {/* Advanced Filter */}
          <AdvancedFilter
            filters={filters}
            onFiltersChange={setFilters}
            availableAssignees={availableAssignees}
            availableProjects={availableProjects}
            onClearFilters={clearFilters}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedTaskIds={selectedTaskIds}
            onBulkAssign={handleBulkAssign}
            onBulkMoveToList={handleBulkMoveToList}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onClearSelection={clearSelection}
            availableAssignees={availableAssignees}
            availableLists={availableLists}
          />

          <DragDropProvider
            tasks={[...(filteredListTasks || []), ...(filteredUnassignedTasks || [])]}
            onTaskMove={handleTaskMove}
            onTaskReorder={handleTaskReorder}
          >
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
            {filteredUnassignedTasks && filteredUnassignedTasks.length > 0 && (
              <>
                <Separator className="my-8" />
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Unassigned Tasks ({filteredUnassignedTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingUnassigned ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading tasks...
                      </div>
                    ) : (
                      <DroppableListContainer id="unassigned">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="checkbox"
                              checked={filteredUnassignedTasks.every(task => selectedTaskIds.includes(task.id))}
                              onChange={(e) => handleSelectAll(filteredUnassignedTasks.map(t => t.id), e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-muted-foreground">
                              Select all ({filteredUnassignedTasks.length})
                            </span>
                          </div>
                          {filteredUnassignedTasks.map((task) => (
                            <DraggableTaskListItem 
                              key={task.id} 
                              task={task}
                              isSelected={selectedTaskIds.includes(task.id)}
                              onSelect={handleTaskSelect}
                            />
                          ))}
                        </div>
                      </DroppableListContainer>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </DragDropProvider>
        </TabsContent>

        <TabsContent value="workers" className="space-y-6">
          {/* Advanced Filter */}
          <AdvancedFilter
            filters={filters}
            onFiltersChange={setFilters}
            availableAssignees={availableAssignees}
            availableProjects={availableProjects}
            onClearFilters={clearFilters}
          />

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
