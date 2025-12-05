import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Loader2, User, ChevronDown, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initiateOAuthLogin, StoredAccount } from "@/lib/oauth";

interface AccountSwitcherProps {
  activeUser: StoredAccount | null;
  accounts: StoredAccount[];
  onSwitchAccount: (did: string) => void;
  onLogout: (did: string) => void;
}

export const AccountSwitcher = ({ activeUser, accounts, onSwitchAccount, onLogout }: AccountSwitcherProps) => {
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!handle) {
      toast({
        title: "Missing handle",
        description: "Please enter your handle",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await initiateOAuthLogin(handle);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (!activeUser) {
    return (
      <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in with ATProto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle">Handle or DID</Label>
              <Input
                id="handle"
                type="text"
                placeholder="your-handle.madebydanny.uk"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
            <Avatar className="w-8 h-8">
              {activeUser.avatar && <AvatarImage src={activeUser.avatar} alt={activeUser.handle} />}
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">@{activeUser.handle}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-background border border-border z-50">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.did}
              onClick={() => onSwitchAccount(account.did)}
              className="cursor-pointer flex items-center gap-3 py-2"
            >
              <Avatar className="w-8 h-8">
                {account.avatar && <AvatarImage src={account.avatar} alt={account.handle} />}
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">@{account.handle}</span>
              {account.did === activeUser.did && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DialogTrigger asChild>
            <DropdownMenuItem className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Add another account
            </DropdownMenuItem>
          </DialogTrigger>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onLogout(activeUser.did)} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out @{activeUser.handle}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add another account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handle-add">Handle or DID</Label>
            <Input
              id="handle-add"
              type="text"
              placeholder="your-handle.madebydanny.uk"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign in
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};