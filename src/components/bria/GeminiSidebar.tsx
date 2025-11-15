"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Settings2, Sun, Moon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccessibility } from "@/context/AccessibilityContext";

interface GeminiSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

// Sidebar button icon component (rounded rectangle with vertical divider)
// Matches Gemini's sidebar icon - a rounded rectangle divided vertically
function SidebarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Rounded rectangle outline */}
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      {/* Vertical divider line - positioned to divide into ~1/4 and 3/4 */}
      <line x1="8" y1="4" x2="8" y2="20" />
    </svg>
  );
}

// Recent chat item interface
interface RecentChat {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

// Mock recent chats for example - matching Gemini's style
const mockRecentChats: RecentChat[] = [
  {
    id: "1",
    title: "Create a futuristic city",
    preview: "A cyberpunk metropolis with neon lights...",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "2",
    title: "Design a logo",
    preview: "Modern minimalist logo for tech startup...",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
];

export function GeminiSidebar({ isOpen, onToggle, onNewChat }: GeminiSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const {
    highContrast,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    darkMode,
    toggleDarkMode,
  } = useAccessibility();

  // Close sidebar when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking on the sidebar
      if (sidebarRef.current?.contains(target)) {
        return;
      }

      // Close the sidebar if clicking outside
      onToggle();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleChatClick = () => {
    if (isOpen) {
      onToggle();
    }
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 h-full z-50 flex flex-col bg-background border-r transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col p-2 gap-2 flex-shrink-0">
        {/* Sidebar Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "rounded-lg hover:bg-muted transition-colors",
            isOpen ? "h-10 w-full justify-start px-3" : "h-10 w-10"
          )}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          <SidebarIcon className="h-5 w-5 flex-shrink-0" />
          {isOpen && (
            <span className="ml-3 text-sm"></span>
          )}
        </Button>

        {/* New Chat Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className={cn(
            "rounded-lg hover:bg-muted transition-colors",
            isOpen ? "h-10 w-full justify-start px-3" : "h-10 w-10"
          )}
          aria-label="New Project"
          title="New Project"
        >
          <Pencil className={cn(
            "flex-shrink-0",
            isOpen ? "h-4 w-4" : "h-5 w-5"
          )} />
          {isOpen && (
            <span className="ml-3 text-sm">New chat</span>
          )}
        </Button>
      </div>

      {/* Scrollable Content Area - Always takes space to push bottom section down */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isOpen && (
          <>
            {/* Recent Section */}
            <div className="mb-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                Recent
              </h2>
              <div className="space-y-1">
                {mockRecentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={handleChatClick}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="text-sm text-foreground line-clamp-1">
                      {chat.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Section - Settings */}
      <div className="p-2 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-lg hover:bg-muted transition-colors",
                isOpen ? "h-10 w-full justify-start px-3" : "h-10 w-10"
              )}
              aria-label="Settings"
            >
              <Settings2 className={cn(
                "flex-shrink-0",
                isOpen ? "h-4 w-4" : "h-5 w-5"
              )} />
              {isOpen && (
                <span className="ml-3 text-sm">Settings</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-2">
            <DropdownMenuLabel className="text-center">Accessibility Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={toggleDarkMode} className="cursor-pointer transition-colors hover:bg-muted">
              <div className="flex items-center justify-between w-full">
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                {darkMode ? <Sun className="h-4 w-4 ml-2 text-yellow-400" /> : <Moon className="h-4 w-4 ml-2 text-purple-600" />}
              </div>
            </DropdownMenuItem>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Theme toggle also available in navbar
            </div>
            
            <DropdownMenuItem onClick={toggleHighContrast} className="cursor-pointer transition-colors hover:bg-muted">
              <div className="flex items-center justify-between w-full">
                <span>{highContrast ? 'Standard Contrast' : 'High Contrast'}</span>
                <span className={`ml-2 h-4 w-4 rounded-full ${highContrast ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={increaseFontSize} className="cursor-pointer transition-colors hover:bg-muted">
              <div className="flex items-center">
                <span>Increase Font Size</span>
                <ZoomIn className="h-4 w-4 ml-2" />
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={decreaseFontSize} className="cursor-pointer transition-colors hover:bg-muted">
              <div className="flex items-center">
                <span>Decrease Font Size</span>
                <ZoomOut className="h-4 w-4 ml-2" />
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={resetFontSize} className="cursor-pointer transition-colors hover:bg-muted">
              <div className="flex items-center">
                <span>Reset Font Size</span>
                <RotateCcw className="h-4 w-4 ml-2" />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

