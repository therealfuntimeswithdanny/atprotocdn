import { useState } from "react";
import { Cloud } from "lucide-react";
import { UploadsHistory } from "@/components/UploadsHistory";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";

const Uploads = () => {
  const [uploadsKey, setUploadsKey] = useState(0);
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
      uploadsKey={uploadsKey}
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
            <Cloud className="w-16 h-16 text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-normal">Sign in to view uploads</h2>
              <p className="text-sm text-muted-foreground max-w-md">
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
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">My uploads</h2>
            <UploadsHistory key={uploadsKey} did={activeUser.did} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Uploads;
