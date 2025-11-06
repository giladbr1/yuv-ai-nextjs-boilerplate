"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
} from "lucide-react";
import type { TextLayer } from "@/types/editing";
import { cn } from "@/lib/utils";

interface TextEditorProps {
  onAddText: (layer: Omit<TextLayer, 'id'>) => void;
  className?: string;
}

const fontFamilies = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Comic Sans MS",
  "Impact",
  "Trebuchet MS",
];

const presetColors = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
];

export function TextEditor({ onAddText, className }: TextEditorProps) {
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');

  const handleAddText = () => {
    if (!text.trim()) return;

    onAddText({
      text,
      x: 100, // Default position
      y: 100,
      fontSize,
      fontFamily,
      color,
      bold,
      italic,
      align,
    });

    // Reset form
    setText("");
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg max-w-md",
        className
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="text-input">Text</Label>
        <Input
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddText();
            }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="font-family">Font</Label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger id="font-family">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-size">
            Size: {fontSize}px
          </Label>
          <Slider
            id="font-size"
            value={[fontSize]}
            onValueChange={([value]) => setFontSize(value)}
            min={12}
            max={120}
            step={1}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Palette className="h-4 w-4" />
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: color }}
                />
                <span>{color}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {presetColors.map((presetColor) => (
                    <button
                      key={presetColor}
                      className="h-8 w-8 rounded border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: presetColor,
                        borderColor: color === presetColor ? '#3b82f6' : 'transparent',
                      }}
                      onClick={() => setColor(presetColor)}
                      title={`Select color ${presetColor}`}
                      aria-label={`Select color ${presetColor}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="custom-color" className="text-xs">Custom:</Label>
                  <input
                    id="custom-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-full rounded border cursor-pointer"
                    aria-label="Pick a custom color"
                    title="Pick a custom color"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Style</Label>
        <div className="flex gap-2">
          <Button
            variant={bold ? "default" : "outline"}
            size="icon"
            onClick={() => setBold(!bold)}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={italic ? "default" : "outline"}
            size="icon"
            onClick={() => setItalic(!italic)}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alignment</Label>
        <div className="flex gap-2">
          <Button
            variant={align === 'left' ? "default" : "outline"}
            size="icon"
            onClick={() => setAlign('left')}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={align === 'center' ? "default" : "outline"}
            size="icon"
            onClick={() => setAlign('center')}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={align === 'right' ? "default" : "outline"}
            size="icon"
            onClick={() => setAlign('right')}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        onClick={handleAddText}
        disabled={!text.trim()}
        className="w-full"
      >
        Add Text
      </Button>
    </div>
  );
}

