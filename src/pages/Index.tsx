import { useState } from "react";
import { Cloud } from "lucide-react";
import { BulkUploadZone } from "@/components/BulkUploadZone";
import { UploadPreview } from "@/components/UploadPreview";
import { UploadQueue, UploadQueueItem } from "@/components/UploadQueue";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { RecentUploadsPreview } from "@/components/RecentUploadsPreview";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { uploadMultipleBlobsWithOAuth } from "@/lib/oauth";

type UploadPhase = "idle" | "preview" | "uploading" | "complete";

const Index = () => {
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [uploadsKey, setUploadsKey] = useState(0);
  const { activeUser, accounts, isRestoringSession, handleSwitchAccount, handleLogout } = useAuth();
  const { toast } = useToast();

  const resetUploadState = () => {
    setUploadPhase("idle");
    setPendingFiles([]);
    setUploadQueue([]);
    setCompletedCount(0);
  };

  const handleFilesSelect = (files: File[]) => {
    setPendingFiles(files);
    setUploadPhase("preview");
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      resetUploadState();
    } else {
      setPendingFiles(newFiles);
    }
  };

  const handleCancelPreview = () => {
    resetUploadState();
  };

  const handleStartUpload = async () => {
    if (!activeUser || pendingFiles.length === 0) return;

    setUploadPhase("uploading");
    setCompletedCount(0);
    
    const initialQueue: UploadQueueItem[] = pendingFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setUploadQueue(initialQueue);

    const { successCount, failedCount } = await uploadMultipleBlobsWithOAuth(
      activeUser.did,
      pendingFiles,
      (index, status, error) => {
        setUploadQueue(prev => {
          const newQueue = [...prev];
          newQueue[index] = {
            ...newQueue[index],
            status,
            progress: status === 'completed' ? 100 : status === 'uploading' ? 50 : 0,
            error,
          };
          return newQueue;
        });
        
        if (status === 'completed' || status === 'failed') {
          setCompletedCount(prev => prev + 1);
        }
      }
    );

    setUploadPhase("complete");
    setUploadsKey(prev => prev + 1);

    toast({
      title: "Upload complete",
      description: `${successCount} uploaded${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      variant: failedCount > 0 ? "destructive" : "default",
    });

    setTimeout(() => {
      resetUploadState();
    }, 3000);
  };

  return (
    <AppLayout
      activeUser={activeUser}
      accounts={accounts}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
      uploadsKey={uploadsKey}
    >
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
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
              <h2 className="text-2xl font-bold">Welcome to ATProto CDN</h2>
              <p className="text-muted-foreground max-w-md">
                Sign in with your ATProto account to upload images to your Personal Data Server
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
            <div>
              <h2 className="text-2xl font-bold mb-1">Upload Files</h2>
              <p className="text-muted-foreground text-sm">
                Upload to @{activeUser.handle}'s PDS
              </p>
            </div>
            
            {uploadPhase === "idle" && (
              <BulkUploadZone 
                onFilesSelect={handleFilesSelect} 
                isUploading={false}
              />
            )}

            {uploadPhase === "preview" && (
              <UploadPreview
                files={pendingFiles}
                onUpload={handleStartUpload}
                onCancel={handleCancelPreview}
                onRemoveFile={handleRemoveFile}
                isUploading={false}
              />
            )}

            {(uploadPhase === "uploading" || uploadPhase === "complete") && (
              <UploadQueue
                items={uploadQueue}
                completedCount={completedCount}
                totalCount={pendingFiles.length}
              />
            )}

            {uploadPhase === "idle" && (
              <div className="mt-8">
                <RecentUploadsPreview userDid={activeUser.did} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
