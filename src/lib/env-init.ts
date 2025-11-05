/**
 * Environment Variable Initialization
 * 
 * This module explicitly loads .env.local using dotenv to ensure
 * environment variables are available on Windows systems where
 * Next.js sometimes fails to load them properly.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

let initialized = false;

/**
 * Initialize environment variables by explicitly loading .env.local
 * This is called automatically when importing this module
 */
export function initializeEnv(): void {
  if (initialized) {
    return;
  }

  // Only run on server-side
  if (typeof window !== 'undefined') {
    initialized = true;
    return;
  }

  try {
    // Try to load .env.local from project root
    const envLocalPath = resolve(process.cwd(), '.env.local');
    
    console.log('[ENV-INIT] Current working directory:', process.cwd());
    console.log('[ENV-INIT] Looking for .env.local at:', envLocalPath);
    console.log('[ENV-INIT] File exists:', existsSync(envLocalPath));
    
    if (existsSync(envLocalPath)) {
      console.log('[ENV-INIT] Loading environment from:', envLocalPath);
      
      // Try with debug to see what's happening
      const result = config({ 
        path: envLocalPath, 
        override: true,
        debug: true // Enable debug mode
      });
      
      if (result.error) {
        console.error('[ENV-INIT] Error loading .env.local:', result.error);
      } else {
        const parsedKeys = Object.keys(result.parsed || {});
        console.log('[ENV-INIT] Environment variables loaded successfully');
        console.log('[ENV-INIT] Loaded keys from .env.local:', parsedKeys);
        
        // Verify they're actually in process.env
        const verifyKeys = ['GOOGLE_GENERATIVE_AI_API_KEY', 'BRIA_MCP_URL', 'BRIA_MCP_API_TOKEN'];
        verifyKeys.forEach(key => {
          const exists = !!process.env[key];
          const length = process.env[key]?.length || 0;
          console.log(`[ENV-INIT] ${key}: ${exists ? `SET (${length} chars)` : 'NOT SET'}`);
        });
        
        // If parsed is empty but we know vars should exist, manually set them
        if (parsedKeys.length === 0) {
          console.warn('[ENV-INIT] WARNING: dotenv parsed 0 variables. Trying manual fallback...');
          
          // Try manual file read and parse
          const fs = require('fs');
          let fileContent = fs.readFileSync(envLocalPath, 'utf8');
          
          // Strip BOM (Byte Order Mark) if present - this is the issue on Windows!
          if (fileContent.charCodeAt(0) === 0xFEFF) {
            console.log('[ENV-INIT] Stripping UTF-8 BOM from file');
            fileContent = fileContent.slice(1);
          }
          
          const lines = fileContent.split('\n');
          
          console.log(`[ENV-INIT] File has ${lines.length} lines`);
          
          let manualCount = 0;
          lines.forEach((line: string, index: number) => {
            const trimmed = line.trim();
            console.log(`[ENV-INIT] Line ${index + 1}: "${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}"`);
            
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
              console.log(`[ENV-INIT]   -> Skipped (comment or empty)`);
              return;
            }
            
            // Parse KEY=VALUE (handle inline comments)
            const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (match) {
              const [, key, value] = match;
              // Remove inline comments
              const cleanValue = value.split('#')[0].trim();
              if (!process.env[key]) {
                process.env[key] = cleanValue;
                manualCount++;
                console.log(`[ENV-INIT]   -> Set ${key} = ${cleanValue.substring(0, 20)}... (${cleanValue.length} chars)`);
              } else {
                console.log(`[ENV-INIT]   -> Skipped ${key} (already set)`);
              }
            } else {
              console.log(`[ENV-INIT]   -> No match for regex`);
            }
          });
          
          console.log(`[ENV-INIT] Manually loaded ${manualCount} variables`);
        }
      }
    } else {
      console.error('[ENV-INIT] .env.local file not found at:', envLocalPath);
      console.error('[ENV-INIT] Please create .env.local in the project root with your API keys');
    }

    // Also try default .env file as fallback
    const envPath = resolve(process.cwd(), '.env');
    if (existsSync(envPath)) {
      console.log('[ENV-INIT] Also loading .env file');
      config({ path: envPath, override: false }); // Don't override .env.local values
    }

    initialized = true;
  } catch (error) {
    console.error('[ENV-INIT] Failed to initialize environment variables:', error);
    initialized = true; // Mark as initialized to prevent infinite loops
  }
}

// Auto-initialize when this module is imported
initializeEnv();

/**
 * Get environment variable with validation
 */
export function getEnv(key: string): string {
  const value = process.env[key];
  
  if (!value) {
    throw new Error(
      `Environment variable ${key} is not set. Please check your .env.local file.\n` +
      `Searched in: ${resolve(process.cwd(), '.env.local')}`
    );
  }
  
  return value;
}

/**
 * Check if environment variable exists
 */
export function hasEnv(key: string): boolean {
  return !!process.env[key];
}

