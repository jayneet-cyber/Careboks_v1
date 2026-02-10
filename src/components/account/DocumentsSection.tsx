/**
 * @fileoverview Documents Management Section
 * 
 * Handles user document uploads and management. Supports:
 * - PDF and TXT file uploads
 * - File listing with metadata (size, upload date)
 * - Download and delete functionality
 * - Backend local file storage integration
 * 
 * @module components/account/DocumentsSection
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestBackendAuthed } from "@/integrations/auth/backendApi";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, Trash2, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/** Allowed file types for upload */
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain'];

/**
 * Document metadata structure
 */
interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

type DocumentDownload = {
  id: string;
  file_name: string;
  file_type: string;
  file_data_base64: string;
};

/**
 * Documents management component
 * 
 * Provides interface for uploading, viewing, and managing
 * user documents stored via backend APIs.
 * 
 * @example
 * ```tsx
 * <DocumentsSection />
 * ```
 */
const DocumentsSection = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const convertFileToBase64DataUrl = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Could not read file"));
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  const decodeBase64ToBlob = (base64: string, mimeType: string) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType || "application/octet-stream" });
  };

  /**
   * Fetches documents from database for current user
   */
  const loadDocuments = async () => {
    try {
      const data = await requestBackendAuthed<Document[]>("/account/documents");
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles file upload to storage and database
   * @param event - File input change event
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and TXT files are allowed",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileData = await convertFileToBase64DataUrl(file);
      await requestBackendAuthed<Document>("/account/documents", {
        method: "POST",
        body: {
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_data: fileData,
          file_size: file.size
        }
      });

      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });

      loadDocuments();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  /**
   * Deletes a document from storage and database
   * @param doc - Document to delete
   */
  const handleDelete = async (doc: Document) => {
    try {
      await requestBackendAuthed<{ message: string }>(`/account/documents/${doc.id}`, {
        method: "DELETE"
      });

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });

      loadDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  /**
   * Downloads a document from storage
   * @param doc - Document to download
   */
  const handleDownload = async (doc: Document) => {
    try {
      const data = await requestBackendAuthed<DocumentDownload>(`/account/documents/${doc.id}/download`);
      const fileBlob = decodeBase64ToBlob(data.file_data_base64, data.file_type);
      const downloadName = data.file_name;

      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  /**
   * Formats file size in human-readable format
   * @param bytes - File size in bytes
   * @returns Formatted size string
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
        <CardDescription>
          Upload and manage your PDF and TXT documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => document.getElementById('document-upload')?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
          <input
            id="document-upload"
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, TXT
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsSection;
