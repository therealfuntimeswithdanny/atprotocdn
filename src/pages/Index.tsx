import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { UploadResult } from "@/components/UploadResult";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { UploadsHistory } from "@/components/UploadsHistory";
import { useToast } from "@/hooks/use-toast";
import { 
  handleOAuthCallback, 
  revokeOAuthSession, 
  restorePersistedSession, 
  uploadBlobWithOAuth,
  getStoredAccounts,
  saveAccount,
  setActiveAccountDid,
  restoreSessionForDid,
  StoredAccount
} from "@/lib/oauth";

const Index = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    imageUrl: string;
    blobCid: string;
    recordUri: string;
    did: string;
  } | null>(null);
  const [activeUser, setActiveUser] = useState<StoredAccount | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [uploadsKey, setUploadsKey] = useState(0);
  const { toast } = useToast();

  const fetchUserProfile = async (did: string): Promise<{ handle: string; avatar?: string }> => {
    let handle = did;
    let avatar: string | undefined;
    
    try {
      const describeResponse = await fetch(
        `https://pds.madebydanny.uk/xrpc/com.atproto.repo.describeRepo?repo=${did}`
      );
      if (describeResponse.ok) {
        const describeData = await describeResponse.json();
        handle = describeData.handle || did;
      }
    } catch (error) {
      console.error('Failed to fetch handle:', error);
    }
    
    try {
      const profileResponse = await fetch(
        `https://pds.madebydanny.uk/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=app.bsky.actor.profile&rkey=self`
      );
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.value?.avatar?.ref?.$link) {
          avatar = `https://pds.madebydanny.uk/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${profileData.value.avatar.ref.$link}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    
    return { handle, avatar };
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Load stored accounts
      const storedAccounts = getStoredAccounts();
      setAccounts(storedAccounts);
      
      // Check for OAuth callback
      const callbackResult = await handleOAuthCallback();
      if (callbackResult) {
        const profile = await fetchUserProfile(callbackResult.did);
        const account: StoredAccount = {
          did: callbackResult.did,
          handle: profile.handle,
          avatar: profile.avatar,
        };
        saveAccount(account);
        setActiveUser(account);
        setAccounts(getStoredAccounts());
        toast({
          title: "Login successful",
          description: `Logged in as @${profile.handle}`,
        });
        setIsRestoringSession(false);
        return;
      }

      // Restore persisted session
      const restoredSession = await restorePersistedSession();
      if (restoredSession) {
        const profile = await fetchUserProfile(restoredSession.did);
        const account: StoredAccount = {
          did: restoredSession.did,
          handle: profile.handle,
          avatar: profile.avatar,
        };
        saveAccount(account);
        setActiveUser(account);
        setAccounts(getStoredAccounts());
      }
      
      setIsRestoringSession(false);
    };
    
    initializeAuth();
  }, [toast]);

  const handleSwitchAccount = async (did: string) => {
    const session = await restoreSessionForDid(did);
    if (session) {
      setActiveAccountDid(did);
      const storedAccounts = getStoredAccounts();
      const account = storedAccounts.find(a => a.did === did);
      if (account) {
        setActiveUser(account);
        setUploadResult(null);
        setUploadsKey(prev => prev + 1);
        toast({
          title: "Switched account",
          description: `Now using @${account.handle}`,
        });
      }
    } else {
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
      });
      setAccounts(getStoredAccounts());
    }
  };

  const handleLogout = async (did: string) => {
    await revokeOAuthSession(did);
    const remainingAccounts = getStoredAccounts();
    setAccounts(remainingAccounts);
    
    if (activeUser?.did === did) {
      if (remainingAccounts.length > 0) {
        await handleSwitchAccount(remainingAccounts[0].did);
      } else {
        setActiveUser(null);
        setUploadResult(null);
      }
    }
    
    toast({
      title: "Logged out",
      description: "Account removed",
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!activeUser) return;
    
    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadBlobWithOAuth(activeUser.did, file);
      const imageUrl = URL.createObjectURL(file);
      
      setUploadResult({
        imageUrl,
        blobCid: result.blob.ref.$link,
        recordUri: result.uri,
        did: activeUser.did,
      });
      
      setUploadsKey(prev => prev + 1);

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
          <AccountSwitcher 
            activeUser={activeUser}
            accounts={accounts}
            onSwitchAccount={handleSwitchAccount}
            onLogout={handleLogout}
          />
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
          ) : activeUser ? (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Saving to your PDS (@{activeUser.handle})
              </div>
              <UploadZone onFileSelect={handleFileSelect} isUploading={isUploading} />
            </>
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">Sign in to upload images to your PDS</p>
            </div>
          )}
          
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
          
          {activeUser && (
            <UploadsHistory key={uploadsKey} did={activeUser.did} />
          )}
        </main>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by ATProto</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
