# Bria Agentic Generation Interface

> A next-generation creative platform powered by conversational AI

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Overview

The Bria Agentic Generation Interface is a revolutionary creative platform that combines powerful AI-driven image and video generation with an intuitive conversational interface. Instead of struggling with complex prompts and parameter tuning, simply talk to the AI agent about what you want to create.

### Key Features

- 🤖 **Conversational AI Control** - Powered by Gemini 2.5 Flash for natural language understanding
- 🎨 **Multi-Model Support** - Choose from Fibo, 3.2, or EA tailored models
- 📸 **Image & Video Generation** - Create both static and animated content
- 🔄 **Direct Image Editing** - Upload images for AI-powered editing
- 💰 **Transparent Attribution** - Real-time tracking of data owner compensation
- ⚡ **Real-time Parameter Control** - Fine-tune generation settings on the fly
- 🎯 **Surprise Me Feature** - Get creative prompt suggestions
- ♿ **Accessibility First** - WCAG 2.1 AA compliant

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **AI Agent**: Google Gemini 2.5 Flash
- **Generation**: Bria MCP (Model Context Protocol via Streamable HTTP)
- **State Management**: React Hooks
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 📋 Prerequisites

- Node.js 20+ 
- npm or yarn
- **Bria MCP API Token** - Get from Bria dashboard
- **Google AI Studio API Key** - Get from https://aistudio.google.com/app/apikey

**⚠️ Security Note:** Never commit API keys to version control. Always use `.env.local` file.

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bria-agentic-interface.git
cd bria-agentic-interface

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and add your API keys:

```bash
# Copy the example file (if using bash/linux/mac)
cp .env.example .env.local

# Or on Windows PowerShell
Copy-Item .env.example .env.local
```

Then edit `.env.local` with your actual API keys:

```env
# Google Generative AI (Gemini) API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here

# Bria MCP Server Configuration
BRIA_MCP_URL=https://mcp.prod.bria-api.com/mcp
BRIA_MCP_API_TOKEN=your_bria_api_token_here
```

**Important:** 
- `.env.local` is already in `.gitignore` and will not be committed
- Never hardcode API keys in source code
- Use `.env.example` as a reference template

**Windows Users**: The project uses `dotenv` to explicitly load `.env.local` to ensure compatibility with Windows systems where Next.js sometimes fails to load environment variables properly. Check the terminal logs for "Environment variables loaded successfully" confirmation.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Creating Your First Generation

1. **Start with a conversation:**
   ```
   "Create a beautiful sunset over mountains"
   ```

2. **The AI agent will:**
   - Understand your intent
   - Set appropriate parameters
   - Guide you through the process

3. **Click Generate** to create your image

### Advanced Parameter Control

You can adjust parameters through conversation:
- "Make it 16:9 aspect ratio"
- "Use 30 steps instead"
- "Change to EA tailored model"
- "Set seed to 42 for reproducibility"

### Image Editing

1. Drag and drop an image onto the canvas
2. Describe your edits: "Make the sky more dramatic"
3. Generate to see the edited result

### Surprise Me

Click the magic wand icon (🪄) for random creative prompt suggestions.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Bria Header                     │
│  [Logo]              [Attribution Counter]       │
└─────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────┐
│   Left Sidebar   │      Right Canvas            │
│   (1/3 width)    │      (2/3 width)             │
│                  │                              │
│ ┌──────────────┐ │ ┌──────────────────────────┐ │
│ │ Chat History │ │ │                          │ │
│ │              │ │ │   Generation Display     │ │
│ │   Messages   │ │ │                          │ │
│ │              │ │ │   or Drag-Drop Upload    │ │
│ │              │ │ │                          │ │
│ └──────────────┘ │ └──────────────────────────┘ │
│ ┌──────────────┐ │                              │
│ │ Chat Input   │ │                              │
│ └──────────────┘ │                              │
│ ┌──────────────┐ │                              │
│ │  Controls    │ │                              │
│ │ • Prompt     │ │                              │
│ │ • Mode       │ │                              │
│ │ • Model      │ │                              │
│ │ • Steps      │ │                              │
│ │ • Aspect     │ │                              │
│ │ • Seed       │ │                              │
│ └──────────────┘ │                              │
└──────────────────┴──────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main interface
│   ├── layout.tsx                  # Root layout
│   └── api/                        # API routes
│       ├── chat/route.ts           # Gemini agent
│       ├── generate/route.ts       # Generation
│       ├── mcp-tools/route.ts      # Tool execution
│       └── upload/route.ts         # File upload
├── components/
│   ├── bria/                       # Feature components
│   │   ├── BriaHeader.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── GenerationControls.tsx
│   │   └── GenerationCanvas.tsx
│   └── ui/                         # Shadcn UI components
├── hooks/
│   └── useBriaGeneration.ts        # State management
├── lib/
│   ├── mcp-client.ts               # MCP integration
│   ├── gemini-agent.ts             # AI agent
│   └── utils.ts                    # Utilities
└── types/                          # TypeScript types
```

## 🔧 Configuration

### Models

Available generation models:
- **Fibo** (default): Bria's flagship model
- **3.2**: Alternative model option
- **EA tailored**: Enterprise-adjusted with Model Influence control

### Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Mode | image, video | image | Generation type |
| Steps | 10-50 | 50 | Quality vs speed |
| Aspect Ratio | Various | 1:1 | Output dimensions |
| Seed | random/number | random | Reproducibility |
| Model Influence | 0-1 | 0.8 | For EA tailored only |

## 🧪 API Documentation

### Chat Endpoint

```typescript
POST /api/chat
Body: {
  message: string;
  currentParams: GenerationParams;
}
Response: {
  message: string;
  toolCalls?: Array<{name: string, args: object}>;
  parameterUpdates?: Partial<GenerationParams>;
}
```

### Generate Endpoint

```typescript
POST /api/generate
Body: {
  params: GenerationParams;
}
Response: {
  media: {type: 'image' | 'video', url: string};
  attribution: number;
}
```

## 🎨 Customization

### Theming

The interface supports light/dark modes and uses CSS custom properties. Edit `src/app/globals.css` to customize:

```css
:root {
  --primary: oklch(0.545 0.224 290.849); /* Purple */
  --accent: oklch(0.828 0.189 84.429);   /* Yellow */
  /* ... */
}
```

### Adding Custom Prompts

Edit `src/lib/gemini-agent.ts` to add your own "Surprise Me" prompts:

```typescript
const prompts = [
  "Your custom prompt here",
  // ...
];
```

## 🐛 Troubleshooting

### Common Issues

**MCP Connection Failed**
- Verify API credentials in `.env.local`
- Check network connectivity
- Review MCP server status

**Gemini API Errors**
- Confirm API key is valid
- Check quota limits
- Ensure model name is correct

**File Upload Issues**
- Verify `public/uploads/` directory exists
- Check file permissions
- Confirm file size within limits

### Debug Mode

Set environment variable for detailed logging:
```env
DEBUG=true
```

## 📊 Performance

- Initial load: ~2s
- Chat response: <1s
- Generation time: 5-30s (depends on parameters)
- File upload: <1s for typical images

## ♿ Accessibility

Full WCAG 2.1 AA compliance:
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- Semantic HTML
- ARIA labels

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Docker

```bash
docker build -t bria-interface .
docker run -p 3000:3000 bria-interface
```

### Environment Variables

Ensure all required env vars are set in your deployment platform.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bria AI** for the powerful generation models and MCP server
- **Google** for Gemini 2.5 Flash conversational AI
- **Shadcn** for beautiful UI components
- **Vercel** for Next.js framework and deployment platform

## 📞 Support

- 📧 Email: support@yuv.ai
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/bria-agentic-interface/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/bria-agentic-interface/discussions)

---

**Built with ❤️ by [Yuval Avidani](https://yuv.ai) - Fly High With YUV.AI**

[![YUV.AI](https://img.shields.io/badge/YUV.AI-Visit%20Website-purple?style=for-the-badge)](https://yuv.ai)
