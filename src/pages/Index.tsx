import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, FolderKanban, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg admin-gradient">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">BuildBuddy</h1>
                <p className="text-sm text-muted-foreground">Project Management Platform</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/admin')}
              className="admin-button-primary gap-2"
            >
              Go to Admin Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Professional Project Management Dashboard
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Streamline your project workflows, manage teams, and track progress with our comprehensive admin interface.
          </p>
          <Button 
            onClick={() => navigate('/admin')}
            size="lg"
            className="admin-button-primary gap-2 text-lg px-8 py-3"
          >
            Launch Dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <Card className="admin-card hover:admin-shadow transition-all duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg admin-gradient flex items-center justify-center mb-4">
                <FolderKanban className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Project Management</CardTitle>
              <CardDescription>
                Organize and track multiple projects with detailed phases and progress monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Project timelines and milestones</li>
                <li>• Phase-based progress tracking</li>
                <li>• Budget and resource management</li>
                <li>• Status and priority indicators</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="admin-card hover:admin-shadow transition-all duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg bg-success flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage users, roles, and permissions across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• User roles and permissions</li>
                <li>• Team member invitations</li>
                <li>• Activity and login tracking</li>
                <li>• Client access management</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="admin-card hover:admin-shadow transition-all duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg bg-warning flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive insights and data visualization for informed decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Project completion metrics</li>
                <li>• Team performance analytics</li>
                <li>• Budget tracking and forecasts</li>
                <li>• Customizable dashboards</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
