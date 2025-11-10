import { useCallback, useState } from "react";
import { Upload, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export const UploadZone = ({ onFileSelect, isUploading }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-all duration-300",
        "bg-gradient-to-br from-card to-muted/30",
        "hover:shadow-[var(--shadow-soft)]",
        isDragging 
          ? "border-primary bg-primary/5 shadow-[var(--shadow-medium)]" 
          : "border-border",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-16 px-8 cursor-pointer">
        <div className="relative mb-6">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-30 transition-opacity",
            isDragging && "opacity-50"
          )} />
          <div className="relative bg-gradient-to-br from-primary to-accent p-5 rounded-full">
            {isUploading ? (
              <Cloud className="w-12 h-12 text-primary-foreground animate-pulse" />
            ) : (
              <Upload className="w-12 h-12 text-primary-foreground" />
            )}
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isUploading ? "Uploading..." : "Drop your image here"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports JPG, PNG, GIF, WebP
        </p>

        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileInput}
          disabled={isUploading}
        />
      </label>
    </div>
  );
};
