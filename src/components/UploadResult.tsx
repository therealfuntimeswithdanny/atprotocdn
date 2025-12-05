import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadResultProps {
  imageUrl: string;
  blobCid: string;
  recordUri: string;
  did: string;
}

export const UploadResult = ({ imageUrl, blobCid, recordUri, did }: UploadResultProps) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const blobUrl = `https://pds.madebydanny.uk/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${blobCid}`;

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden shadow-[var(--shadow-medium)] bg-gradient-to-br from-card to-muted/20">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Upload Successful</h3>
        
        <div className="mb-6 rounded-lg overflow-hidden bg-muted/50 p-4">
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            className="max-w-full max-h-64 mx-auto rounded-md shadow-sm"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Image URL
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all text-foreground">
                {blobUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(blobUrl, setCopiedUrl)}
                className="shrink-0"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-accent" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <a 
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              View Image
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
};
