import { useState, useEffect } from "react";
import { X, Upload, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilePreview {
  file: File;
  preview: string;
  dimensions: { width: number; height: number } | null;
}

interface UploadPreviewProps {
  files: File[];
  onUpload: () => void;
  onCancel: () => void;
  onRemoveFile: (index: number) => void;
  isUploading: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const UploadPreview = ({ files, onUpload, onCancel, onRemoveFile, isUploading }: UploadPreviewProps) => {
  const [previews, setPreviews] = useState<FilePreview[]>([]);

  useEffect(() => {
    const loadPreviews = async () => {
      const newPreviews: FilePreview[] = await Promise.all(
        files.map(async (file) => {
          const preview = URL.createObjectURL(file);
          
          // Get image dimensions
          const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve(null);
            img.src = preview;
          });

          return { file, preview, dimensions };
        })
      );
      setPreviews(newPreviews);
    };

    loadPreviews();

    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [files]);

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Preview ({files.length} {files.length === 1 ? "file" : "files"})
        </h3>
        <span className="text-sm text-muted-foreground">
          Total: {formatFileSize(totalSize)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {previews.map((preview, index) => (
          <div
            key={index}
            className="group relative bg-muted rounded-lg overflow-hidden border border-border"
          >
            <div className="aspect-square">
              <img
                src={preview.preview}
                alt={preview.file.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {!isUploading && (
              <button
                onClick={() => onRemoveFile(index)}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-2">
              <p className="text-xs font-medium truncate">{preview.file.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(preview.file.size)}</span>
                {preview.dimensions && (
                  <span>
                    {preview.dimensions.width}×{preview.dimensions.height}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={onUpload} disabled={isUploading}>
          {isUploading ? (
            <>
              <FileImage className="w-4 h-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {files.length > 1 ? "All" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
