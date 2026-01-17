import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, Check, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StarButton } from "@/components/StarButton";
import { resolvePdsUrl, isVideoMimeType, getActiveAccountDid } from "@/lib/oauth";

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

export default function MediaView() {
  const { id } = useParams<{ id: string }>();
  const [upload, setUpload] = useState<UploadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdsUrl, setPdsUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
          setError("Media not found");
          return;
        }

        setUpload(data);
        
        // Resolve PDS URL for this user
        const resolvedPds = await resolvePdsUrl(data.user_did);
        setPdsUrl(resolvedPds);
      } catch (err) {
        console.error("Failed to fetch upload:", err);
        setError("Failed to load media");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpload();
  }, [id]);

  const rawMediaUrl = upload && pdsUrl
    ? `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${upload.user_did}&cid=${upload.blob_cid}`
    : "";

  const proxiedImageUrl = rawMediaUrl
    ? `https://atimg.madebydanny.uk/?image=${encodeURIComponent(rawMediaUrl)}`
    : "";

  const isVideo = upload ? isVideoMimeType(upload.mime_type) : false;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawMediaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !upload) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Media not found"}</p>
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
            {rawMediaUrl && (
              isVideo ? (
                <div className="relative group">
                  <video
                    ref={videoRef}
                    src={rawMediaUrl}
                    className="w-full h-auto max-h-[70vh] object-contain"
                    controls={false}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-9 w-9 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={togglePlay}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-9 w-9 p-0 bg-background/80 backdrop-blur-sm"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {!isPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={togglePlay}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-7 h-7 text-foreground fill-foreground ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={proxiedImageUrl}
                  alt={upload.filename || "Uploaded image"}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              )
            )}
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
              <Button onClick={handleCopy} variant="outline" size="sm" disabled={!rawMediaUrl}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              {rawMediaUrl && (
                <a href={rawMediaUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Original
                  </Button>
                </a>
              )}
              {getActiveAccountDid() && upload && (
                <StarButton 
                  did={getActiveAccountDid()!} 
                  uploadId={upload.id}
                  variant="outline"
                  size="sm"
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
