import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TimesheetCard } from './TimesheetCard';
import { useProjectTimeSheets } from '@/hooks/useProjectTimeSheets';
import { useToast } from '@/hooks/use-toast';

interface ProjectTimeTrackingProps {
  projectId: string;
}

interface ActiveTimer {
  startTime: Date;
  projectId: string;
}

export function ProjectTimeTracking({ projectId }: ProjectTimeTrackingProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopForm, setStopForm] = useState({
    note: '',
    location: ''
  });

  const {
    timesheets,
    totalHours,
    recentTimesheets,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet,
    syncTimesheet,
    isCreating
  } = useProjectTimeSheets(projectId);

  const { toast } = useToast();

  // Update elapsed time every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  // Load active timer from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem(`active-timer-${projectId}`);
    if (savedTimer) {
      const timer = JSON.parse(savedTimer);
      setActiveTimer({
        ...timer,
        startTime: new Date(timer.startTime)
      });
    }
  }, [projectId]);

  const startTimer = () => {
    const timer = {
      startTime: new Date(),
      projectId
    };
    
    setActiveTimer(timer);
    setElapsedTime(0);
    
    // Save to localStorage
    localStorage.setItem(`active-timer-${projectId}`, JSON.stringify(timer));
    
    toast({
      title: "Timer started",
      description: "Time tracking started for this project."
    });
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    
    const hours = elapsedTime / 3600; // Convert seconds to hours
    
    createTimesheet({
      project_id: projectId,
      work_date: new Date().toISOString().split('T')[0],
      hours: Math.round(hours * 100) / 100, // Round to 2 decimal places
      note: stopForm.note || null,
      location: stopForm.location || null,
      shift_type: 'regular'
    });
    
    // Clear timer
    setActiveTimer(null);
    setElapsedTime(0);
    setShowStopDialog(false);
    setStopForm({ note: '', location: '' });
    
    // Remove from localStorage
    localStorage.removeItem(`active-timer-${projectId}`);
    
    toast({
      title: "Timer stopped",
      description: `Logged ${Math.round(hours * 100) / 100} hours to timesheet.`
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEditTimesheet = (timesheet: any) => {
    updateTimesheet({
      id: timesheet.id,
      hours: timesheet.hours,
      note: timesheet.note,
      location: timesheet.location
    });
  };

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-2xl font-mono font-bold">
                {formatTime(elapsedTime)}
              </div>
              <Badge variant={activeTimer ? "default" : "secondary"}>
                {activeTimer ? "Recording" : "Stopped"}
              </Badge>
            </div>
            
            <Button
              onClick={activeTimer ? () => setShowStopDialog(true) : startTimer}
              size="lg"
              variant={activeTimer ? "destructive" : "default"}
              className="min-w-[120px]"
            >
              {activeTimer ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHours}h</div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{timesheets.length}</div>
            <p className="text-sm text-muted-foreground">Time Entries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {recentTimesheets.length}
            </div>
            <p className="text-sm text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Timesheets */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Time Entries</h3>
        
        {timesheets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No time entries yet</p>
              <p className="text-sm text-muted-foreground">Start tracking time for this project</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentTimesheets.map((timesheet) => (
              <TimesheetCard
                key={timesheet.id}
                timesheet={timesheet}
                onEdit={handleEditTimesheet}
                onDelete={deleteTimesheet}
                onSync={syncTimesheet}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stop Timer Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-mono font-bold">{formatTime(elapsedTime)}</div>
              <p className="text-sm text-muted-foreground">Time to log</p>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={stopForm.location}
                onChange={(e) => setStopForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Work location (optional)"
              />
            </div>
            
            <div>
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                value={stopForm.note}
                onChange={(e) => setStopForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={stopTimer} className="flex-1" disabled={isCreating}>
                {isCreating ? "Saving..." : "Save & Stop"}
              </Button>
              <Button variant="outline" onClick={() => setShowStopDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <div className="md:hidden">
        <FloatingActionButton
          icon={activeTimer ? Square : Play}
          onClick={activeTimer ? () => setShowStopDialog(true) : startTimer}
          variant={activeTimer ? "destructive" : "default"}
          label={activeTimer ? "Stop Timer" : "Start Timer"}
        />
      </div>
    </div>
  );
}