import { useEffect, useState } from "react";
import { Image, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UploadStatsProps {
  did: string;
  refreshKey?: number;
  compact?: boolean;
}

interface Stats {
  totalUploads: number;
  totalSize: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export function UploadStats({ did, refreshKey, compact = false }: UploadStatsProps) {
  const [stats, setStats] = useState<Stats>({ totalUploads: 0, totalSize: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("uploads")
          .select("size_bytes")
          .eq("user_did", did);

        if (error) throw error;

        const totalUploads = data?.length || 0;
        const totalSize = data?.reduce((sum, upload) => sum + (upload.size_bytes || 0), 0) || 0;

        setStats({ totalUploads, totalSize });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [did, refreshKey]);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Image className="w-4 h-4" />
            <span>Uploads</span>
          </div>
          <span className="font-medium">{isLoading ? "—" : stats.totalUploads}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>Storage</span>
          </div>
          <span className="font-medium">{isLoading ? "—" : formatBytes(stats.totalSize)}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Image className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Uploads</p>
            <p className="text-xl font-semibold">{stats.totalUploads}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Storage Used</p>
            <p className="text-xl font-semibold">{formatBytes(stats.totalSize)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
