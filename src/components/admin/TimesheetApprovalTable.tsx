import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Clock, User } from "lucide-react";

interface TimeSheet {
  id: string;
  user_id: string;
  project_id: string | null;
  work_date: string;
  hours: number;
  note: string | null;
  location: string | null;
  shift_type: string | null;
  break_duration: number | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  profiles: {
    full_name: string;
  };
  projects: {
    name: string;
  } | null;
}

export function TimesheetApprovalTable() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const { data: timesheets, isLoading } = useQuery({
    queryKey: ['timesheets-for-approval', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('time_sheets')
        .select(`
          id,
          user_id,
          project_id,
          work_date,
          hours,
          note,
          location,
          shift_type,
          break_duration,
          approval_status,
          approved_by,
          approved_at,
          rejection_reason,
          profiles!time_sheets_user_id_fkey(full_name),
          projects(name)
        `)
        .order('work_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('approval_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeSheet[];
    },
    enabled: !!user,
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const { error } = await supabase
        .from('time_sheets')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', timesheetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Timesheet approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['timesheets-for-approval'] });
    },
    onError: (error) => {
      toast({
        title: "Error approving timesheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }: { timesheetId: string; reason: string }) => {
      const { error } = await supabase
        .from('time_sheets')
        .update({
          approval_status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', timesheetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Timesheet rejected" });
      queryClient.invalidateQueries({ queryKey: ['timesheets-for-approval'] });
      setRejectionReason("");
      setSelectedTimesheetId(null);
    },
    onError: (error) => {
      toast({
        title: "Error rejecting timesheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleReject = (timesheetId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    rejectTimesheetMutation.mutate({ timesheetId, reason: rejectionReason });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading timesheets...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Timesheet Approval
        </CardTitle>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && timesheets && (
                <span className="ml-1">
                  ({timesheets.filter(t => t.approval_status === status).length})
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!timesheets || timesheets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No timesheets found for the selected filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.map((timesheet) => (
                <TableRow key={timesheet.id}>
                  <TableCell className="font-medium">
                    {timesheet.profiles?.full_name || 'Unknown Worker'}
                  </TableCell>
                  <TableCell>
                    {timesheet.projects?.name || 'No Project'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(timesheet.work_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{timesheet.hours}h</TableCell>
                  <TableCell className="capitalize">
                    {timesheet.shift_type || 'Regular'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(timesheet.approval_status)}
                  </TableCell>
                  <TableCell>
                    {timesheet.approval_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveTimesheetMutation.mutate(timesheet.id)}
                          disabled={approveTimesheetMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTimesheetId(timesheet.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Timesheet</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>Please provide a reason for rejecting this timesheet:</p>
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setRejectionReason("");
                                    setSelectedTimesheetId(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReject(timesheet.id)}
                                  disabled={rejectTimesheetMutation.isPending}
                                >
                                  Reject Timesheet
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {timesheet.approval_status === 'rejected' && timesheet.rejection_reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {timesheet.rejection_reason}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}