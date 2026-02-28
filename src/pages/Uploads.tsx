import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";
import { UploadsHistory } from "@/components/UploadsHistory";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { hasLegacyRecords, migrateLegacyRecords } from "@/lib/oauth";
import { useAuth } from "@/hooks/useAuth";

const Uploads = () => {
  const [uploadsKey, setUploadsKey] = useState(0);
  const [showMigrate, setShowMigrate] = useState(false);
  const [isCheckingLegacy, setIsCheckingLegacy] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();

  useEffect(() => {
    const checkLegacyRecords = async () => {
      if (!activeUser?.did) {
        setShowMigrate(false);
        return;
      }

      setIsCheckingLegacy(true);
      try {
        const hasLegacy = await hasLegacyRecords(activeUser.did);
        setShowMigrate(hasLegacy);
      } catch (error) {
        console.error('Failed to check for legacy records:', error);
      } finally {
        setIsCheckingLegacy(false);
      }
    };

    checkLegacyRecords();
  }, [activeUser?.did]);

  const handleMigrate = async () => {
    if (!activeUser?.did) return;

    setIsMigrating(true);
    try {
      const result = await migrateLegacyRecords(activeUser.did);

      if (!result.success) {
        toast({
          title: "Migration completed with issues",
          description: `Migrated ${result.migratedCount} records. ${result.errors[0] || ''}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Migration complete",
          description: `Migrated ${result.migratedCount} records to net.blueat.drive.*`,
        });
      }

      setShowMigrate(false);
      setUploadsKey((v) => v + 1);
    } catch (error) {
      toast({
        title: "Migration failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

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
                Sign in with your BlueAT account to view your upload history
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-medium text-foreground">My uploads</h2>
              {showMigrate && (
                <Button onClick={handleMigrate} disabled={isMigrating || isCheckingLegacy}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isMigrating ? 'animate-spin' : ''}`} />
                  {isMigrating ? 'Migrating records...' : 'Migrate UK.madebydanny.cdn.* records'}
                </Button>
              )}
            </div>
            <UploadsHistory key={uploadsKey} did={activeUser.did} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Uploads;
