import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, ArrowRight } from 'lucide-react';
import { OrganizationSelectionDialog } from './OrganizationSelectionDialog';

interface OrganizationSelectionPromptProps {
  onOrganizationJoined: () => void;
}

export function OrganizationSelectionPrompt({ onOrganizationJoined }: OrganizationSelectionPromptProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to BuildBuddy</CardTitle>
            <CardDescription className="text-base">
              To get started, you need to join an organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
                <Users className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold">Team Collaboration</h4>
                  <p className="text-sm text-muted-foreground">
                    Work together with your team on projects and tasks
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
                <Building2 className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold">Organization Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Access projects, materials, and schedules within your organization
                  </p>
                </div>
              </div>
            </div>

            <Button 
              className="w-full"
              onClick={() => setShowDialog(true)}
            >
              Select Organization
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't see your organization?{' '}
                <span className="text-primary font-medium">
                  Contact your administrator for an invitation
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <OrganizationSelectionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onOrganizationJoined={onOrganizationJoined}
      />
    </>
  );
}