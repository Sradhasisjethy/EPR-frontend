import { useState } from 'react';
import { useEmployeeDocuments, useVerifyEmployeeDocument } from '@/hooks/use-employees';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { openApiDocument } from '@/lib/api-document';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';

export function EmployeeDocumentsAdminDialog({ open, onOpenChange, employee }) {
  const employeeId = employee?.id;
  const { data: documents, isLoading } = useEmployeeDocuments(employeeId);
  const verifyMutation = useVerifyEmployeeDocument(employeeId);
  const { hasPermission } = usePermissions();
  // Was hasPermission('EMPLOYEE_WRITE') — a legacy code the API expands away,
  // so no user held it and nobody could verify a document. Verifying is the
  // write this dialog performs, and the route asks for EMPLOYEE_MODIFY.
  const canWrite = hasPermission(WebPermissions.EMPLOYEE_MODIFY);

  const handleVerifyToggle = async (docId, currentVerifiedStatus) => {
    if (!canWrite) return;
    await verifyMutation.mutateAsync({ documentId: docId, isVerified: !currentVerifiedStatus });
  };

  // Group documents by documentType
  const groupedDocuments = documents?.reduce((acc, doc) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = [];
    }
    acc[doc.documentType].push(doc);
    return acc;
  }, {}) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documents for {employee?.firstName} {employee?.lastName}</DialogTitle>
          <DialogDescription>
            View and verify documents uploaded by this employee.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading documents...
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10">
              No documents have been uploaded by this employee.
            </div>
          ) : (
            Object.entries(groupedDocuments).map(([type, docs]) => (
              <div key={type} className="space-y-3">
                <h3 className="font-semibold text-sm border-b pb-1">{type}</h3>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-md">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{doc.fileName}</p>
                            {doc.isVerified && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 pl-1 pr-2 py-0.5 text-[10px] h-5">
                                <ShieldCheck size={12} />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatBytes(doc.fileSize)} • Uploaded {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Fetched through the API client, not linked. The
                            files used to sit on a public static mount; they are
                            now behind the same grant as the document list, so a
                            plain <a href> would arrive without credentials. */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1.5"
                          onClick={() =>
                            openApiDocument(doc.url).catch((error) =>
                              toast.error(error.response?.data?.message || 'Could not open the document.')
                            )
                          }
                        >
                          <Download size={14} />
                          <span className="text-xs">View</span>
                        </Button>
                        
                        {canWrite && (
                          <Button
                            variant={doc.isVerified ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleVerifyToggle(doc.id, doc.isVerified)}
                            disabled={verifyMutation.isPending}
                            className={doc.isVerified ? "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" : "bg-green-600 hover:bg-green-700 text-white"}
                          >
                            {doc.isVerified ? 'Unverify' : 'Verify'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
