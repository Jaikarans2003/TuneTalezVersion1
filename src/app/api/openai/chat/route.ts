import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the OpenAI API key from server environment
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    // Get the response from OpenAI API
    const data = await response.json();

    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in OpenAI chat proxy:', error);
    return NextResponse.json({ 
      error: 'Error processing request',
      message: (error as Error).message 
    }, { status: 500 });
  }
}