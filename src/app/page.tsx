"use client";

import React, { useState } from "react";
import { BriaHeader } from "@/components/bria/BriaHeader";
import { ChatInterface, ChatMessage } from "@/components/bria/ChatInterface";
import { GenerationControls } from "@/components/bria/GenerationControls";
import { GenerationCanvas } from "@/components/bria/GenerationCanvas";
import { useBriaGeneration } from "@/hooks/useBriaGeneration";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const {
    messages,
    params,
    attributionAmount,
    generatedMedia,
    isGenerating,
    error,
    sendMessage,
    updateParams,
    generate,
    uploadImage,
    surpriseMe,
    clearError,
  } = useBriaGeneration();

  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    try {
      await sendMessage(chatInput);
      setChatInput("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  React.useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <BriaHeader attributionAmount={attributionAmount} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chat & Controls */}
        <div className="w-1/3 flex flex-col border-r bg-background">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatInterface messages={messages} className="flex-1" />

            {/* Chat Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Generation Controls */}
          <div className="overflow-y-auto max-h-[50vh]">
            <GenerationControls
              params={params}
              onParamsChange={updateParams}
              onGenerate={generate}
              onImageUpload={uploadImage}
              onSurpriseMe={surpriseMe}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Right Canvas - Generation Area */}
        <div className="flex-1 bg-muted/30">
          <GenerationCanvas
            generatedMedia={generatedMedia}
            isGenerating={isGenerating}
            onFileUpload={uploadImage}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
