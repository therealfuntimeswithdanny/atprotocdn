import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, MoreVertical, ExternalLink, Copy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecentUpload {
  id: string;
  blob_cid: string;
  mime_type: string;
  user_did: string;
  created_at: string;
  filename: string | null;
}

interface RecentUploadsPreviewProps {
  userDid: string;
}

export const RecentUploadsPreview = ({ userDid }: RecentUploadsPreviewProps) => {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [pdsUrl, setPdsUrl] = useState<string>('https://bsky.social');
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  const displayCount = isMobile ? 4 : 8;

  useEffect(() => {
    const fetchRecentUploads = async () => {
      setIsLoading(true);
      try {
        const resolvedPdsUrl = await resolvePdsUrl(userDid);
        setPdsUrl(resolvedPdsUrl);

        const { data, error } = await supabase
          .from('uploads')
          .select('id, blob_cid, mime_type, user_did, created_at, filename')
          .eq('user_did', userDid)
          .order('created_at', { ascending: false })
          .limit(displayCount);

        if (error) throw error;
        if (data) setUploads(data);
      } catch (error) {
        console.error('Failed to fetch recent uploads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentUploads();
  }, [userDid, displayCount]);

  const getRawBlobUrl = (upload: RecentUpload) => {
    return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${upload.user_did}&cid=${upload.blob_cid}`;
  };

  const getProxiedImageUrl = (upload: RecentUpload) => {
    const rawUrl = getRawBlobUrl(upload);
    return `https://atimg.madebydanny.uk/?image=${encodeURIComponent(rawUrl)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Suggested</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: displayCount }).map((_, i) => (
            <div key={i} className="rounded-xl bg-secondary animate-pulse aspect-[4/3]" />
          ))}
        </div>
      </div>
    );
  }

  if (uploads.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Recent uploads</h3>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary text-sm -mr-2">
          <Link to="/uploads" className="flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {uploads.slice(0, displayCount).map((upload) => {
          const isVideo = isVideoMimeType(upload.mime_type);
          
          return (
            <div key={upload.id} className="group">
              <Link to={`/i/${upload.id}`} className="block">
                <div className="rounded-xl overflow-hidden bg-secondary border border-border hover:shadow-md transition-shadow aspect-[4/3] relative">
                  {isVideo ? (
                    <>
                      <video src={getRawBlobUrl(upload)} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow">
                          <Play className="w-4 h-4 text-foreground ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={getProxiedImageUrl(upload)}
                      alt={upload.filename || "Upload"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              </Link>
              <div className="mt-2 flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate font-medium">
                    {upload.filename || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(upload.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
