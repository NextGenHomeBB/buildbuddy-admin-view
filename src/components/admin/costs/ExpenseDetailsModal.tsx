import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, FileText, Building, Tag } from 'lucide-react';
import { WorkerExpense } from '@/hooks/useWorkerCosts';
import { format } from 'date-fns';

interface ExpenseDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: WorkerExpense | null;
}

export function ExpenseDetailsModal({ open, onOpenChange, expense }: ExpenseDetailsModalProps) {
  if (!expense) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={expense.profiles?.avatar_url} />
              <AvatarFallback>
                {expense.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{expense.profiles?.full_name || 'Unknown Worker'}</div>
              <Badge className={getStatusColor(expense.status)}>
                {expense.status}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Expense claim submitted on {format(new Date(expense.created_at), 'MMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Expense Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Expense Type</div>
                    <div className="text-sm text-muted-foreground">{expense.expense_type}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Expense Date</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
              
              {expense.projects?.name && (
                <div className="mt-4 flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Project</div>
                    <div className="text-sm text-muted-foreground">{expense.projects.name}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </h3>
              <div className="text-3xl font-bold">${expense.amount.toLocaleString()}</div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Description</h3>
              <div className="bg-muted p-4 rounded text-sm">
                {expense.description}
              </div>
            </CardContent>
          </Card>

          {/* Receipt */}
          {expense.receipt_url && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Receipt
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Receipt Document</div>
                      <div className="text-sm text-muted-foreground">
                        Attached receipt for expense verification
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href={expense.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Receipt
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">Expense Submitted</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(expense.created_at), 'MMM dd, yyyy hh:mm a')}
                    </div>
                  </div>
                </div>
                
                {expense.approved_at && (
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      expense.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium">
                        {expense.status === 'approved' ? 'Approved' : 'Status Updated'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(expense.approved_at), 'MMM dd, yyyy hh:mm a')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}