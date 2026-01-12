import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Share2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { fetchUserUploads, resolvePdsUrl } from "@/lib/oauth";
import { UploadFilters, UploadFiltersState, defaultFilters } from "./UploadFilters";

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

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Uploads</h2>
        <Button variant="ghost" size="sm" onClick={loadUploads}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="mb-4">
        <UploadFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading uploads...</div>
      ) : uploads.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 space-y-2">
          <ImageOff className="w-10 h-10 mx-auto opacity-50" />
          <p>
            {filters.search || filters.dateRange !== 'all' || filters.mimeType !== 'all' || filters.sizeRange !== 'all'
              ? "No uploads match your filters"
              : "No uploads yet. Upload an image to get started!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploads.map((upload) => (
            <div key={upload.id} className="group relative">
              <Link to={`/i/${upload.id}`}>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                  <img
                    src={getBlobUrl(upload.cid)}
                    alt={upload.filename || "Upload"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </Link>
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg pointer-events-none group-hover:pointer-events-auto">
                <Button
                  size="sm"
                  variant="secondary"
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
                  asChild
                >
                  <a href={getBlobUrl(upload.cid)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {upload.filename || new Date(upload.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};