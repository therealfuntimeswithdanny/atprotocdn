import { useState } from "react";
import { Cloud, ArrowLeft } from "lucide-react";
import { UploadsHistory } from "@/components/UploadsHistory";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Uploads = () => {
  const [uploadsKey, setUploadsKey] = useState(0);
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
      uploadsKey={uploadsKey}
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
                <h2 className="text-2xl font-bold mb-1">Uploads</h2>
                <p className="text-muted-foreground text-sm">
                  All uploads from @{activeUser.handle}
                </p>
              </div>
            </div>
            <UploadsHistory key={uploadsKey} did={activeUser.did} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Uploads;
