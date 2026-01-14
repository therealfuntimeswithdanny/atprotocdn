import { useCallback, useState } from "react";
import { Upload, Cloud, Images, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  isUploading: boolean;
  disabled?: boolean;
}

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
      const imageFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        onFilesSelect(imageFiles);
      }
    }
  }, [onFilesSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const imageFiles = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        onFilesSelect(imageFiles);
      }
    }
    e.target.value = '';
  }, [onFilesSelect]);

  const isDisabled = isUploading || disabled;

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all duration-300",
        "bg-gradient-to-b from-muted/50 to-muted/20",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : "border-border hover:border-muted-foreground/50",
        isDisabled && "opacity-50 pointer-events-none"
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-20 px-8 cursor-pointer">
        <div className={cn(
          "relative mb-6 p-6 rounded-2xl transition-all duration-300",
          isDragging 
            ? "bg-primary scale-110" 
            : "bg-muted"
        )}>
          <ImagePlus className={cn(
            "w-10 h-10 transition-colors",
            isDragging ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        </div>

        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isUploading ? "Uploading..." : "Drop images here"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          or click to browse your files
        </p>
        
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            JPG
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            PNG
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            GIF
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            WebP
          </span>
        </div>

        <input
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          disabled={isDisabled}
        />
      </label>
    </div>
  );
};
