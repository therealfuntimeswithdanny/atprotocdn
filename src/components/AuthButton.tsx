import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initiateOAuthLogin } from "@/lib/oauth";

interface AuthButtonProps {
  user: { handle: string; did: string; avatar?: string } | null;
  onLogout: () => void;
}

export const AuthButton = ({ user, onLogout }: AuthButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
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
      // OAuth flow will redirect the user
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
            <Avatar className="w-8 h-8">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.handle} />}
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">@{user.handle}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background border border-border z-50">
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LogIn className="w-4 h-4 mr-2" />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login with OAuth</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You'll be redirected to Bluesky to authorize BlueAT Drive. Bluesky may show broad wording
            (likes/posts/reports), but this app only uses access needed to upload files and manage your
            BlueAT Drive records (stars/folders/migration).
          </p>
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
                Sign in with OAuth
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
