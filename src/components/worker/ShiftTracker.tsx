import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShiftTracker } from '@/hooks/useShiftTracker';
import { useWorkerProjects } from '@/hooks/useWorkerProjects';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Clock, Play, Square, DollarSign, Coffee, AlertTriangle, TrendingUp } from 'lucide-react';

export function ShiftTracker() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { triggerHaptic } = useHapticFeedback();
  
  const { 
    currentShift, 
    todayTotalHours, 
    currentRate,
    isShiftActive,
    isOnBreak,
    getCurrentShiftDuration,
    getLiveEarnings,
    startShift, 
    endShift,
    startBreak,
    endBreak,
    forceSyncShift,
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
  const liveEarnings = getLiveEarnings();

  const handleStartBreak = () => {
    triggerHaptic('light');
    startBreak();
  };

  const handleEndBreak = () => {
    triggerHaptic('light');
    endBreak();
  };

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
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isShiftActive ? "default" : "secondary"}>
                {isShiftActive ? (isOnBreak ? 'On Break' : 'On Duty') : 'Off Duty'}
              </Badge>
              {isShiftActive && currentShift?.shiftType && currentShift.shiftType !== 'regular' && (
                <Badge variant="outline" className="text-xs">
                  {currentShift.shiftType}
                </Badge>
              )}
            </div>
          </div>
          {isShiftActive && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {isOnBreak ? 'Work Time' : 'Current Shift'}
              </p>
              <p className="text-lg font-bold text-primary">
                {formatDuration(currentShiftDuration)}
              </p>
              {liveEarnings.overtime && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  Overtime
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Earnings Display */}
        {isShiftActive && currentRate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Live Earnings</p>
                <p className="text-lg font-bold text-green-800">
                  ${liveEarnings.currentShiftEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  Today: ${liveEarnings.todayEarnings.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-green-600">
                  ${(currentRate.hourly_rate || 0).toFixed(2)}/hr
                  {liveEarnings.overtime && ' (OT: 1.5x)'}
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Action Buttons */}
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
            <>
              <Button 
                onClick={isOnBreak ? handleEndBreak : handleStartBreak}
                disabled={isLoading}
                variant="outline"
                className="touch-button"
                size="lg"
              >
                <Coffee className="h-4 w-4 mr-2" />
                {isOnBreak ? 'End Break' : 'Start Break'}
              </Button>
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
            </>
          )}
        </div>

        {/* Sync Button for Active Shifts */}
        {isShiftActive && (
          <Button 
            onClick={() => forceSyncShift()}
            disabled={isLoading}
            variant="outline"
            className="w-full touch-button text-sm"
          >
            Sync to Database
          </Button>
        )}

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
        {isShiftActive && currentShift?.startTime && (
          <div className="text-center text-sm text-muted-foreground bg-muted/50 p-2 rounded space-y-1">
            <div>Started at {new Date(currentShift.startTime).toLocaleTimeString()}</div>
            {(currentShift.totalBreakTime || 0) > 0 && (
              <div className="text-xs">
                Break time: {Math.round(currentShift.totalBreakTime || 0)} minutes
              </div>
            )}
            {isOnBreak && currentShift.breakStart && (
              <div className="text-xs text-orange-600">
                On break since {new Date(currentShift.breakStart).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}