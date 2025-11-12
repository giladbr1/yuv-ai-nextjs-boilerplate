"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  Image as ImageIcon,
  Video,
} from "lucide-react";

interface BriaHeaderProps {
  mode: "image" | "video";
  modelVersion: "Fibo" | "3.2" | "EA tailored";
  onModeChange: (mode: "image" | "video") => void;
  onModelChange: (model: "Fibo" | "3.2" | "EA tailored") => void;
}

export function BriaHeader({
  mode,
  modelVersion,
  onModeChange,
  onModelChange,
}: BriaHeaderProps) {
  return (
    <header className="w-full border-b bg-background px-6 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Bria Logo */}
        <div className="flex items-center space-x-2 flex-shrink-0">
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

        {/* Center Controls */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {/* Mode Toggle - Image/Video */}
          <div className="flex rounded-md border">
            <Button
              variant={mode === "image" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-r-none border-r"
              onClick={() => onModeChange("image")}
              title="Image"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={mode === "video" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-l-none"
              onClick={() => onModeChange("video")}
              title="Video"
            >
              <Video className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Model - Direct Dropdown */}
          <Select
            value={modelVersion}
            onValueChange={(value) =>
              onModelChange(value as "Fibo" | "3.2" | "EA tailored")
            }
          >
            <SelectTrigger className="h-8 w-auto px-3 text-xs gap-1.5 border">
              <Settings2 className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fibo">Fibo</SelectItem>
              <SelectItem value="3.2">3.2</SelectItem>
              <SelectItem value="EA tailored">EA tailored</SelectItem>
              <div className="px-2 py-1.5 text-xs border-t mt-1">
                <a
                  href="#"
                  className="text-primary hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  train a tailored engine
                </a>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* IP Button */}
        <Button variant="outline" size="sm" className="h-8 px-3 flex-shrink-0">
          IP
        </Button>
      </div>
    </header>
  );
}

