import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Share2, ImageOff, Search, Filter, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { fetchUserUploads, resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { UploadFilters, UploadFiltersState, defaultFilters } from "./UploadFilters";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Upload {
  id: string;
  cid: string;
  uri: string;
  mimeType: string;
  createdAt: string;
  filename: string | null;
  sizeBytes: number;
}

interface UploadsHistoryProps {
  did: string;
}

export const UploadsHistory = ({ did }: UploadsHistoryProps) => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<UploadFiltersState>(defaultFilters);
  const [pdsUrl, setPdsUrl] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const resolvePds = async () => {
      const url = await resolvePdsUrl(did);
      setPdsUrl(url);
    };
    resolvePds();
  }, [did]);

  const loadUploads = async () => {
    setIsLoading(true);
    const data = await fetchUserUploads(did, {
      search: filters.search,
      dateRange: filters.dateRange,
      mimeType: filters.mimeType,
      sizeRange: filters.sizeRange,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
    setUploads(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (pdsUrl) {
      loadUploads();
    }
  }, [did, filters, pdsUrl]);

  const getBlobUrl = (cid: string) => {
    return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
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

  const hasActiveFilters = filters.search || filters.dateRange !== 'all' || filters.mimeType !== 'all' || filters.sizeRange !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search uploads..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(hasActiveFilters && "border-primary text-primary")}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={loadUploads}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="pb-4">
            <UploadFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {hasActiveFilters ? "No uploads match your filters" : "No uploads yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? "Try adjusting your filters" : "Upload an image or video to get started"}
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
                        src={getBlobUrl(upload.cid)}
                        alt={upload.filename || "Upload"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
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
