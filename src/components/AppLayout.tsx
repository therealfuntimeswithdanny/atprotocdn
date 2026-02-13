import { useState, ReactNode } from "react";
import { Cloud, Upload, FolderOpen, Star, Info, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { UploadStats } from "@/components/UploadStats";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { StoredAccount } from "@/lib/oauth";

interface AppLayoutProps {
  children: ReactNode;
  activeUser: StoredAccount | null;
  accounts: StoredAccount[];
  onSwitchAccount: (did: string) => Promise<boolean>;
  onLogout: (did: string) => Promise<void>;
  uploadsKey?: number;
}

export const AppLayout = ({
  children,
  activeUser,
  accounts,
  onSwitchAccount,
  onLogout,
  uploadsKey = 0,
}: AppLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ 
    path, 
    icon: Icon, 
    label 
  }: { 
    path: string; 
    icon: typeof Upload; 
    label: string;
  }) => (
    <button
      onClick={() => {
        navigate(path);
        setMobileMenuOpen(false);
      }}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all",
        isActive(path) 
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
        <NavItem path="/" icon={Upload} label="Upload" />
        <NavItem path="/uploads" icon={FolderOpen} label="Uploads" />
        <NavItem path="/starred" icon={Star} label="Starred" />
        <NavItem path="/folders" icon={FolderOpen} label="Folders" />
        <NavItem path="/about" icon={Info} label="About" />
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
            onSwitchAccount={onSwitchAccount}
            onLogout={onLogout}
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
              onSwitchAccount={onSwitchAccount}
              onLogout={onLogout}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-auto">
        <div className="lg:hidden h-16" />
        {children}
      </main>
    </div>
  );
};
