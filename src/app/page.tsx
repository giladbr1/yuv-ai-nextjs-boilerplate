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
    attributionAmount,
    generatedMedia,
    galleryItems,
    activeItemId,
    isGenerating,
    error,
    editingState,
    instructionsPaneState,
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
  } = useBriaGeneration();

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
      <BriaHeader attributionAmount={attributionAmount} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Instructions & Controls */}
        <div className="w-1/3 border-r bg-background">
          <LeftSidebar
            messages={messages}
            params={params}
            onParamsChange={updateParams}
            onGenerate={generate}
            onImageUpload={uploadImageForReference}
            onSurpriseMe={surpriseMe}
            isGenerating={isGenerating}
            instructionsPaneState={instructionsPaneState}
            activeOperation={activeOperation}
            operationLoadingName={operationLoadingName}
            onOperationSelect={selectOperation}
            onOperationCancel={cancelOperation}
            onOperationExecute={executeOneClickOperation}
          />
        </div>

        {/* Right Canvas - Generation Area with Gallery */}
        <div className="flex-1 flex flex-col bg-muted/30">
          {/* Main Generation Display */}
          <div className="flex-1 overflow-hidden">
            <GenerationCanvas
              generatedMedia={generatedMedia}
              isGenerating={isGenerating}
              batchExecution={batchExecution}
              onFileUpload={uploadImageForDisplay}
              className="h-full w-full"
              activeTool={editingState.activeTool}
              selection={editingState.selection}
              maskData={editingState.maskData}
              textLayers={editingState.textLayers}
              imageAdjustments={editingState.imageAdjustments}
              brushSize={editingState.brushSize}
              onToolChange={setActiveTool}
              onSelectionChange={updateSelection}
              onMaskChange={updateMask}
              onTextLayerAdd={addTextLayer}
              onTextLayerUpdate={updateTextLayer}
              onImageAdjustmentsChange={updateImageAdjustments}
              onBrushSizeChange={setBrushSize}
              onImageAdjustmentsReset={clearEditingState}
            />
          </div>
          
          {/* Gallery Bar */}
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
