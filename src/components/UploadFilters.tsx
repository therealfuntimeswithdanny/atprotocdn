import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface UploadFiltersState {
  search: string;
  dateRange: "all" | "today" | "week" | "month";
  mimeType: "all" | "images" | "videos" | "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "video/mp4" | "video/webm";
  sizeRange: "all" | "small" | "medium" | "large";
  sortBy: "date" | "size" | "name";
  sortOrder: "desc" | "asc";
}

interface UploadFiltersProps {
  filters: UploadFiltersState;
  onFiltersChange: (filters: UploadFiltersState) => void;
}

export const defaultFilters: UploadFiltersState = {
  search: "",
  dateRange: "all",
  mimeType: "all",
  sizeRange: "all",
  sortBy: "date",
  sortOrder: "desc",
};

export const UploadFilters = ({ filters, onFiltersChange }: UploadFiltersProps) => {
  const [searchValue, setSearchValue] = useState(filters.search);

  const activeFilterCount = [
    filters.dateRange !== "all",
    filters.mimeType !== "all",
    filters.sizeRange !== "all",
    filters.sortBy !== "date" || filters.sortOrder !== "desc",
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = filters.search || activeFilterCount > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
        {searchValue && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-popover" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => 
                  onFiltersChange({ ...filters, dateRange: value as UploadFiltersState["dateRange"] })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">File Type</label>
              <Select
                value={filters.mimeType}
                onValueChange={(value) => 
                  onFiltersChange({ ...filters, mimeType: value as UploadFiltersState["mimeType"] })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="images">All images</SelectItem>
                  <SelectItem value="videos">All videos</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/gif">GIF</SelectItem>
                  <SelectItem value="image/webp">WebP</SelectItem>
                  <SelectItem value="video/mp4">MP4</SelectItem>
                  <SelectItem value="video/webm">WebM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">File Size</label>
              <Select
                value={filters.sizeRange}
                onValueChange={(value) => 
                  onFiltersChange({ ...filters, sizeRange: value as UploadFiltersState["sizeRange"] })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All sizes</SelectItem>
                  <SelectItem value="small">{"< 100 KB"}</SelectItem>
                  <SelectItem value="medium">100 KB - 1 MB</SelectItem>
                  <SelectItem value="large">{"> 1 MB"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <div className="flex gap-2">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => 
                    onFiltersChange({ ...filters, sortBy: value as UploadFiltersState["sortBy"] })
                  }
                >
                  <SelectTrigger className="flex-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value) => 
                    onFiltersChange({ ...filters, sortOrder: value as UploadFiltersState["sortOrder"] })
                  }
                >
                  <SelectTrigger className="w-24 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
