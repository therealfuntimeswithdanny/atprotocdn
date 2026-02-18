import { useCallback, useState } from "react";
import { Plus, ImagePlus, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  isUploading: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

const isAcceptedFile = (file: File): boolean => {
  return [...ACCEPTED_TYPES.image, ...ACCEPTED_TYPES.video].includes(file.type);
};

export const BulkUploadZone = ({ onFilesSelect, isUploading, disabled }: BulkUploadZoneProps) => {
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
      const acceptedFiles = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
      if (acceptedFiles.length > 0) {
        onFilesSelect(acceptedFiles);
      }
    }
  }, [onFilesSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const acceptedFiles = Array.from(e.target.files).filter(isAcceptedFile);
      if (acceptedFiles.length > 0) {
        onFilesSelect(acceptedFiles);
      }
    }
    e.target.value = '';
  }, [onFilesSelect]);

  const isDisabled = isUploading || disabled;

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all duration-200",
        isDragging 
          ? "border-primary bg-sidebar-accent" 
          : "border-border hover:border-muted-foreground/40 bg-card",
        isDisabled && "opacity-50 pointer-events-none"
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-16 px-8 cursor-pointer">
        <div className={cn(
          "mb-4 p-4 rounded-full transition-colors",
          isDragging ? "bg-primary/10" : "bg-secondary"
        )}>
          <Plus className={cn(
            "w-10 h-10",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
        </div>

        <p className="text-sm text-foreground font-medium mb-1">
          {isUploading ? "Uploading..." : "Drop files here or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground">
          Images and videos up to any size
        </p>

        <input
          type="file"
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInput}
          disabled={isDisabled}
        />
      </label>
    </div>
  );
};
