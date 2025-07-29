import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Eye, DollarSign, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import { WorkerExpense } from '@/hooks/useWorkerCosts';
import { format } from 'date-fns';
import { useUpdateExpenseStatus } from '@/hooks/useWorkerCosts';
import { ExpenseDialog } from './ExpenseDialog';

interface ExpensesTabProps {
  expenses: WorkerExpense[];
  isLoading: boolean;
}

export function ExpensesTab({ expenses, isLoading }: ExpensesTabProps) {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const updateStatus = useUpdateExpenseStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = (expenseId: string, status: WorkerExpense['status']) => {
    updateStatus.mutate({ id: expenseId, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Worker Expenses</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve worker expense claims and reimbursements
          </p>
        </div>
        <Button onClick={() => setIsExpenseDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="space-y-4">
        {expenses.map((expense) => (
          <Card key={expense.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={expense.profiles?.avatar_url} />
                    <AvatarFallback>
                      {expense.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{expense.profiles?.full_name || 'Unknown Worker'}</CardTitle>
                    <CardDescription>
                      {expense.expense_type} • {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                      {expense.projects?.name && ` • ${expense.projects.name}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(expense.status)}>
                    {expense.status}
                  </Badge>
                  <span className="text-lg font-semibold">
                    ${expense.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Description:</span>
                  <p className="text-sm mt-1">{expense.description}</p>
                </div>
                
                {expense.receipt_url && (
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={expense.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Receipt
                    </a>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted {format(new Date(expense.created_at), 'MMM dd, yyyy')}</span>
                    {expense.approved_at && (
                      <>
                        <span>•</span>
                        <span>Approved {format(new Date(expense.approved_at), 'MMM dd, yyyy')}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {expense.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(expense.id, 'approved')}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(expense.id, 'rejected')}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}
                    {expense.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(expense.id, 'paid')}
                        disabled={updateStatus.isPending}
                      >
                        <DollarSign className="mr-1 h-3 w-3" />
                        Mark as Paid
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="mr-1 h-3 w-3" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expenses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No expense claims</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Worker expense claims will appear here for review and approval
            </p>
            <Button onClick={() => setIsExpenseDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </CardContent>
        </Card>
      )}

      <ExpenseDialog 
        open={isExpenseDialogOpen} 
        onOpenChange={setIsExpenseDialogOpen} 
      />
    </div>
  );
}