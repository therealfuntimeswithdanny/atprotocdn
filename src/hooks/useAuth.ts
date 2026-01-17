import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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

export const useAuth = () => {
  const [activeUser, setActiveUser] = useState<StoredAccount | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
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
        toast({
          title: "Switched account",
          description: `Now using @${account.handle}`,
        });
        return true;
      }
    } else {
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
      });
      setAccounts(getStoredAccounts());
    }
    return false;
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

  return {
    activeUser,
    accounts,
    isRestoringSession,
    handleSwitchAccount,
    handleLogout,
  };
};
