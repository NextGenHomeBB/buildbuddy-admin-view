import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
  onDurationChange: (days: number) => void;
  duration?: number;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDurationChange,
  duration = 1
}: DateRangePickerProps) {
  const [durationInput, setDurationInput] = useState(duration.toString());

  const handleDurationChange = (value: string) => {
    setDurationInput(value);
    const days = parseInt(value) || 1;
    onDurationChange(days);
    
    if (startDate) {
      const newEndDate = addDays(startDate, days - 1);
      onEndDateChange(newEndDate);
    }
  };

  const handleStartDateChange = (date?: Date) => {
    onStartDateChange(date);
    if (date && duration) {
      const newEndDate = addDays(date, duration - 1);
      onEndDateChange(newEndDate);
    }
  };

  const handleEndDateChange = (date?: Date) => {
    onEndDateChange(date);
    if (startDate && date) {
      const diffTime = date.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        setDurationInput(diffDays.toString());
        onDurationChange(diffDays);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Duration (days)</Label>
        <Input
          type="number"
          min="1"
          value={durationInput}
          onChange={(e) => handleDurationChange(e.target.value)}
          placeholder="Number of days"
        />
      </div>
    </div>
  );
}