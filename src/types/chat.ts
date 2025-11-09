// Chat message types

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "pending" | "updating" | "complete" | "error";
  agentStatus?: string; // Live updates like "Thinking of a plan", "Calling text-to-image", etc.
  isError?: boolean; // True if this is an error message
}

