import { Upload, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectFilesTabProps {
  projectId: string;
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Files</h3>
          <p className="text-sm text-muted-foreground">Upload and manage project documents</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>Drag and drop files or click to upload</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">Drop files here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <Button variant="outline">Browse Files</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>Files associated with this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No files uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}