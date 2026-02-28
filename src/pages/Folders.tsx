import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { FolderList } from "@/components/FolderList";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

const Folders = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
    >
      <div className="p-4 lg:p-8">
        {isRestoringSession ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Restoring session...</p>
            </div>
          </div>
        ) : !activeUser ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <FolderOpen className="w-16 h-16 text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-normal">Sign in to view folders</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Sign in with your BlueAT account to manage your folders
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
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Folders</h2>
            <FolderList did={activeUser.did} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Folders;
