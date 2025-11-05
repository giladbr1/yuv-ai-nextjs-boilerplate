# Bria Agentic Generation Interface - Setup Guide

## Overview

This application provides a conversational AI-powered interface for creative content generation using:
- **Bria MCP Server**: Model Context Protocol integration for image/video generation
- **Gemini 2.5 Flash**: Conversational agent for natural language control
- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS + Shadcn UI**: Beautiful, accessible UI components

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Bria MCP API access
- Google AI Studio API key

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file in the root directory with the following:

```env
# Gemini AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDlF9DPrN9JKLzhjt66VwwDe7w4Z9xPKFs

# Bria MCP Server Configuration
BRIA_MCP_URL=https://mcp.prod.bria-api.com/mcp
BRIA_MCP_API_TOKEN=32864e2cd5894c61862efe93d4de311c

# Generation Defaults
DEFAULT_MODEL=Fibo
DEFAULT_STEPS=50
DEFAULT_ASPECT_RATIO=1:1
```

3. **Run development server:**
```bash
npm run dev
```

4. **Open browser:**
Navigate to `http://localhost:3000`

## Features

### 1. Conversational Interface
- Chat with the AI agent to describe what you want to create
- Agent understands natural language and translates to generation parameters
- Full conversation history with auto-scroll

### 2. Generation Controls
- **Mode**: Toggle between Image and Video generation
- **Model Selection**: Choose from Fibo, 3.2, or EA tailored models
- **Model Influence**: Conditional slider (only visible for EA tailored)
- **Steps**: Control generation quality (10-50 steps)
- **Aspect Ratio**: Quick selection for common ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- **Seed**: Random or fixed seed for reproducibility

### 3. Interactive Canvas
- Drag-and-drop image upload for editing
- Click to upload reference images
- Display generated images and videos
- Loading states and animations

### 4. Contribution to Attribution
- Real-time counter showing estimated payments to data owners
- Tooltip with explanation and read more link
- Transparent ethical AI practices

## Architecture

### Frontend Structure
```
src/
├── app/
│   ├── page.tsx                    # Main interface
│   ├── layout.tsx                  # Root layout
│   └── api/                        # API routes
│       ├── chat/route.ts           # Gemini agent endpoint
│       ├── generate/route.ts       # Generation endpoint
│       ├── mcp-tools/route.ts      # MCP tool execution
│       └── upload/route.ts         # File upload handler
├── components/
│   ├── bria/                       # Bria-specific components
│   │   ├── BriaHeader.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── GenerationControls.tsx
│   │   └── GenerationCanvas.tsx
│   └── ui/                         # Shadcn UI components
├── hooks/
│   └── useBriaGeneration.ts        # State management hook
└── lib/
    ├── mcp-client.ts               # MCP client service
    └── gemini-agent.ts             # Gemini agent service
```

### Key Components

#### MCP Client (`src/lib/mcp-client.ts`)
- Connects to Bria MCP server via Streamable HTTP transport
- Implements JSON-RPC 2.0 protocol for MCP communication
- Discovers available generation tools
- Executes tool calls with parameters
- Handles authentication and error recovery

#### Gemini Agent (`src/lib/gemini-agent.ts`)
- Manages conversational AI with Gemini 2.5 Flash
- Translates natural language to generation parameters
- Function calling for tool execution and parameter updates
- Chat history management

#### State Management Hook (`src/hooks/useBriaGeneration.ts`)
- Centralized state for entire interface
- Message history and chat state
- Generation parameters
- Attribution tracking
- Loading and error states

## Usage Examples

### Natural Language Generation
1. Type in chat: "Create a sunset over mountains"
2. Agent interprets and sets up parameters
3. Click Generate or let agent trigger generation
4. View result in canvas

### Parameter Adjustment
1. Chat: "Make it 16:9 and use 30 steps"
2. Agent updates aspect ratio and steps
3. Previous prompt is maintained

### Image Editing
1. Drag and drop an image to canvas
2. Chat: "Make the background blue"
3. Agent uses uploaded image as reference
4. Generates edited version

### Surprise Me
1. Click the wand icon in prompt box
2. Random creative prompt is generated
3. Ready to generate immediately

## API Endpoints

### POST `/api/chat`
Send messages to the conversational agent
- **Body**: `{ message: string, currentParams: GenerationParams }`
- **Returns**: `{ message: string, toolCalls?: [], parameterUpdates?: {} }`

### POST `/api/generate`
Generate image or video with parameters
- **Body**: `{ params: GenerationParams }`
- **Returns**: `{ media: { type, url }, attribution: number }`

### GET/POST `/api/mcp-tools`
List or execute MCP tools
- **GET**: Returns available tools
- **POST**: Executes specific tool with args

### POST `/api/upload`
Upload reference images
- **Body**: FormData with image file
- **Returns**: `{ url: string }`

## Customization

### Adding New Models
Edit `src/lib/gemini-agent.ts` and `src/components/bria/GenerationControls.tsx`:
```typescript
model_version: "Fibo" | "3.2" | "EA tailored" | "YourNewModel"
```

### Adjusting Default Parameters
Edit `src/hooks/useBriaGeneration.ts`:
```typescript
const DEFAULT_PARAMS: GenerationParams = {
  mode: "image",
  model_version: "3.2",
  steps: 50,
  // ... customize
};
```

### Styling
All styles use Tailwind CSS. Global styles in `src/app/globals.css`.
Custom animations can be added to the same file.

## Troubleshooting

### MCP Connection Issues
- Verify `BRIA_MCP_URL` and `BRIA_MCP_API_TOKEN` are correct
- Check network connectivity
- Review browser console for detailed errors

### Gemini API Errors
- Ensure `GOOGLE_GENERATIVE_AI_API_KEY` is valid
- Check API quota limits
- Verify model name is correct (gemini-2.0-flash-exp)

### File Upload Failures
- Ensure `public/uploads/` directory exists
- Check file permissions
- Verify file size limits

## Accessibility

The interface follows WCAG 2.1 AA standards:
- Keyboard navigation support
- Screen reader compatible
- High contrast mode available
- Focus indicators on all interactive elements
- Proper ARIA labels

## Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Set production environment variables** in your hosting platform

3. **Deploy** to Vercel, Netlify, or your preferred host

4. **Important**: Ensure file upload directory is writable in production

## Support

For issues or questions:
- Check the [Next.js documentation](https://nextjs.org/docs)
- Review [Gemini API docs](https://ai.google.dev/docs)
- Contact Bria support for MCP-related questions

---

Built with ❤️ by Yuval Avidani - [YUV.AI](https://yuv.ai)

