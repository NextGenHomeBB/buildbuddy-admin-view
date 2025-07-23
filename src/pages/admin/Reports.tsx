import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, BarChart3 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePhases } from '@/hooks/usePhases';
import { useTasks } from '@/hooks/useTasks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

export function Reports() {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: projects = [] } = useProjects();
  const { data: allPhases = [] } = usePhases(''); // Empty string to get all phases
  const { data: allTasks = [] } = useTasks(''); // Empty string to get all tasks
  const { toast } = useToast();

  // Filter data based on selections
  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.id === selectedProject);

  const filteredPhases = selectedProject === 'all'
    ? allPhases
    : allPhases.filter(p => p.project_id === selectedProject);

  const filteredTasks = selectedProject === 'all'
    ? allTasks
    : allTasks.filter(t => {
        const project = projects.find(p => p.id === t.project_id);
        return project && (selectedProject === 'all' || project.id === selectedProject);
      });

  const generatePDFReport = async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Build-Buddy Project Report', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 20, 30);
      
      if (selectedProject !== 'all') {
        const project = projects.find(p => p.id === selectedProject);
        doc.text(`Project: ${project?.name || 'Unknown'}`, 20, 40);
      }

      let yPosition = selectedProject !== 'all' ? 50 : 40;

      // Project Summary
      doc.setFontSize(16);
      doc.text('Project Summary', 20, yPosition);
      yPosition += 10;

      const projectData = filteredProjects.map(project => [
        project.name,
        project.status || 'Unknown',
        `${Math.round(project.progress || 0)}%`,
        project.budget ? `€${project.budget.toLocaleString()}` : 'N/A',
        project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'N/A'
      ]);

      autoTable(doc, {
        head: [['Project', 'Status', 'Progress', 'Budget', 'Start Date']],
        body: projectData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Phase Summary
      doc.setFontSize(16);
      doc.text('Phase Summary', 20, yPosition);
      yPosition += 10;

      const phaseData = filteredPhases.map(phase => {
        const project = projects.find(p => p.id === phase.project_id);
        return [
          project?.name || 'Unknown',
          phase.name,
          phase.status || 'Unknown',
          `${Math.round(phase.progress || 0)}%`,
          phase.start_date ? new Date(phase.start_date).toLocaleDateString('en-GB') : 'N/A'
        ];
      });

      autoTable(doc, {
        head: [['Project', 'Phase', 'Status', 'Progress', 'Start Date']],
        body: phaseData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Task Summary
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.text('Task Summary', 20, yPosition);
      yPosition += 10;

      const taskData = filteredTasks.slice(0, 20).map(task => {
        const project = projects.find(p => p.id === task.project_id);
        return [
          project?.name || 'Unknown',
          task.title,
          task.status || 'Unknown',
          task.priority || 'Medium',
          task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB') : 'N/A'
        ];
      });

      autoTable(doc, {
        head: [['Project', 'Task', 'Status', 'Priority', 'Created']],
        body: taskData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Save PDF
      const fileName = selectedProject === 'all' 
        ? `BuildBuddy_Report_${new Date().toISOString().split('T')[0]}.pdf`
        : `BuildBuddy_${projects.find(p => p.id === selectedProject)?.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        
      doc.save(fileName);
      
      toast({
        title: "PDF Report Generated",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcelReport = async () => {
    try {
      setIsGenerating(true);
      const workbook = XLSX.utils.book_new();

      // Projects sheet
      const projectsData = filteredProjects.map(project => ({
        'Project Name': project.name,
        'Status': project.status || 'Unknown',
        'Progress (%)': Math.round(project.progress || 0),
        'Budget (€)': project.budget || 0,
        'Start Date': project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'N/A',
        'Location': project.location || 'N/A',
        'Description': project.description || 'N/A'
      }));

      const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');

      // Phases sheet
      const phasesData = filteredPhases.map(phase => {
        const project = projects.find(p => p.id === phase.project_id);
        return {
          'Project': project?.name || 'Unknown',
          'Phase Name': phase.name,
          'Status': phase.status || 'Unknown',
          'Progress (%)': Math.round(phase.progress || 0),
          'Start Date': phase.start_date ? new Date(phase.start_date).toLocaleDateString('en-GB') : 'N/A',
          'End Date': phase.end_date ? new Date(phase.end_date).toLocaleDateString('en-GB') : 'N/A',
          'Description': phase.description || 'N/A'
        };
      });

      const phasesSheet = XLSX.utils.json_to_sheet(phasesData);
      XLSX.utils.book_append_sheet(workbook, phasesSheet, 'Phases');

      // Tasks sheet
      const tasksData = filteredTasks.map(task => {
        const project = projects.find(p => p.id === task.project_id);
        return {
          'Project': project?.name || 'Unknown',
          'Task Title': task.title,
          'Status': task.status || 'Unknown',
          'Priority': task.priority || 'Medium',
          'Description': task.description || 'N/A',
          'Created': task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB') : 'N/A',
          'Updated': task.updated_at ? new Date(task.updated_at).toLocaleDateString('en-GB') : 'N/A',
          'Completed': task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-GB') : 'N/A'
        };
      });

      const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');

      // Save Excel file
      const fileName = selectedProject === 'all' 
        ? `BuildBuddy_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        : `BuildBuddy_${projects.find(p => p.id === selectedProject)?.name}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Excel Report Generated",
        description: "Your report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        title: "Error",
        description: "Failed to generate Excel report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export project reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Configure your report parameters before generating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input 
                type="date"
                value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
                placeholder="Select start date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input 
                type="date"
                value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
                placeholder="Select end date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                <Button
                  onClick={generatePDFReport}
                  disabled={isGenerating}
                  className="flex-1 gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  onClick={generateExcelReport}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex-1 gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProjects.length}</div>
            <p className="text-sm text-muted-foreground">
              {selectedProject === 'all' ? 'Total projects' : 'Selected project'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPhases.length}</div>
            <p className="text-sm text-muted-foreground">
              Total phases in scope
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTasks.length}</div>
            <p className="text-sm text-muted-foreground">
              Total tasks in scope
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sample Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>
            Sample of data that will be included in your report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.slice(0, 3).map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="font-medium text-foreground">{project.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Status: {project.status} • Progress: {Math.round(project.progress || 0)}%
                  {project.budget && ` • Budget: €${project.budget.toLocaleString()}`}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Phases: {filteredPhases.filter(p => p.project_id === project.id).length} • 
                  Tasks: {filteredTasks.filter(t => t.project_id === project.id).length}
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No projects match your current filters
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}