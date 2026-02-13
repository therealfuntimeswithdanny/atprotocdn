import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Share2, Star, StarOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { listStarRecords, toggleStar } from "@/lib/starring";
import { resolveRecordFromUri } from "@/lib/folders";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ResolvedStarredItem {
  subjectUri: string;
  cid: string;
  mimeType: string;
  did: string;
}

interface StarredUploadsProps {
  did: string;
  refreshKey?: number;
}

export const StarredUploads = ({ did, refreshKey = 0 }: StarredUploadsProps) => {
  const [items, setItems] = useState<ResolvedStarredItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdsUrl, setPdsUrl] = useState("");
  const [unstarringUri, setUnstarringUri] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    resolvePdsUrl(did).then(setPdsUrl);
  }, [did]);

  const loadStarred = async () => {
    setIsLoading(true);
    const stars = await listStarRecords(did);

    const resolved = await Promise.all(
      stars.map(async (star) => {
        const record = await resolveRecordFromUri(star.value.subject);
        if (!record) return null;
        return {
          subjectUri: star.value.subject,
          cid: record.cid,
          mimeType: record.mimeType,
          did: record.did,
        };
      })
    );

    setItems(resolved.filter(Boolean) as ResolvedStarredItem[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStarred();
  }, [did, refreshKey]);

  const getBlobUrl = (itemDid: string, cid: string) =>
    `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${itemDid}&cid=${cid}`;

  const getProxiedImageUrl = (itemDid: string, cid: string) => {
    const rawUrl = getBlobUrl(itemDid, cid);
    return `https://atimg.madebydanny.uk/?image=${encodeURIComponent(rawUrl)}`;
  };

  const handleCopy = async (item: ResolvedStarredItem) => {
    const url = getBlobUrl(item.did, item.cid);
    await navigator.clipboard.writeText(url);
    setCopiedId(item.subjectUri);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnstar = async (subjectUri: string) => {
    setUnstarringUri(subjectUri);
    const result = await toggleStar(did, subjectUri);
    if (!result.starred) {
      setItems(prev => prev.filter(i => i.subjectUri !== subjectUri));
      toast({ title: "Removed from starred" });
    } else if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setUnstarringUri(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} starred {items.length === 1 ? 'upload' : 'uploads'}
        </p>
        <Button variant="ghost" size="icon" onClick={loadStarred} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
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
          {items.map((item) => {
            const isVideo = isVideoMimeType(item.mimeType);
            return (
              <div key={item.subjectUri} className="group relative">
                <div className="aspect-square rounded-xl overflow-hidden bg-muted relative">
                  {isVideo ? (
                    <>
                      <video
                        src={getBlobUrl(item.did, item.cid)}
                        className="w-full h-full object-cover"
                        muted preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-foreground fill-foreground ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={getProxiedImageUrl(item.did, item.cid)}
                      alt="Starred upload"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 rounded-xl pointer-events-none group-hover:pointer-events-auto">
                  <Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => handleCopy(item)}>
                    {copiedId === item.subjectUri ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm" variant="secondary" className="h-9 w-9 p-0"
                    onClick={() => handleUnstar(item.subjectUri)}
                    disabled={unstarringUri === item.subjectUri}
                  >
                    <StarOff className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary" className="h-9 w-9 p-0" asChild>
                    <a href={getBlobUrl(item.did, item.cid)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
