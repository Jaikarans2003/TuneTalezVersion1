import { NextResponse } from 'next/server';
import { generateAudio } from '@/services/openai';
import { generateImageFromPrompt } from '@/services/gemini';

// Configure this route for static export
export const dynamic = 'force-static';

export async function GET() {
  try {
    // Test if environment variables are loaded
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    const results = {
      openai: {
        keyAvailable: !!openaiKey,
        keyFirstChars: openaiKey ? `${openaiKey.substring(0, 5)}...` : 'Not available'
      },
      gemini: {
        keyAvailable: !!geminiKey,
        keyFirstChars: geminiKey ? `${geminiKey.substring(0, 5)}...` : 'Not available'
      }
    };
    
    return NextResponse.json({ 
      success: true, 
      message: 'API keys check completed',
      results 
    });
  } catch (error) {
    console.error('Error testing services:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error testing services', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}