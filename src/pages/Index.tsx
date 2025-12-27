import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { BulkUploadZone } from "@/components/BulkUploadZone";
import { UploadPreview } from "@/components/UploadPreview";
import { UploadQueue, UploadQueueItem } from "@/components/UploadQueue";
import { UploadResult } from "@/components/UploadResult";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { UploadsHistory } from "@/components/UploadsHistory";
import { UploadStats } from "@/components/UploadStats";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { 
  handleOAuthCallback, 
  revokeOAuthSession, 
  restorePersistedSession, 
  uploadMultipleBlobsWithOAuth,
  getStoredAccounts,
  saveAccount,
  setActiveAccountDid,
  restoreSessionForDid,
  StoredAccount
} from "@/lib/oauth";

type UploadPhase = "idle" | "preview" | "uploading" | "complete";

const Index = () => {
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
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
      const storedAccounts = getStoredAccounts();
      setAccounts(storedAccounts);
      
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
        resetUploadState();
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
        resetUploadState();
      }
    }
    
    toast({
      title: "Logged out",
      description: "Account removed",
    });
  };

  const resetUploadState = () => {
    setUploadPhase("idle");
    setPendingFiles([]);
    setUploadQueue([]);
    setCompletedCount(0);
  };

  const handleFilesSelect = (files: File[]) => {
    setPendingFiles(files);
    setUploadPhase("preview");
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      resetUploadState();
    } else {
      setPendingFiles(newFiles);
    }
  };

  const handleCancelPreview = () => {
    resetUploadState();
  };

  const handleStartUpload = async () => {
    if (!activeUser || pendingFiles.length === 0) return;

    setUploadPhase("uploading");
    setCompletedCount(0);
    
    // Initialize queue
    const initialQueue: UploadQueueItem[] = pendingFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setUploadQueue(initialQueue);

    const { successCount, failedCount } = await uploadMultipleBlobsWithOAuth(
      activeUser.did,
      pendingFiles,
      (index, status, error) => {
        setUploadQueue(prev => {
          const newQueue = [...prev];
          newQueue[index] = {
            ...newQueue[index],
            status,
            progress: status === 'completed' ? 100 : status === 'uploading' ? 50 : 0,
            error,
          };
          return newQueue;
        });
        
        if (status === 'completed' || status === 'failed') {
          setCompletedCount(prev => prev + 1);
        }
      }
    );

    setUploadPhase("complete");
    setUploadsKey(prev => prev + 1);

    toast({
      title: "Upload complete",
      description: `${successCount} uploaded${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      variant: failedCount > 0 ? "destructive" : "default",
    });

    // Auto-reset after showing results
    setTimeout(() => {
      resetUploadState();
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <ThemeToggle />
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
              
              {uploadPhase === "idle" && (
                <BulkUploadZone 
                  onFilesSelect={handleFilesSelect} 
                  isUploading={false}
                />
              )}

              {uploadPhase === "preview" && (
                <UploadPreview
                  files={pendingFiles}
                  onUpload={handleStartUpload}
                  onCancel={handleCancelPreview}
                  onRemoveFile={handleRemoveFile}
                  isUploading={false}
                />
              )}

              {(uploadPhase === "uploading" || uploadPhase === "complete") && (
                <UploadQueue
                  items={uploadQueue}
                  completedCount={completedCount}
                  totalCount={pendingFiles.length}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">Sign in to upload images to your PDS</p>
            </div>
          )}
          
          {activeUser && (
            <>
              <UploadStats did={activeUser.did} refreshKey={uploadsKey} />
              <UploadsHistory key={uploadsKey} did={activeUser.did} />
            </>
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
