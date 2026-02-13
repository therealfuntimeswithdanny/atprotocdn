import { useState, useEffect } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listFolders, addItemToFolder, FolderWithMeta } from "@/lib/folders";
import { useToast } from "@/hooks/use-toast";

interface AddToFolderButtonProps {
  did: string;
  subjectUri: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline" | "secondary";
  className?: string;
}

export const AddToFolderButton = ({
  did,
  subjectUri,
  size = "icon",
  variant = "ghost",
  className,
}: AddToFolderButtonProps) => {
  const [folders, setFolders] = useState<FolderWithMeta[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (did) {
      listFolders(did).then(setFolders);
    }
  }, [did]);

  const handleAdd = async (folder: FolderWithMeta) => {
    setIsAdding(true);
    const result = await addItemToFolder(did, folder.rkey, subjectUri);
    if (result.success) {
      toast({ title: "Added to folder", description: `Added to "${folder.name}"` });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsAdding(false);
  };

  if (!subjectUri) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} className={className} disabled={isAdding}>
          <FolderPlus className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {folders.length === 0 ? (
          <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
        ) : (
          folders.map((folder) => (
            <DropdownMenuItem key={folder.rkey} onClick={() => handleAdd(folder)}>
              {folder.name} ({folder.items.length})
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
