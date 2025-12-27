import { Check, X, Loader2, FileImage } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface UploadQueueItem {
  file: File;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
}

interface UploadQueueProps {
  items: UploadQueueItem[];
  completedCount: number;
  totalCount: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const UploadQueue = ({ items, completedCount, totalCount }: UploadQueueProps) => {
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Upload Progress</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      <Progress value={overallProgress} className="mb-6 h-2" />

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              item.status === "completed" && "bg-primary/5 border-primary/20",
              item.status === "failed" && "bg-destructive/5 border-destructive/20",
              item.status === "uploading" && "bg-accent/5 border-accent/20",
              item.status === "pending" && "bg-muted/50 border-border"
            )}
          >
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
              {item.status === "completed" ? (
                <Check className="w-5 h-5 text-primary" />
              ) : item.status === "failed" ? (
                <X className="w-5 h-5 text-destructive" />
              ) : item.status === "uploading" ? (
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              ) : (
                <FileImage className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.file.size)}
                {item.error && (
                  <span className="text-destructive ml-2">{item.error}</span>
                )}
              </p>
            </div>

            <div className="text-xs text-muted-foreground w-12 text-right">
              {item.status === "completed" && "Done"}
              {item.status === "failed" && "Failed"}
              {item.status === "uploading" && `${Math.round(item.progress)}%`}
              {item.status === "pending" && "Waiting"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
