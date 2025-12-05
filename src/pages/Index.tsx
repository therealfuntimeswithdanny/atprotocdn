import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { UploadResult } from "@/components/UploadResult";
import { AuthButton } from "@/components/AuthButton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { handleOAuthCallback, revokeOAuthSession, restorePersistedSession, uploadBlobWithOAuth } from "@/lib/oauth";

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
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (did: string): Promise<string | undefined> => {
    try {
      const profileResponse = await fetch(
        `https://pds.madebydanny.uk/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=app.bsky.actor.profile&rkey=self`
      );
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.value?.avatar?.ref?.$link) {
          return `https://pds.madebydanny.uk/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${profileData.value.avatar.ref.$link}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    return undefined;
  };

  // Handle OAuth callback and session restoration on page load
  useEffect(() => {
    const initializeAuth = async () => {
      // First check for OAuth callback
      const callbackResult = await handleOAuthCallback();
      if (callbackResult) {
        const avatar = await fetchUserProfile(callbackResult.did);
        setUser({
          handle: callbackResult.handle,
          did: callbackResult.did,
          avatar,
        });
        toast({
          title: "Login successful",
          description: `Logged in as @${callbackResult.handle}`,
        });
        setIsRestoringSession(false);
        return;
      }

      // Try to restore persisted session
      const restoredSession = await restorePersistedSession();
      if (restoredSession) {
        const avatar = await fetchUserProfile(restoredSession.did);
        // Try to get handle from profile or use DID
        let handle = restoredSession.did;
        try {
          const describeResponse = await fetch(
            `https://pds.madebydanny.uk/xrpc/com.atproto.repo.describeRepo?repo=${restoredSession.did}`
          );
          if (describeResponse.ok) {
            const describeData = await describeResponse.json();
            handle = describeData.handle || restoredSession.did;
          }
        } catch (error) {
          console.error('Failed to fetch handle:', error);
        }
        
        setUser({
          handle,
          did: restoredSession.did,
          avatar,
        });
      }
      
      setIsRestoringSession(false);
    };
    
    initializeAuth();
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
      let blobData: { ref: { $link: string } };
      let uri: string;
      let did: string;

      if (user) {
        // Use OAuth session for authenticated users (direct browser upload)
        const result = await uploadBlobWithOAuth(user.did, file);
        blobData = result.blob;
        uri = result.uri;
        did = user.did;
      } else {
        // Use edge function for anonymous uploads to altq.net
        const formData = new FormData();
        formData.append('file', file);
        formData.append('useUserPds', 'false');

        const { data, error } = await supabase.functions.invoke<UploadResponse>('upload-to-atproto', {
          body: formData,
        });

        if (error) throw error;

        if (!data?.success || !data.blob || !data.uri) {
          throw new Error(data?.error || 'Upload failed');
        }

        blobData = data.blob;
        uri = data.uri;
        did = data.did || ATPROTO_DID;
      }

      const imageUrl = URL.createObjectURL(file);
      
      setUploadResult({
        imageUrl,
        blobCid: blobData.ref.$link,
        recordUri: uri,
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
          {isRestoringSession ? (
            <div className="text-center text-sm text-muted-foreground">
              Restoring session...
            </div>
          ) : user ? (
            <div className="text-center text-sm text-muted-foreground">
              Saving to your PDS (@{user.handle})
            </div>
          ) : (
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
