"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BriaHeaderProps {
  attributionAmount: number;
}

export function BriaHeader({ attributionAmount }: BriaHeaderProps) {
  return (
    <header className="w-full border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Bria Logo */}
        <div className="flex items-center space-x-2">
          <svg
            className="h-8 w-auto"
            viewBox="0 0 120 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="10"
              y="30"
              className="fill-primary text-2xl font-bold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              BRIA
            </text>
          </svg>
        </div>

        {/* Contribution to Attribution Counter */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 cursor-help">
                <span className="text-sm font-medium text-muted-foreground">
                  Contribution to Attribution:
                </span>
                <span className="text-lg font-semibold text-primary">
                  ${attributionAmount.toFixed(3)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                The estimated payment data owners will receive from your generations.{" "}
                <a
                  href="#"
                  className="text-primary underline hover:text-primary/80"
                  onClick={(e) => e.preventDefault()}
                >
                  Read more
                </a>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}

