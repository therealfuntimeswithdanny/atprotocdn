import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UploadData {
  id: string;
  user_did: string;
  blob_cid: string;
  mime_type: string;
  size_bytes: number;
  filename: string | null;
  created_at: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default function ImageView() {
  const { id } = useParams<{ id: string }>();
  const [upload, setUpload] = useState<UploadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUpload = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("uploads")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("Image not found");
          return;
        }

        setUpload(data);
      } catch (err) {
        console.error("Failed to fetch upload:", err);
        setError("Failed to load image");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpload();
  }, [id]);

  const imageUrl = upload
    ? `https://pds.madebydanny.uk/xrpc/com.atproto.sync.getBlob?did=${upload.user_did}&cid=${upload.blob_cid}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !upload) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Image not found"}</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <Card className="overflow-hidden bg-card/50 border-border/50">
          <div className="relative bg-muted/30">
            <img
              src={imageUrl}
              alt={upload.filename || "Uploaded image"}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {upload.filename && (
                <span>
                  <strong className="text-foreground">Name:</strong> {upload.filename}
                </span>
              )}
              <span>
                <strong className="text-foreground">Size:</strong> {formatBytes(upload.size_bytes)}
              </span>
              <span>
                <strong className="text-foreground">Type:</strong> {upload.mime_type}
              </span>
              <span>
                <strong className="text-foreground">Uploaded:</strong>{" "}
                {new Date(upload.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopy} variant="outline" size="sm">
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
