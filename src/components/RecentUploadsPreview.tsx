import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, ExternalLink } from "lucide-react";
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

interface RecentUploadsPreviewProps {
  userDid: string;
}

export const RecentUploadsPreview = ({ userDid }: RecentUploadsPreviewProps) => {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [pdsUrl, setPdsUrl] = useState<string>('https://bsky.social');
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  const displayCount = isMobile ? 5 : 10;

  useEffect(() => {
    const fetchRecentUploads = async () => {
      setIsLoading(true);
      try {
        // Resolve PDS URL for this user
        const resolvedPdsUrl = await resolvePdsUrl(userDid);
        setPdsUrl(resolvedPdsUrl);

        const { data, error } = await supabase
          .from('uploads')
          .select('id, blob_cid, mime_type, user_did, created_at, filename')
          .eq('user_did', userDid)
          .order('created_at', { ascending: false })
          .limit(displayCount);

        if (error) throw error;

        if (data) {
          setUploads(data);
        }
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

  const getShareUrl = (upload: RecentUpload) => {
    return `https://atprotocdn.lovable.app/i/${upload.id}`;
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {displayedUploads.map((upload) => {
          const isVideo = isVideoMimeType(upload.mime_type);
          const imageUrl = getProxiedImageUrl(upload);
          const rawUrl = getRawBlobUrl(upload);
          const shareUrl = getShareUrl(upload);
          
          return (
            <div
              key={upload.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              {isVideo ? (
                <>
                  <video
                    src={rawUrl}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="bg-background/90 rounded-full p-2">
                      <Play className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={imageUrl}
                  alt={upload.filename || 'Upload'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <p className="text-xs text-white truncate font-medium mb-2">
                  {upload.filename || 'Untitled'}
                </p>
                <div className="flex gap-1">
                  <Link
                    to={`/i/${upload.id}`}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs py-1.5 px-2 rounded-md text-center transition-colors"
                  >
                    Details
                  </Link>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-1.5 px-2 rounded-md flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
