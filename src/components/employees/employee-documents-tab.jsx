import { useState } from 'react';
import { useEmployeeDocuments, useUploadEmployeeDocument, useDeleteEmployeeDocument } from '@/hooks/use-employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Download, FileText, UploadCloud, Loader2, ShieldCheck } from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function EmployeeDocumentsTab({ employeeId }) {
  const { data: documents, isLoading } = useEmployeeDocuments(employeeId);
  const uploadMutation = useUploadEmployeeDocument(employeeId);
  const deleteMutation = useDeleteEmployeeDocument(employeeId);
  
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('Aadhar');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    await uploadMutation.mutateAsync(formData);
    setFile(null);
  };

  const handleDeleteClick = (docId) => {
    setDocumentToDelete(docId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <form onSubmit={handleUpload} className="p-4 border rounded-xl bg-muted/20 space-y-4">
        <h3 className="font-semibold text-sm">Upload New Document</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="Aadhar">Aadhar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="Resume">Resume</option>
              <option value="Offer Letter">Offer Letter</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input 
              type="file" 
              onChange={handleFileChange} 
              required
              className="h-9 cursor-pointer"
              accept=".pdf,.png,.jpg,.jpeg"
            />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={!file || uploadMutation.isPending}
          className="w-full"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4 mr-2" />
          )}
          Upload
        </Button>
      </form>

      {/* Documents List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Uploaded Documents</h3>
        
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading documents...
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="py-8 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{doc.documentType}</p>
                      {doc.isVerified && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 pl-1 pr-2 py-0.5 text-[10px] h-5">
                          <ShieldCheck size={12} />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.fileName} • {formatBytes(doc.fileSize)} • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    asChild
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Download">
                      <Download size={16} />
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClick(doc.id)}
                    title={doc.isVerified ? "Cannot delete verified document" : "Delete"}
                    disabled={deleteMutation.isPending || doc.isVerified}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
