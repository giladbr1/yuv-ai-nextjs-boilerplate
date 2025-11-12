"use client";

import React from "react";
import { BriaHeader } from "@/components/bria/BriaHeader";
import { LeftSidebar } from "@/components/bria/LeftSidebar";
import { GenerationCanvas } from "@/components/bria/GenerationCanvas";
import { GalleryBar } from "@/components/bria/GalleryBar";
import { useBriaGeneration } from "@/hooks/useBriaGeneration";
import { toast } from "sonner";

export default function Home() {
  const {
    messages,
    params,
    generatedMedia,
    galleryItems,
    activeItemId,
    isGenerating,
    error,
    editingState,
    activeOperation,
    operationLoadingName,
    batchExecution,
    updateParams,
    generate,
    uploadImageForReference,
    uploadImageForDisplay,
    surpriseMe,
    clearError,
    setActiveItem,
    setActiveTool,
    updateSelection,
    updateMask,
    addTextLayer,
    updateTextLayer,
    updateImageAdjustments,
    setBrushSize,
    clearEditingState,
    selectOperation,
    cancelOperation,
    executeOneClickOperation,
    setInpaintingMask,
  } = useBriaGeneration();

  // Inpainting state
  const [shouldFocusPrompt, setShouldFocusPrompt] = React.useState(false);
  const [customPlaceholder, setCustomPlaceholder] = React.useState<string>();

  React.useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // ESC key handler to close active tool or cancel operation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeOperation) {
          cancelOperation();
        } else if (editingState.activeTool !== 'none') {
          setActiveTool('none');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingState.activeTool, activeOperation, setActiveTool, cancelOperation]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <BriaHeader
        mode={params.mode}
        modelVersion={params.model_version}
        onModeChange={(mode) => updateParams({ mode })}
        onModelChange={(model_version) => updateParams({ model_version })}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Instructions & Controls */}
        <div className="w-[20%] border-r bg-background">
          <LeftSidebar
            messages={messages}
            params={params}
            onParamsChange={updateParams}
            onGenerate={generate}
            onImageUpload={uploadImageForReference}
            onSurpriseMe={surpriseMe}
            isGenerating={isGenerating}
            customPlaceholder={customPlaceholder}
            shouldFocusPrompt={shouldFocusPrompt}
            onPromptFocused={() => {
              setShouldFocusPrompt(false);
              setCustomPlaceholder(undefined);
            }}
          />
        </div>

        {/* Right Canvas - Generation Area with Gallery */}
        <div className="flex-1 flex bg-muted/30">
          {/* Main Generation Display */}
          <div className="flex-1 overflow-hidden">
            <GenerationCanvas
              generatedMedia={generatedMedia}
              isGenerating={isGenerating}
              batchExecution={batchExecution}
              onFileUpload={uploadImageForDisplay}
              className="h-full w-full"
              hasImage={!!generatedMedia}
              onOperationExecute={executeOneClickOperation}
              onAspectRatioChange={(aspectRatio) => updateParams({ aspectRatio })}
              onPromptFocus={() => {
                setCustomPlaceholder("What do you want in the masked area?");
                setShouldFocusPrompt(true);
              }}
              onFillMask={(maskBase64) => {
                setInpaintingMask(maskBase64);
              }}
            />
          </div>
          
          {/* Gallery Bar - Vertical on Right */}
          <GalleryBar
            items={galleryItems}
            activeItemId={activeItemId}
            onItemClick={setActiveItem}
          />
        </div>
      </div>
    </div>
  );
}
