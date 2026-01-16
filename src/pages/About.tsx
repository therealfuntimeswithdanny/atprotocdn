import { useState, useEffect } from "react";
import { Cloud, Upload, FolderOpen, Star, Info, Menu, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const About = () => {
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
        <NavItem icon={Star} label="Starred" onClick={() => navigate('/starred')} />
        <NavItem active icon={Info} label="About" />
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
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">About</h2>
            <p className="text-muted-foreground">Learn more about ATProto CDN</p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What is ATProto CDN?</h3>
              <p className="text-muted-foreground leading-relaxed">
                ATProto CDN is a decentralized content delivery network built on the AT Protocol. 
                It allows you to upload and share images and videos using your Bluesky account, 
                with files stored directly on your Personal Data Server (PDS).
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">How it works</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Sign in with your Bluesky account using OAuth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Upload images and videos directly to your PDS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Get shareable links for your uploads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your data stays on your own server, fully under your control</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <h4 className="font-medium mb-1">Bulk Upload</h4>
                  <p className="text-sm text-muted-foreground">Upload multiple files at once</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <h4 className="font-medium mb-1">Multi-Account</h4>
                  <p className="text-sm text-muted-foreground">Switch between multiple accounts</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <h4 className="font-medium mb-1">Image Proxy</h4>
                  <p className="text-sm text-muted-foreground">Optimized image delivery</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <h4 className="font-medium mb-1">Shareable Links</h4>
                  <p className="text-sm text-muted-foreground">Easy sharing with permanent URLs</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <a 
                href="https://atproto.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Learn more about AT Protocol
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default About;
