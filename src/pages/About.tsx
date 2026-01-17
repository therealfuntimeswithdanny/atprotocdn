import { Cloud, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const About = () => {
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
    >
      <div className="max-w-3xl mx-auto p-6 lg:p-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">About</h2>
          <p className="text-muted-foreground">Learn more about ATProto CDN</p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What is ATProto CDN?</h3>
            <p className="text-muted-foreground leading-relaxed">
              ATProto CDN is a decentralized content delivery network built on the AT Protocol. 
              It allows you to upload and share images and videos using your Bluesky account, 
              with files stored directly on your Personal Data Server (PDS).
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How it works</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Sign in with your Bluesky account using OAuth</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Upload images and videos directly to your PDS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Get shareable links for your uploads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Your data stays on your own server, fully under your control</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Features</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium mb-1">Bulk Upload</h4>
                <p className="text-sm text-muted-foreground">Upload multiple files at once</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium mb-1">Multi-Account</h4>
                <p className="text-sm text-muted-foreground">Switch between multiple accounts</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium mb-1">Image Proxy</h4>
                <p className="text-sm text-muted-foreground">Optimized image delivery</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium mb-1">Shareable Links</h4>
                <p className="text-sm text-muted-foreground">Easy sharing with permanent URLs</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <a 
              href="https://atproto.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Learn more about AT Protocol
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default About;
