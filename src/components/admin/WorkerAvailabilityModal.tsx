import { useState } from 'react';
import { X, Clock, Calendar, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkerWithAvailability, useUpdateWorkerAvailability, useUpdateWorkerDateAvailability } from '@/hooks/useWorkerAvailability';
import { toast } from 'sonner';

interface WorkerAvailabilityModalProps {
  worker: WorkerWithAvailability | null;
  open: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { index: 0, label: 'Sunday', short: 'Sun' },
  { index: 1, label: 'Monday', short: 'Mon' },
  { index: 2, label: 'Tuesday', short: 'Tue' },
  { index: 3, label: 'Wednesday', short: 'Wed' },
  { index: 4, label: 'Thursday', short: 'Thu' },
  { index: 5, label: 'Friday', short: 'Fri' },
  { index: 6, label: 'Saturday', short: 'Sat' },
];

export function WorkerAvailabilityModal({ worker, open, onClose }: WorkerAvailabilityModalProps) {
  const [weeklyAvailability, setWeeklyAvailability] = useState(() => 
    worker ? [...worker.weekly_availability] : []
  );
  const [dateOverrides, setDateOverrides] = useState(() => {
    const overrides = worker ? [...worker.date_overrides] : [];
    console.log('🔄 Modal initialized with date overrides:', overrides);
    return overrides;
  });
  const [newOverrideDate, setNewOverrideDate] = useState('');
  const [newOverrideNote, setNewOverrideNote] = useState('');

  const updateWeeklyMutation = useUpdateWorkerAvailability();
  const updateDateMutation = useUpdateWorkerDateAvailability();

  if (!worker) return null;

  const handleWeeklyAvailabilityChange = (dayIndex: number, field: string, value: any) => {
    setWeeklyAvailability(prev => {
      const existing = prev.find(wa => wa.day_of_week === dayIndex);
      if (existing) {
        return prev.map(wa => 
          wa.day_of_week === dayIndex 
            ? { ...wa, [field]: value }
            : wa
        );
      } else {
        return [...prev, {
          id: '',
          worker_id: worker.id,
          day_of_week: dayIndex,
          is_available: field === 'is_available' ? value : false,
          start_time: field === 'start_time' ? value : null,
          end_time: field === 'end_time' ? value : null,
          max_hours: field === 'max_hours' ? value : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    });
  };

  const handleSaveWeeklyAvailability = async () => {
    try {
      await updateWeeklyMutation.mutateAsync({
        workerId: worker.id,
        availability: weeklyAvailability
      });
      toast.success('Weekly availability updated successfully');
    } catch (error) {
      toast.error('Failed to update weekly availability');
      console.error(error);
    }
  };

  const handleAddDateOverride = () => {
    if (!newOverrideDate) return;
    
    const override = {
      id: '',
      worker_id: worker.id,
      date: newOverrideDate,
      is_available: false,
      note: newOverrideNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setDateOverrides(prev => [...prev, override]);
    setNewOverrideDate('');
    setNewOverrideNote('');
  };

  const handleSaveDateOverrides = async () => {
    try {
      await updateDateMutation.mutateAsync({
        workerId: worker.id,
        dateAvailability: dateOverrides
      });
      toast.success('Date overrides updated successfully');
    } catch (error) {
      toast.error('Failed to update date overrides');
      console.error(error);
    }
  };

  const removeDateOverride = (index: number) => {
    setDateOverrides(prev => prev.filter((_, i) => i !== index));
  };

  const getWeeklyAvailabilityForDay = (dayIndex: number) => {
    return weeklyAvailability.find(wa => wa.day_of_week === dayIndex) || {
      id: '',
      worker_id: worker.id,
      day_of_week: dayIndex,
      is_available: false,
      start_time: null,
      end_time: null,
      max_hours: null,
      created_at: '',
      updated_at: '',
    };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={worker.avatar_url} />
              <AvatarFallback>{worker.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg">{worker.full_name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{worker.role}</Badge>
                Available {worker.available_days_count} days/week
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Schedule
            </TabsTrigger>
            <TabsTrigger value="overrides" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Overrides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Weekly Availability Pattern</span>
                  <Button
                    onClick={handleSaveWeeklyAvailability}
                    disabled={updateWeeklyMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const availability = getWeeklyAvailabilityForDay(day.index);
                  return (
                    <div key={day.index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20">
                        <Label className="font-medium">{day.label}</Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={availability.is_available}
                          onCheckedChange={(checked) => 
                            handleWeeklyAvailabilityChange(day.index, 'is_available', checked)
                          }
                        />
                        <span className="text-sm">Available</span>
                      </div>

                      {availability.is_available && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Start:</Label>
                            <Input
                              type="time"
                              value={availability.start_time || ''}
                              onChange={(e) => 
                                handleWeeklyAvailabilityChange(day.index, 'start_time', e.target.value)
                              }
                              className="w-32"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm">End:</Label>
                            <Input
                              type="time"
                              value={availability.end_time || ''}
                              onChange={(e) => 
                                handleWeeklyAvailabilityChange(day.index, 'end_time', e.target.value)
                              }
                              className="w-32"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Max Hours:</Label>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={availability.max_hours || ''}
                              onChange={(e) => 
                                handleWeeklyAvailabilityChange(day.index, 'max_hours', 
                                  parseFloat(e.target.value) || null)
                              }
                              className="w-24"
                              placeholder="8"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overrides" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Date-Specific Overrides</span>
                  <Button
                    onClick={handleSaveDateOverrides}
                    disabled={updateDateMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new override */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-3">Add Date Override</h4>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="text-sm">Date</Label>
                      <Input
                        type="date"
                        value={newOverrideDate}
                        onChange={(e) => setNewOverrideDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="flex-2">
                      <Label className="text-sm">Note (optional)</Label>
                      <Input
                        placeholder="Reason for unavailability..."
                        value={newOverrideNote}
                        onChange={(e) => setNewOverrideNote(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddDateOverride} disabled={!newOverrideDate}>
                        Add Override
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing overrides */}
                <div className="space-y-2">
                  {dateOverrides.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No date overrides set</p>
                      <p className="text-xs mt-1">Add specific dates when this worker will be unavailable</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground mb-3">
                        {dateOverrides.length} override{dateOverrides.length !== 1 ? 's' : ''} configured
                      </div>
                      {dateOverrides
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((override, index) => {
                          const date = new Date(override.date);
                          const today = new Date();
                          const isPast = date < today;
                          const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <div 
                              key={`${override.id || index}-${override.date}`} 
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                isPast ? 'opacity-60 bg-muted/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <AlertCircle className={`h-4 w-4 ${
                                  override.is_available ? 'text-green-500' : 'text-destructive'
                                }`} />
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {date.toLocaleDateString('en-US', { 
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                    <Badge variant={override.is_available ? "default" : "destructive"} className="text-xs">
                                      {override.is_available ? "Available" : "Unavailable"}
                                    </Badge>
                                    {!isPast && (
                                      <span className="text-xs text-muted-foreground">
                                        ({daysDiff > 0 ? `in ${daysDiff} days` : 'today'})
                                      </span>
                                    )}
                                    {isPast && (
                                      <span className="text-xs text-muted-foreground">(past)</span>
                                    )}
                                  </div>
                                  {override.note && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      "{override.note}"
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeDateOverride(index)}
                                className="shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
