import { AuthDebugPanel } from '@/components/admin/AuthDebugPanel';

export default function AdminAuthDebug() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Authentication Debug</h1>
        <p className="text-muted-foreground">
          Diagnose and fix authentication issues
        </p>
      </div>
      
      <div className="flex justify-center">
        <AuthDebugPanel />
      </div>
    </div>
  );
}