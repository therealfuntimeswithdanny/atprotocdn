import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Share2, Star, StarOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { fetchStarredUploads, toggleStar } from "@/lib/starring";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StarredUpload {
  id: string;
  cid: string;
  mimeType: string;
  createdAt: string;
  filename: string | null;
  sizeBytes: number;
  starredAt: string;
}

interface StarredUploadsProps {
  did: string;
  refreshKey?: number;
}

export const StarredUploads = ({ did, refreshKey = 0 }: StarredUploadsProps) => {
  const [uploads, setUploads] = useState<StarredUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdsUrl, setPdsUrl] = useState<string>("");
  const [unstarringId, setUnstarringId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const resolvePds = async () => {
      const url = await resolvePdsUrl(did);
      setPdsUrl(url);
    };
    resolvePds();
  }, [did]);

  const loadUploads = async () => {
    setIsLoading(true);
    const data = await fetchStarredUploads(did);
    setUploads(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (pdsUrl) {
      loadUploads();
    }
  }, [did, pdsUrl, refreshKey]);

  const getBlobUrl = (cid: string) => {
    return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
  };

  const getProxiedImageUrl = (cid: string) => {
    const rawUrl = getBlobUrl(cid);
    return `https://atimg.madebydanny.uk/?image=${encodeURIComponent(rawUrl)}`;
  };

  const getShareUrl = (id: string) => {
    return `${window.location.origin}/i/${id}`;
  };

  const handleCopy = async (id: string, type: 'blob' | 'share') => {
    const upload = uploads.find(u => u.id === id);
    if (!upload) return;
    
    const url = type === 'blob' ? getBlobUrl(upload.cid) : getShareUrl(id);
    await navigator.clipboard.writeText(url);
    setCopiedId(`${id}-${type}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnstar = async (uploadId: string) => {
    setUnstarringId(uploadId);
    const result = await toggleStar(did, uploadId);
    
    if (!result.starred) {
      setUploads(prev => prev.filter(u => u.id !== uploadId));
      toast({
        title: "Removed from starred",
        description: "Upload has been unstarred",
      });
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    setUnstarringId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {uploads.length} starred {uploads.length === 1 ? 'upload' : 'uploads'}
        </p>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadUploads}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No starred uploads yet</p>
            <p className="text-sm text-muted-foreground">
              Star your favorite uploads to quickly access them here
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {uploads.map((upload) => {
            const isVideo = isVideoMimeType(upload.mimeType);
            
            return (
              <div key={upload.id} className="group relative">
                <Link to={`/i/${upload.id}`}>
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted relative">
                    {isVideo ? (
                      <>
                        <video
                          src={getBlobUrl(upload.cid)}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-5 h-5 text-foreground fill-foreground ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={getProxiedImageUrl(upload.cid)}
                        alt={upload.filename || "Upload"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    {/* Star indicator */}
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 rounded-xl pointer-events-none group-hover:pointer-events-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 p-0"
                    onClick={() => handleCopy(upload.id, 'blob')}
                  >
                    {copiedId === `${upload.id}-blob` ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 p-0"
                    onClick={() => handleCopy(upload.id, 'share')}
                  >
                    {copiedId === `${upload.id}-share` ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 p-0"
                    onClick={() => handleUnstar(upload.id)}
                    disabled={unstarringId === upload.id}
                  >
                    <StarOff className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 p-0"
                    asChild
                  >
                    <a href={getBlobUrl(upload.cid)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground truncate">
                  {upload.filename || new Date(upload.createdAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
