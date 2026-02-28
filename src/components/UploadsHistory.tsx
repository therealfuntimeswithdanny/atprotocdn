import { useState, useEffect } from "react";
import { Check, ExternalLink, RefreshCw, Share2, ImageOff, Search, Filter, Play, Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { UploadFilters, UploadFiltersState, defaultFilters } from "./UploadFilters";
import { toggleStar, getStarredSubjectUris } from "@/lib/starring";
import { AddToFolderButton } from "@/components/AddToFolderButton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Upload {
  id: string;
  cid: string;
  uri: string;
  mimeType: string;
  createdAt: string;
  filename: string | null;
  sizeBytes: number;
  recordUri: string | null;
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
  const [starredUris, setStarredUris] = useState<Set<string>>(new Set());
  const [starringId, setStarringId] = useState<string | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
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

    const { data } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_did', did)
      .order('created_at', { ascending: false });

    const mapped = (data || []).map((upload) => ({
      id: upload.id,
      cid: upload.blob_cid,
      uri: '',
      mimeType: upload.mime_type,
      createdAt: upload.created_at,
      filename: upload.filename,
      sizeBytes: upload.size_bytes,
      recordUri: upload.record_uri,
    }));

    setUploads(mapped);

    const starred = await getStarredSubjectUris(did);
    setStarredUris(new Set(starred));

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

  const handleStar = async (upload: Upload) => {
    if (!upload.recordUri) {
      toast({ title: "Error", description: "No record URI available for this upload", variant: "destructive" });
      return;
    }
    setStarringId(upload.id);
    const result = await toggleStar(did, upload.recordUri);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setStarredUris(prev => {
        const newSet = new Set(prev);
        if (result.starred) {
          newSet.add(upload.recordUri!);
        } else {
          newSet.delete(upload.recordUri!);
        }
        return newSet;
      });
      toast({
        title: result.starred ? "Starred" : "Unstarred",
        description: result.starred ? "Added to starred" : "Removed from starred",
      });
    }
    setStarringId(null);
  };

  const hasActiveFilters = filters.search || filters.dateRange !== 'all' || filters.mimeType !== 'all' || filters.sizeRange !== 'all';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search uploads..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9 h-10 rounded-full bg-secondary border-0"
            />
          </div>
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className={cn("rounded-full", hasActiveFilters && "border-primary text-primary")}>
                <Filter className="w-4 h-4" />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <Button variant="ghost" size="icon" onClick={loadUploads} disabled={isLoading} className="rounded-full">
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl bg-secondary animate-pulse aspect-[4/3]" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ImageOff className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">{hasActiveFilters ? "No uploads match" : "No uploads yet"}</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? "Try adjusting your filters" : "Upload an image or video to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {uploads.map((upload) => {
              const isVideo = isVideoMimeType(upload.mimeType);
              const isStarred = upload.recordUri ? starredUris.has(upload.recordUri) : false;

              return (
                <div key={upload.id} className="group rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedUpload(upload)}
                    className="w-full text-left"
                  >
                    <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                      {isVideo ? (
                        <>
                          <video src={getBlobUrl(upload.cid)} className="w-full h-full object-cover" muted preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow">
                              <Play className="w-4 h-4 text-foreground ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={getProxiedImageUrl(upload.cid)}
                          alt={upload.filename || "Upload"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {isStarred && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Star className="w-3 h-3 text-primary-foreground fill-current" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {upload.filename || 'Untitled'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(upload.createdAt).toLocaleDateString()} · {formatBytes(upload.sizeBytes)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => handleCopy(upload.id, 'share')}>
                          {copiedId === `${upload.id}-share` ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        </Button>
                        {upload.recordUri && (
                          <Button
                            size="icon" variant="ghost"
                            className={cn("h-7 w-7 rounded-full", isStarred && "text-primary")}
                            onClick={() => handleStar(upload)}
                            disabled={starringId === upload.id}
                          >
                            <Star className={cn("w-3.5 h-3.5", isStarred && "fill-current")} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selectedUpload} onOpenChange={(open) => !open && setSelectedUpload(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedUpload && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{selectedUpload.filename || "Untitled"}</SheetTitle>
                <SheetDescription>
                  {new Date(selectedUpload.createdAt).toLocaleString()} · {formatBytes(selectedUpload.sizeBytes)}
                </SheetDescription>
              </SheetHeader>

              <div className="rounded-lg overflow-hidden border border-border bg-secondary">
                {isVideoMimeType(selectedUpload.mimeType) ? (
                  <video src={getBlobUrl(selectedUpload.cid)} controls className="w-full max-h-72 object-contain" />
                ) : (
                  <img
                    src={getProxiedImageUrl(selectedUpload.cid)}
                    alt={selectedUpload.filename || "Upload"}
                    className="w-full max-h-72 object-contain"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleCopy(selectedUpload.id, 'share')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share link
                </Button>
                <Button variant="outline" onClick={() => handleCopy(selectedUpload.id, 'blob')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Blob URL
                </Button>
                {selectedUpload.recordUri && (
                  <Button
                    variant="outline"
                    className={cn(starredUris.has(selectedUpload.recordUri) && "text-primary border-primary")}
                    onClick={() => handleStar(selectedUpload)}
                    disabled={starringId === selectedUpload.id}
                  >
                    <Star className={cn("w-4 h-4 mr-2", starredUris.has(selectedUpload.recordUri) && "fill-current")} />
                    {starredUris.has(selectedUpload.recordUri) ? "Unstar" : "Star"}
                  </Button>
                )}
                {selectedUpload.recordUri && (
                  <AddToFolderButton
                    did={did}
                    subjectUri={selectedUpload.recordUri}
                    variant="outline"
                    size="default"
                    className="w-full"
                  />
                )}
              </div>

              <Button asChild className="w-full">
                <Link to={`/i/${selectedUpload.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open full page
                </Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
