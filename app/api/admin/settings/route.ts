import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = '.env.local';

interface Settings {
  openaiApiKey?: string;
}

// Helper function to check admin authentication
async function isAdminAuthenticated(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value;
  return !!adminSession;
}

// Helper function to read settings
async function getSettings(): Promise<Settings> {
  try {
    // In a production app, these would come from a database
    // For this demo, we'll read from the .env.local file
    const envPath = path.resolve(process.cwd(), ENV_FILE_PATH);
    const envContent = await fs.readFile(envPath, 'utf8');
    
    const settings: Settings = {};
    
    // Extract API key from .env content
    const openaiKeyMatch = envContent.match(/OPENAI_API_KEY=([^\s"]*)/);
    if (openaiKeyMatch && openaiKeyMatch[1]) {
      settings.openaiApiKey = openaiKeyMatch[1];
    }
    
    return settings;
  } catch (error) {
    console.error('Error reading settings:', error);
    return {};
  }
}

// Helper function to update settings
async function updateSettings(settings: Settings): Promise<void> {
  try {
    // Read current .env file
    const envPath = path.resolve(process.cwd(), ENV_FILE_PATH);
    let envContent = await fs.readFile(envPath, 'utf8');
    
    // Update the API key if provided
    if (settings.openaiApiKey) {
      if (envContent.includes('OPENAI_API_KEY=')) {
        // Replace existing key
        envContent = envContent.replace(
          /OPENAI_API_KEY=([^\s"]*)/g,
          `OPENAI_API_KEY=${settings.openaiApiKey}`
        );
      } else {
        // Add new key if it doesn't exist
        envContent += `\nOPENAI_API_KEY=${settings.openaiApiKey}`;
      }
    }
    
    // Write updated content back to file
    await fs.writeFile(envPath, envContent, 'utf8');
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

// GET endpoint to retrieve settings
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const isAdmin = await isAdminAuthenticated(request);
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const settings = await getSettings();
    
    // Mask the API key for security
    if (settings.openaiApiKey) {
      const lastFour = settings.openaiApiKey.slice(-4);
      settings.openaiApiKey = `sk-...${lastFour}`;
    }
    
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('Error getting settings:', error);
    
    return NextResponse.json(
      { message: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

// POST endpoint to update settings
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const isAdmin = await isAdminAuthenticated(request);
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // Validate input
    if (data.openaiApiKey && !data.openaiApiKey.startsWith('sk-')) {
      return NextResponse.json(
        { message: 'Invalid OpenAI API key format' },
        { status: 400 }
      );
    }
    
    // Update settings
    await updateSettings({
      openaiApiKey: data.openaiApiKey,
    });
    
    return NextResponse.json(
      { message: 'Settings updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating settings:', error);
    
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 