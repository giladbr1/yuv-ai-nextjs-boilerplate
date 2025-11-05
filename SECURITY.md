# Security & Environment Variables

## Overview

This project follows security best practices for handling API keys and sensitive credentials.

## Environment Variables

### Required Variables

The following environment variables must be configured in `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here
BRIA_MCP_URL=https://mcp.prod.bria-api.com/mcp
BRIA_MCP_API_TOKEN=your_bria_api_token_here
```

### Setup Instructions

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API keys** to `.env.local`

3. **Never commit** `.env.local` to version control (already in `.gitignore`)

## Security Measures Implemented

### ✅ Environment Variable Security

- **No hardcoded keys**: All API keys are loaded from environment variables
- **`.env.local` in `.gitignore`**: Prevents accidental commits
- **`.env.example` template**: Provides structure without sensitive data
- **Runtime validation**: Code throws clear errors if keys are missing

### ✅ Code Changes

1. **`src/lib/env.ts`**
   - Removed hardcoded API keys
   - Now only provides utility functions
   - Throws descriptive errors for missing keys

2. **`next.config.ts`**
   - Removed hardcoded environment variables
   - Next.js automatically loads from `.env.local`

3. **`src/lib/gemini-agent.ts`**
   - Simplified to read directly from `process.env`
   - No fallback to hardcoded values

4. **`src/lib/mcp-client.ts`**
   - Uses secure `getEnv()` helper
   - Throws errors if credentials missing

### ✅ Git Configuration

The following files are properly ignored:

```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## Best Practices

### ❌ Don't Do This

```typescript
// NEVER hardcode API keys
const API_KEY = "AIzaSyDlF9DPrN9JKLzhjt66VwwDe7w4Z9xPKFs";

// NEVER commit .env.local
git add .env.local  // DON'T!
```

### ✅ Do This Instead

```typescript
// Load from environment
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error("API key not configured");
}
```

## Getting API Keys

### Google Generative AI (Gemini)

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to your `.env.local`

### Bria MCP

1. Access your Bria dashboard
2. Navigate to API settings
3. Generate or copy your API token
4. Add to `.env.local`

## Deployment

### Vercel / Netlify / Cloud Platforms

1. **Never commit `.env.local`**
2. Add environment variables through the platform's dashboard:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
3. Redeploy after adding variables

### Docker

Use environment variables or secrets:

```dockerfile
ENV GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
ENV BRIA_MCP_URL=${BRIA_MCP_URL}
ENV BRIA_MCP_API_TOKEN=${BRIA_MCP_API_TOKEN}
```

## Troubleshooting

### "Environment variable not set" Error (Windows Fix)

**Problem**: On Windows, Next.js sometimes fails to load `.env.local` properly in server-side code.

**Solution Implemented**: 
- We use the `dotenv` package to explicitly load `.env.local`
- `src/lib/env-init.ts` handles this automatically
- All services import this module first

**If still having issues**:
1. Check `.env.local` exists in project root (not in `src/` folder)
2. Verify variable names match exactly (case-sensitive)
3. Restart the development server after changes
4. Check for typos or extra spaces
5. Verify the file path is correct: `C:\...\project-root\.env.local`
6. Check the terminal logs - you should see: "Loading environment from: ..." and "Environment variables loaded successfully"

### API Key Not Working

1. Verify the key is active in the provider's dashboard
2. Check for leading/trailing spaces in `.env.local`
3. Ensure no quotes around the value
4. Test the key with a simple curl request

## Audit Checklist

Before committing code:

- [ ] No hardcoded API keys in source files
- [ ] `.env.local` not in git staging
- [ ] `.env.example` updated if new variables added
- [ ] README.md documents required variables
- [ ] Code throws clear errors for missing variables

## Reporting Security Issues

If you discover a security vulnerability, please email: security@example.com

**Do not** create public GitHub issues for security vulnerabilities.

