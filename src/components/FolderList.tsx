import { useState, useEffect } from "react";
import { FolderOpen, Plus, Trash2, RefreshCw, ChevronRight, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listFolders, createFolder, deleteFolder, removeItemFromFolder, resolveRecordFromUri, FolderWithMeta } from "@/lib/folders";
import { resolvePdsUrl, isVideoMimeType } from "@/lib/oauth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FolderListProps {
  did: string;
  refreshKey?: number;
}

export const FolderList = ({ did, refreshKey = 0 }: FolderListProps) => {
  const [folders, setFolders] = useState<FolderWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [folderItems, setFolderItems] = useState<Record<string, Array<{ uri: string; cid: string; mimeType: string; did: string }>>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  const [pdsUrl, setPdsUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    resolvePdsUrl(did).then(setPdsUrl);
  }, [did]);

  const loadFolders = async () => {
    setIsLoading(true);
    const data = await listFolders(did);
    setFolders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFolders();
  }, [did, refreshKey]);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    const result = await createFolder(did, newFolderName.trim());
    if (result.success) {
      toast({ title: "Folder created", description: `"${newFolderName.trim()}" created` });
      setNewFolderName("");
      setShowCreateInput(false);
      loadFolders();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsCreating(false);
  };

  const handleDelete = async (rkey: string, name: string) => {
    const result = await deleteFolder(did, rkey);
    if (result.success) {
      setFolders(prev => prev.filter(f => f.rkey !== rkey));
      toast({ title: "Folder deleted", description: `"${name}" deleted` });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleExpand = async (folder: FolderWithMeta) => {
    if (expandedFolder === folder.rkey) {
      setExpandedFolder(null);
      return;
    }
    setExpandedFolder(folder.rkey);

    if (!folderItems[folder.rkey]) {
      setLoadingItems(folder.rkey);
      const resolved = await Promise.all(
        folder.items.map(async (uri) => {
          const record = await resolveRecordFromUri(uri);
          return record ? { uri, ...record } : null;
        })
      );
      setFolderItems(prev => ({
        ...prev,
        [folder.rkey]: resolved.filter(Boolean) as any,
      }));
      setLoadingItems(null);
    }
  };

  const handleRemoveItem = async (rkey: string, itemUri: string) => {
    const result = await removeItemFromFolder(did, rkey, itemUri);
    if (result.success) {
      setFolderItems(prev => ({
        ...prev,
        [rkey]: (prev[rkey] || []).filter(i => i.uri !== itemUri),
      }));
      setFolders(prev => prev.map(f => 
        f.rkey === rkey ? { ...f, items: f.items.filter(i => i !== itemUri) } : f
      ));
      toast({ title: "Removed", description: "Item removed from folder" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const getBlobUrl = (itemDid: string, cid: string) => {
    const itemPdsUrl = pdsUrl; // For same-user items
    return `${itemPdsUrl}/xrpc/com.atproto.sync.getBlob?did=${itemDid}&cid=${cid}`;
  };

  const getProxiedImageUrl = (itemDid: string, cid: string) => {
    const rawUrl = getBlobUrl(itemDid, cid);
    return `https://atimg.madebydanny.uk/?image=${encodeURIComponent(rawUrl)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateInput(!showCreateInput)}>
            <Plus className="w-4 h-4 mr-1" />
            New Folder
          </Button>
          <Button variant="ghost" size="icon" onClick={loadFolders} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {showCreateInput && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="bg-muted/50 border-0"
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating || !newFolderName.trim()}>
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCreateInput(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No folders yet</p>
            <p className="text-sm text-muted-foreground">
              Create a folder to organize your uploads
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folder) => (
            <div key={folder.rkey} className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                onClick={() => handleExpand(folder)}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {folder.items.length} {folder.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.rkey, folder.name); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expandedFolder === folder.rkey && "rotate-90"
                  )} />
                </div>
              </button>

              {expandedFolder === folder.rkey && (
                <div className="border-t border-border p-4">
                  {loadingItems === folder.rkey ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {[...Array(Math.min(folder.items.length, 6))].map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (folderItems[folder.rkey]?.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items in this folder
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {folderItems[folder.rkey]?.map((item) => {
                        const isVideo = isVideoMimeType(item.mimeType);
                        return (
                          <div key={item.uri} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                            {isVideo ? (
                              <>
                                <video
                                  src={getBlobUrl(item.did, item.cid)}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </>
                            ) : (
                              <img
                                src={getProxiedImageUrl(item.did, item.cid)}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                            <button
                              onClick={() => handleRemoveItem(folder.rkey, item.uri)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
