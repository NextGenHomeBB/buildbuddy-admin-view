import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Users, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useOptimizeShifts, useShifts, useBulkUpdateShifts } from '@/hooks/useShiftOptimization';
import { format } from 'date-fns';

interface ShiftSelection {
  id: string;
  accepted: boolean;
}

export default function AdminScheduleAuto() {
  const [selectedDate, setSelectedDate] = useState(
    () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
  );
  
  const [shiftSelections, setShiftSelections] = useState<Record<string, boolean>>({});
  const [autoConfirm, setAutoConfirm] = useState(false);

  const optimizeShifts = useOptimizeShifts();
  const { data: shifts, refetch: refetchShifts } = useShifts(selectedDate, 'proposed');
  const bulkUpdateShifts = useBulkUpdateShifts();

  const handleOptimize = () => {
    optimizeShifts.mutate({ 
      date: selectedDate, 
      autoConfirm 
    }, {
      onSuccess: () => {
        if (!autoConfirm) {
          refetchShifts();
        }
      }
    });
  };

  const handleShiftToggle = (shiftId: string, accepted: boolean) => {
    setShiftSelections(prev => ({
      ...prev,
      [shiftId]: accepted
    }));
  };

  const handleSelectAll = (accepted: boolean) => {
    const newSelections: Record<string, boolean> = {};
    shifts?.forEach(shift => {
      newSelections[shift.id] = accepted;
    });
    setShiftSelections(newSelections);
  };

  const handleConfirmShifts = () => {
    const updates = shifts?.map(shift => ({
      id: shift.id,
      status: shiftSelections[shift.id] ? 'confirmed' : 'rejected',
      notes: shiftSelections[shift.id] ? 'Confirmed via auto-scheduler' : 'Rejected via auto-scheduler'
    })) || [];

    bulkUpdateShifts.mutate(updates, {
      onSuccess: () => {
        setShiftSelections({});
        refetchShifts();
      }
    });
  };

  const selectedCount = Object.values(shiftSelections).filter(Boolean).length;
  const totalShifts = shifts?.length || 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Auto-Assign</h1>
          <p className="text-muted-foreground">
            Automatically optimize worker assignments for daily tasks
          </p>
        </div>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Generate Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Target Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-confirm"
                checked={autoConfirm}
                onCheckedChange={(checked) => setAutoConfirm(checked as boolean)}
              />
              <Label htmlFor="auto-confirm">Auto-confirm optimized shifts</Label>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleOptimize}
                disabled={optimizeShifts.isPending}
                className="w-full"
              >
                {optimizeShifts.isPending ? 'Optimizing...' : 'Generate Schedule'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposed Shifts */}
      {shifts && shifts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Proposed Shifts for {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCount} of {totalShifts} selected
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSelectAll(true)}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSelectAll(false)}
              >
                Select None
              </Button>
              <Button 
                onClick={handleConfirmShifts}
                disabled={Object.keys(shiftSelections).length === 0 || bulkUpdateShifts.isPending}
                className="ml-auto"
              >
                {bulkUpdateShifts.isPending ? 'Updating...' : 'Confirm Selected'}
              </Button>
            </div>

            {/* Shifts List */}
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={shiftSelections[shift.id] || false}
                      onCheckedChange={(checked) => 
                        handleShiftToggle(shift.id, checked as boolean)
                      }
                    />
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{shift.task?.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {shift.task?.project?.name}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {shift.worker?.full_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={getConfidenceColor(shift.confidence_score)}
                      variant="secondary"
                    >
                      {shift.confidence_score}% confidence
                    </Badge>
                    
                    {shiftSelections[shift.id] === true && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {shiftSelections[shift.id] === false && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {shifts && shifts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Proposed Shifts</h3>
            <p className="text-muted-foreground mb-4">
              No shifts have been proposed for {format(new Date(selectedDate), 'MMMM d, yyyy')}. 
              Try generating a schedule or check if there are tasks scheduled for this date.
            </p>
            <Button onClick={handleOptimize} disabled={optimizeShifts.isPending}>
              Generate Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}