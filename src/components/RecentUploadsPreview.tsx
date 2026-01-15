import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const RecentUploadsPreview = () => {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [pdsUrls, setPdsUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  const displayCount = isMobile ? 4 : 8;

  useEffect(() => {
    const fetchRecentUploads = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('uploads')
          .select('id, blob_cid, mime_type, user_did, created_at, filename')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          setUploads(data);
          
          // Resolve PDS URLs for unique DIDs
          const uniqueDids = [...new Set(data.map(u => u.user_did))];
          const urlMap: Record<string, string> = {};
          
          await Promise.all(
            uniqueDids.map(async (did) => {
              urlMap[did] = await resolvePdsUrl(did);
            })
          );
          
          setPdsUrls(urlMap);
        }
      } catch (error) {
        console.error('Failed to fetch recent uploads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentUploads();
  }, []);

  const getBlobUrl = (upload: RecentUpload) => {
    const pdsUrl = pdsUrls[upload.user_did] || 'https://bsky.social';
    return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${upload.user_did}&cid=${upload.blob_cid}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Uploads</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: displayCount }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return null;
  }

  const displayedUploads = uploads.slice(0, displayCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Uploads</h3>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to="/uploads" className="flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {displayedUploads.map((upload) => {
          const isVideo = isVideoMimeType(upload.mime_type);
          const blobUrl = getBlobUrl(upload);
          
          return (
            <Link
              key={upload.id}
              to={`/i/${upload.id}`}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              {isVideo ? (
                <>
                  <video
                    src={blobUrl}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="bg-background/90 rounded-full p-2">
                      <Play className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={blobUrl}
                  alt={upload.filename || 'Upload'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs text-white truncate font-medium">
                    {upload.filename || 'Untitled'}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
