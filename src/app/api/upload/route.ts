import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import "@/lib/env-init";
import { getMCPClient } from "@/lib/mcp-client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `upload-${uniqueSuffix}-${file.name}`;
    const filepath = join(process.cwd(), "public", "uploads", filename);

    // Save file locally
    await writeFile(filepath, buffer);

    // Return URL
    const url = `/uploads/${filename}`;

    // Send image to MCP (with timeout to prevent hanging)
    let mcpResponse = null;
    const mcpPromise = (async () => {
      try {
        console.log("Upload API: Sending image to MCP...");
        const mcpClient = getMCPClient();
        
        // Connect to MCP if not already connected
        if (!mcpClient.isConnected()) {
          await mcpClient.connect();
        }

        // Convert buffer to base64
        const base64Image = buffer.toString("base64");
        const dataUrl = `data:${file.type};base64,${base64Image}`;

        // Get available tools to find image upload/storage tool
        const tools = mcpClient.getTools();
        console.log("Upload API: Available MCP tools:", tools.map(t => t.name));

        // Try to find an image upload or reference tool
        // Common tool names might be: upload_image, store_image, add_reference, etc.
        const uploadTool = tools.find(t => 
          t.name.toLowerCase().includes('upload') || 
          t.name.toLowerCase().includes('reference') ||
          t.name.toLowerCase().includes('image')
        );

        if (uploadTool) {
          console.log(`Upload API: Found image tool: ${uploadTool.name}`);
          
          // Attempt to call the tool with image data
          // The exact parameter structure depends on the tool schema
          const toolArgs: Record<string, any> = {};
          
          // Check for common parameter names in the tool schema
          if (uploadTool.inputSchema.properties) {
            const props = uploadTool.inputSchema.properties;
            
            // Try common parameter names
            if ('image' in props) {
              toolArgs.image = dataUrl;
            } else if ('image_data' in props) {
              toolArgs.image_data = dataUrl;
            } else if ('reference_image' in props) {
              toolArgs.reference_image = dataUrl;
            } else if ('file' in props) {
              toolArgs.file = dataUrl;
            } else if ('data' in props) {
              toolArgs.data = dataUrl;
            }
            
            // Add filename if supported
            if ('filename' in props || 'name' in props) {
              toolArgs.filename = file.name;
              toolArgs.name = file.name;
            }
          }

          if (Object.keys(toolArgs).length > 0) {
            const result = await mcpClient.callTool(uploadTool.name, toolArgs);
            console.log("Upload API: Image sent to MCP successfully");
            return result;
          } else {
            console.log("Upload API: Could not determine image parameter for tool");
            return null;
          }
        } else {
          console.log("Upload API: No image upload tool found in MCP");
          return null;
        }
      } catch (mcpError) {
        console.error("Upload API: Error sending to MCP:", mcpError);
        return null;
      }
    })();

    // Add 5 second timeout to MCP upload
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => {
        console.log("Upload API: MCP upload timed out after 5s");
        resolve(null);
      }, 5000)
    );

    // Race between MCP upload and timeout
    mcpResponse = await Promise.race([mcpPromise, timeoutPromise]);

    return NextResponse.json({ 
      url,
      mcpResponse,
      filename,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

