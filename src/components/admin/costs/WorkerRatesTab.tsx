import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, DollarSign } from 'lucide-react';
import { WorkerRate } from '@/hooks/useWorkerCosts';
import { format } from 'date-fns';
import { WorkerRateDialog } from './WorkerRateDialog';

interface WorkerRatesTabProps {
  rates: WorkerRate[];
  isLoading: boolean;
}

export function WorkerRatesTab({ rates, isLoading }: WorkerRatesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<WorkerRate | null>(null);

  const handleEdit = (rate: WorkerRate) => {
    setSelectedRate(rate);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedRate(null);
    setIsDialogOpen(true);
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'hourly': return 'bg-blue-100 text-blue-800';
      case 'salary': return 'bg-green-100 text-green-800';
      case 'contract': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Worker Rates</h3>
          <p className="text-sm text-muted-foreground">
            Manage hourly rates, salaries, and payment types for your team
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rates.map((rate) => (
          <Card key={rate.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={rate.profiles?.avatar_url} />
                    <AvatarFallback>
                      {rate.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm">{rate.profiles?.full_name || 'Unknown Worker'}</CardTitle>
                    <CardDescription className="text-xs">
                      Active since {format(new Date(rate.effective_date), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getPaymentTypeColor(rate.payment_type)}>
                  {rate.payment_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {rate.payment_type === 'hourly' 
                      ? `$${rate.hourly_rate}/hr`
                      : rate.payment_type === 'salary'
                      ? `$${rate.monthly_salary?.toLocaleString()}/mo`
                      : 'Contract'
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(rate)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              {rate.end_date && (
                <div className="mt-2 text-xs text-amber-600">
                  Ends on {format(new Date(rate.end_date), 'MMM dd, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {rates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No worker rates set</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding hourly rates or salaries for your team members
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Rate
            </Button>
          </CardContent>
        </Card>
      )}

      <WorkerRateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rate={selectedRate}
      />
    </div>
  );
}