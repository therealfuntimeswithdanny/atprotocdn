import { useState, useEffect } from "react";
import { Cloud, Upload, FolderOpen, Star, Info, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BulkUploadZone } from "@/components/BulkUploadZone";
import { UploadPreview } from "@/components/UploadPreview";
import { UploadQueue, UploadQueueItem } from "@/components/UploadQueue";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { RecentUploadsPreview } from "@/components/RecentUploadsPreview";
import { UploadStats } from "@/components/UploadStats";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  handleOAuthCallback, 
  revokeOAuthSession, 
  restorePersistedSession, 
  uploadMultipleBlobsWithOAuth,
  getStoredAccounts,
  saveAccount,
  setActiveAccountDid,
  restoreSessionForDid,
  fetchUserProfile,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

    setTimeout(() => {
      resetUploadState();
    }, 3000);
  };

  const NavItem = ({ active, icon: Icon, label, onClick }: { active?: boolean; icon: typeof Upload; label: string; onClick?: () => void }) => (
    <button
      onClick={() => {
        if (onClick) onClick();
        setMobileMenuOpen(false);
      }}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-2 rounded-xl">
            <Cloud className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ATProto CDN</h1>
            <p className="text-xs text-muted-foreground">Decentralized Storage</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        <NavItem active icon={Upload} label="Upload" />
        <NavItem icon={FolderOpen} label="Uploads" onClick={() => navigate('/uploads')} />
        <NavItem icon={Star} label="Starred" onClick={() => navigate('/starred')} />
        <NavItem icon={Info} label="About" onClick={() => navigate('/about')} />
      </nav>
      
      {activeUser && (
        <div className="p-4 border-t border-border">
          <UploadStats did={activeUser.did} refreshKey={uploadsKey} compact />
        </div>
      )}
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <AccountSwitcher 
            activeUser={activeUser}
            accounts={accounts}
            onSwitchAccount={handleSwitchAccount}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-border flex-col bg-card/50 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-1.5 rounded-lg">
                <Cloud className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">ATProto CDN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountSwitcher 
              activeUser={activeUser}
              accounts={accounts}
              onSwitchAccount={handleSwitchAccount}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-auto">
        <div className="lg:hidden h-16" /> {/* Spacer for mobile header */}
        
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
          {isRestoringSession ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-muted-foreground">Restoring session...</p>
              </div>
            </div>
          ) : !activeUser ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-full">
                <Cloud className="w-16 h-16 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Welcome to ATProto CDN</h2>
                <p className="text-muted-foreground max-w-md">
                  Sign in with your ATProto account to upload images to your Personal Data Server
                </p>
              </div>
              <AccountSwitcher 
                activeUser={activeUser}
                accounts={accounts}
                onSwitchAccount={handleSwitchAccount}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Upload Files</h2>
                <p className="text-muted-foreground text-sm">
                  Upload to @{activeUser.handle}'s PDS
                </p>
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

              {uploadPhase === "idle" && (
                <div className="mt-8">
                  <RecentUploadsPreview userDid={activeUser.did} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
