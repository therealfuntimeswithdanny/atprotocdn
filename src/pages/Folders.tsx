import { useState } from "react";
import { FolderOpen, ArrowLeft } from "lucide-react";
import { FolderList } from "@/components/FolderList";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Folders = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
    >
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
              <FolderOpen className="w-16 h-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Sign in to view folders</h2>
              <p className="text-muted-foreground max-w-md">
                Sign in with your ATProto account to manage your folders
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
                <h2 className="text-2xl font-bold mb-1">Folders</h2>
                <p className="text-muted-foreground text-sm">
                  Organize your uploads into folders
                </p>
              </div>
            </div>
            <FolderList did={activeUser.did} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Folders;
