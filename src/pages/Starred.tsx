import { useState, useEffect } from "react";
import { Cloud, Upload, FolderOpen, Star, Info, Menu } from "lucide-react";
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

const Starred = () => {
  const [activeUser, setActiveUser] = useState<StoredAccount | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
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
          title: "Signed in successfully",
          description: `Welcome, @${profile.handle}!`,
        });
        setIsRestoringSession(false);
        return;
      }

      const existingSession = await restorePersistedSession();
      if (existingSession) {
        const activeAccount = storedAccounts.find(a => a.did === existingSession.did);
        if (activeAccount) {
          setActiveUser(activeAccount);
        }
      }
      setIsRestoringSession(false);
    };

    initializeAuth();
  }, [toast]);

  const handleLogout = async () => {
    if (activeUser) {
      await revokeOAuthSession(activeUser.did);
      setActiveUser(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    }
  };

  const handleAccountSwitch = async (account: StoredAccount) => {
    const success = await restoreSessionForDid(account.did);
    if (success) {
      setActiveAccountDid(account.did);
      setActiveUser(account);
      toast({
        title: "Account switched",
        description: `Now using @${account.handle}`,
      });
    } else {
      toast({
        title: "Session expired",
        description: "Please sign in again with this account.",
        variant: "destructive",
      });
    }
  };

  const NavItem = ({ 
    active, 
    icon: Icon, 
    label, 
    onClick 
  }: { 
    active?: boolean; 
    icon: React.ElementType; 
    label: string;
    onClick?: () => void;
  }) => (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left",
        active 
          ? "bg-primary text-primary-foreground shadow-lg" 
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ATProto CDN</h1>
            <p className="text-xs text-muted-foreground">Decentralized Storage</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 py-4">
        <NavItem icon={Upload} label="Upload" onClick={() => navigate('/')} />
        <NavItem icon={FolderOpen} label="Uploads" onClick={() => navigate('/uploads')} />
        <NavItem active icon={Star} label="Starred" />
        <NavItem icon={Info} label="About" onClick={() => navigate('/about')} />
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <AccountSwitcher 
            activeUser={activeUser}
            accounts={accounts}
            onSwitchAccount={async (did) => {
              const account = accounts.find(a => a.did === did);
              if (account) await handleAccountSwitch(account);
            }}
            onLogout={async () => {
              if (activeUser) await handleLogout();
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-border flex-col bg-card/50 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">ATProto CDN</span>
          </div>
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
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Starred</h2>
            <p className="text-muted-foreground">Your favorite uploads</p>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No starred uploads yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Star your favorite uploads to quickly access them here. This feature is coming soon!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Starred;
