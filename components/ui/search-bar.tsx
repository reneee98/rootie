"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchBarProps = Omit<React.ComponentProps<typeof Input>, "type" | "role"> & {
  onSearch?: () => void;
  searchLabel?: string;
  containerClassName?: string;
};

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    { className, onSearch, searchLabel = "Hľadať", containerClassName, ...props },
    ref
  ) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        e.preventDefault();
        onSearch();
      }
    };

    return (
      <div
        className={cn(
          "flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-input bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          containerClassName
        )}
      >
        <Search className="text-muted-foreground size-5 shrink-0" aria-hidden />
        <Input
          ref={ref}
          type="search"
          role="searchbox"
          autoComplete="off"
          className={cn(
            "h-10 min-h-0 border-0 bg-transparent shadow-none focus-visible:ring-0",
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {onSearch && (
          <Button type="button" variant="secondary" size="sm" onClick={onSearch} className="shrink-0">
            {searchLabel}
          </Button>
        )}
      </div>
    );
  }
);

export { SearchBar };
