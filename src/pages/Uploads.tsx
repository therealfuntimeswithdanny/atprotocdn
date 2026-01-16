import { useState, useEffect } from "react";
import { Cloud, Upload, FolderOpen, Star, Info, Menu, ArrowLeft } from "lucide-react";
import { UploadsHistory } from "@/components/UploadsHistory";
import { UploadStats } from "@/components/UploadStats";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  handleOAuthCallback, 
  revokeOAuthSession, 
  restorePersistedSession, 
  getStoredAccounts,
  saveAccount,
  setActiveAccountDid,
  restoreSessionForDid,
  fetchUserProfile,
  StoredAccount
} from "@/lib/oauth";

type ActiveTab = "upload" | "history";

const Uploads = () => {
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
      }
    }
    
    toast({
      title: "Logged out",
      description: "Account removed",
    });
  };

  const NavItem = ({ tab, icon: Icon, label, onClick }: { tab?: ActiveTab; icon: typeof Upload; label: string; onClick?: () => void }) => (
    <button
      onClick={() => {
        if (onClick) onClick();
        setMobileMenuOpen(false);
      }}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
        tab === "history" 
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
        <NavItem tab="upload" icon={Upload} label="Upload" onClick={() => navigate('/')} />
        <NavItem tab="history" icon={FolderOpen} label="Uploads" />
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
        <div className="lg:hidden h-16" />
        
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
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
                <h2 className="text-2xl font-bold">Sign in to view uploads</h2>
                <p className="text-muted-foreground max-w-md">
                  Sign in with your ATProto account to view your upload history
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
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Upload History</h2>
                  <p className="text-muted-foreground text-sm">
                    All uploads from @{activeUser.handle}
                  </p>
                </div>
              </div>
              <UploadsHistory key={uploadsKey} did={activeUser.did} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Uploads;
