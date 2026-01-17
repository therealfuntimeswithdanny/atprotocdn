import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isUploadStarred, toggleStar } from "@/lib/starring";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StarButtonProps {
  did: string;
  uploadId: string;
  subjectUri?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline" | "secondary";
  className?: string;
}

export const StarButton = ({ 
  did, 
  uploadId, 
  subjectUri = '',
  size = "icon",
  variant = "ghost",
  className,
}: StarButtonProps) => {
  const [isStarred, setIsStarred] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkStarStatus = async () => {
      setIsLoading(true);
      const starred = await isUploadStarred(did, uploadId);
      setIsStarred(starred);
      setIsLoading(false);
    };
    
    if (did && uploadId) {
      checkStarStatus();
    }
  }, [did, uploadId]);

  const handleToggle = async () => {
    setIsToggling(true);
    const result = await toggleStar(did, uploadId, subjectUri);
    
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setIsStarred(result.starred);
      toast({
        title: result.starred ? "Starred" : "Unstarred",
        description: result.starred 
          ? "Added to your starred uploads" 
          : "Removed from starred uploads",
      });
    }
    setIsToggling(false);
  };

  if (isLoading) {
    return (
      <Button 
        size={size} 
        variant={variant} 
        className={className}
        disabled
      >
        <Star className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button 
      size={size} 
      variant={variant} 
      className={cn(
        className,
        isStarred && "text-yellow-500 hover:text-yellow-600"
      )}
      onClick={handleToggle}
      disabled={isToggling}
    >
      <Star className={cn("w-4 h-4", isStarred && "fill-current")} />
    </Button>
  );
};
