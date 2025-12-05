import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchUserUploads } from "@/lib/oauth";

interface Upload {
  cid: string;
  uri: string;
  mimeType: string;
  createdAt: string;
}

interface UploadsHistoryProps {
  did: string;
}

export const UploadsHistory = ({ did }: UploadsHistoryProps) => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

  const loadUploads = async () => {
    setIsLoading(true);
    const data = await fetchUserUploads(did);
    setUploads(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUploads();
  }, [did]);

  const getBlobUrl = (cid: string) => {
    return `https://pds.madebydanny.uk/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
  };

  const handleCopy = async (cid: string) => {
    const url = getBlobUrl(cid);
    await navigator.clipboard.writeText(url);
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Your Uploads</h2>
        <div className="text-center text-muted-foreground py-8">Loading uploads...</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Uploads</h2>
        <Button variant="ghost" size="sm" onClick={loadUploads}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      {uploads.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No uploads yet. Upload an image to get started!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploads.map((upload) => (
            <div key={upload.cid} className="group relative">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                <img
                  src={getBlobUrl(upload.cid)}
                  alt="Upload"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(upload.cid)}
                >
                  {copiedCid === upload.cid ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
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
                {new Date(upload.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};