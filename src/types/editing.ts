export type EditingTool = 'none' | 'move' | 'select' | 'mask' | 'text' | 'adjust';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

export interface EditingState {
  activeTool: EditingTool;
  selection: SelectionRect | null;
  maskData: ImageData | null;
  textLayers: TextLayer[];
  imageAdjustments: ImageAdjustments;
  brushSize: number;
}

export interface MaskExport {
  dataUrl: string;
  width: number;
  height: number;
}

export interface SelectionExport {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
};

export const DEFAULT_EDITING_STATE: EditingState = {
  activeTool: 'none',
  selection: null,
  maskData: null,
  textLayers: [],
  imageAdjustments: DEFAULT_IMAGE_ADJUSTMENTS,
  brushSize: 30,
};

