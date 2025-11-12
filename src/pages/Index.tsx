import { useState } from "react";
import { Cloud } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { UploadResult } from "@/components/UploadResult";
import { AuthButton } from "@/components/AuthButton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ATPROTO_DID = 'did:plc:l37td5yhxl2irrzrgvei4qay';

interface UploadResponse {
  success: boolean;
  blob?: {
    ref: {
      $link: string;
    };
  };
  uri?: string;
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
  const [user, setUser] = useState<{ handle: string; avatar?: string } | null>(null);
  const [userPassword, setUserPassword] = useState<string | null>(null);
  const [useUserPds, setUseUserPds] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (handle: string, password: string) => {
    setUser({ handle });
    setUserPassword(password);
    toast({
      title: "Logged in",
      description: `Logged in as @${handle}`,
    });
  };

  const handleLogout = () => {
    setUser(null);
    setUserPassword(null);
    setUseUserPds(false);
    toast({
      title: "Logged out",
      description: "You have been logged out",
    });
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useUserPds', useUserPds.toString());
      
      if (useUserPds && user && userPassword) {
        formData.append('userIdentifier', user.handle);
        formData.append('userPassword', userPassword);
      }

      const { data, error } = await supabase.functions.invoke<UploadResponse>('upload-to-atproto', {
        body: formData,
      });

      if (error) throw error;

      if (!data?.success || !data.blob || !data.uri) {
        throw new Error(data?.error || 'Upload failed');
      }

      const imageUrl = URL.createObjectURL(file);
      const did = useUserPds && user ? `did:plc:${user.handle}` : ATPROTO_DID;
      
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
          <AuthButton user={user} onLogin={handleLogin} onLogout={handleLogout} />
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
          <div className="flex items-center justify-center gap-3 mb-6">
            <Switch
              id="pds-toggle"
              checked={useUserPds}
              onCheckedChange={setUseUserPds}
              disabled={!user}
            />
            <Label htmlFor="pds-toggle" className="text-foreground">
              {useUserPds ? "Saving to your PDS" : "Saving to altq.net"}
            </Label>
          </div>
          
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
          <p>Powered by ATProto • Storing on altq.net</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
