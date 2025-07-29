import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShiftTracker } from '@/hooks/useShiftTracker';
import { useWorkerProjects } from '@/hooks/useWorkerProjects';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Clock, Play, Square, DollarSign } from 'lucide-react';

export function ShiftTracker() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { triggerHaptic } = useHapticFeedback();
  
  const { 
    currentShift, 
    todayTotalHours, 
    isShiftActive, 
    getCurrentShiftDuration,
    startShift, 
    endShift, 
    isLoading 
  } = useShiftTracker();

  const { data: projects = [] } = useWorkerProjects();

  // Update current time every second for live display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleStartShift = () => {
    triggerHaptic('medium');
    startShift(selectedProject || undefined);
  };

  const handleEndShift = () => {
    triggerHaptic('heavy');
    endShift();
    setSelectedProject('');
  };

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const currentShiftDuration = getCurrentShiftDuration();

  return (
    <Card className="border-2 border-primary/20 touch-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Shift Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={isShiftActive ? "default" : "secondary"} className="mt-1">
              {isShiftActive ? 'On Duty' : 'Off Duty'}
            </Badge>
          </div>
          {isShiftActive && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Shift</p>
              <p className="text-lg font-bold text-primary">
                {formatDuration(currentShiftDuration)}
              </p>
            </div>
          )}
        </div>

        {/* Project Selection */}
        {!isShiftActive && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Project (Optional)</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          {!isShiftActive ? (
            <Button 
              onClick={handleStartShift} 
              disabled={isLoading}
              className="flex-1 touch-button"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Shift
            </Button>
          ) : (
            <Button 
              onClick={handleEndShift} 
              disabled={isLoading}
              variant="destructive"
              className="flex-1 touch-button"
              size="lg"
            >
              <Square className="h-4 w-4 mr-2" />
              End Shift
            </Button>
          )}
        </div>

        {/* Today's Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Total</p>
              <p className="text-lg font-semibold">
                {formatDuration(todayTotalHours + (isShiftActive ? currentShiftDuration : 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="text-sm font-medium">
                {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        {isShiftActive && currentShift.startTime && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            Started at {currentShift.startTime.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}