import { useState, ReactNode } from "react";
import { Upload, FolderOpen, Star, Info, Menu, Search, Plus, HardDrive } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { UploadStats } from "@/components/UploadStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        "flex items-center gap-3 w-full px-6 py-2 text-sm font-medium transition-colors rounded-full",
        isActive(path) 
          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
          : "text-sidebar-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {label}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 px-2 mb-4">
          <HardDrive className="w-8 h-8 text-primary" />
          <span className="text-[22px] font-normal text-foreground">BlueAT Drive</span>
        </div>

        {activeUser && (
          <Button
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
            className="w-full justify-start gap-3 rounded-2xl h-14 shadow-md bg-card text-foreground border border-border hover:shadow-lg hover:bg-card mb-2"
            variant="outline"
          >
            <Plus className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">New upload</span>
          </Button>
        )}
      </div>
      
      <nav className="flex-1 px-3 space-y-0.5">
        <NavItem path="/" icon={Upload} label="Home" />
        <NavItem path="/uploads" icon={FolderOpen} label="My uploads" />
        <NavItem path="/starred" icon={Star} label="Starred" />
        <NavItem path="/folders" icon={FolderOpen} label="Folders" />
        <NavItem path="/about" icon={Info} label="About" />
      </nav>
      
      {activeUser && (
        <div className="px-5 py-4 border-t border-sidebar-border">
          <UploadStats did={activeUser.did} refreshKey={uploadsKey} compact />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="flex items-center gap-2 px-4 h-16">
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>

            <div className="lg:hidden flex items-center gap-2 mr-2">
              <HardDrive className="w-6 h-6 text-primary" />
              <span className="font-normal text-lg text-foreground">BlueAT Drive</span>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-3xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search in BlueAT Drive"
                  className="pl-11 h-12 rounded-full bg-secondary border-0 focus-visible:bg-card focus-visible:shadow-md focus-visible:ring-1 focus-visible:ring-border text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 ml-2">
              <ThemeToggle />
              <AccountSwitcher 
                activeUser={activeUser}
                accounts={accounts}
                onSwitchAccount={onSwitchAccount}
                onLogout={onLogout}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
