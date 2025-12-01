import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { UploadResult } from "@/components/UploadResult";
import { AuthButton } from "@/components/AuthButton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleOAuthCallback, revokeOAuthSession, getAccessToken } from "@/lib/oauth";

const ATPROTO_DID = 'did:plc:l37td5yhxl2irrzrgvei4qay';

interface UploadResponse {
  success: boolean;
  blob?: {
    ref: {
      $link: string;
    };
  };
  uri?: string;
  did?: string;
  error?: string;
}

const Index = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    imageUrl: string;
    blobCid: string;
    recordUri: string;
    did: string;
  } | null>(null);
  const [user, setUser] = useState<{ handle: string; did: string; avatar?: string } | null>(null);
  const { toast } = useToast();

  // Handle OAuth callback on page load
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const result = await handleOAuthCallback();
      if (result) {
        setUser({
          handle: result.handle,
          did: result.did,
        });
        toast({
          title: "Login successful",
          description: `Logged in as @${result.handle}`,
        });
      }
    };
    
    checkOAuthCallback();
  }, [toast]);

  const handleLogout = async () => {
    if (user) {
      await revokeOAuthSession(user.did);
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out",
      });
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // If logged in, use user's PDS with OAuth token; otherwise use altq.net
      const useUserPds = !!user;
      formData.append('useUserPds', useUserPds.toString());
      
      if (useUserPds && user) {
        const accessToken = await getAccessToken(user.did);
        if (!accessToken) {
          throw new Error('Failed to get access token');
        }
        formData.append('accessToken', accessToken);
        formData.append('userDid', user.did);
      }

      const { data, error } = await supabase.functions.invoke<UploadResponse>('upload-to-atproto', {
        body: formData,
      });

      if (error) throw error;

      if (!data?.success || !data.blob || !data.uri) {
        throw new Error(data?.error || 'Upload failed');
      }

      const imageUrl = URL.createObjectURL(file);
      const did = data.did || ATPROTO_DID;
      
      setUploadResult({
        imageUrl,
        blobCid: data.blob.ref.$link,
        recordUri: data.uri,
        did,
      });

      toast({
        title: "Upload successful",
        description: "Your image has been uploaded to ATProto CDN",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="absolute top-4 right-4">
          <AuthButton user={user} onLogout={handleLogout} />
        </div>
        
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-30" />
              <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-2xl">
                <Cloud className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ATProto CDN
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload images to your ATProto account and get permanent, decentralized storage
          </p>
        </header>

        <main className="space-y-8">
          {user && (
            <div className="text-center text-sm text-muted-foreground">
              Saving to your PDS (@{user.handle})
            </div>
          )}
          {!user && (
            <div className="text-center text-sm text-muted-foreground">
              Saving to altq.net (login to save to your PDS)
            </div>
          )}
          
          <UploadZone onFileSelect={handleFileSelect} isUploading={isUploading} />
          
          {uploadResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UploadResult
                imageUrl={uploadResult.imageUrl}
                blobCid={uploadResult.blobCid}
                recordUri={uploadResult.recordUri}
                did={uploadResult.did}
              />
            </div>
          )}
        </main>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by ATProto • {user ? `Storing on ${user.handle}'s PDS` : 'Storing on altq.net'}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
