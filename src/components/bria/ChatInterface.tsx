"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  className?: string;
}

export function ChatInterface({ messages, className }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 overflow-y-auto bg-muted/20 dark:bg-muted/10 p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        className
      )}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAgent = message.role === "assistant" || message.role === "system";
  const isUpdating = message.status === "updating";
  const isError = message.isError || message.status === "error";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-full rounded-lg px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : isError
            ? "bg-destructive/10 border-2 border-destructive text-destructive-foreground"
            : "bg-background border border-border"
        )}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Agent status indicator (for updating messages) */}
        {isAgent && isUpdating && message.agentStatus && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground italic">
              {message.agentStatus}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            "text-xs mt-1 opacity-60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
