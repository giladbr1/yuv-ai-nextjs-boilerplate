// Chat message types

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "pending" | "updating" | "complete";
  agentStatus?: string; // Live updates like "Thinking of a plan", "Calling text-to-image", etc.
}

