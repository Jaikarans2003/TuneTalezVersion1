/**
 * Utility for extracting metadata for individual paragraphs
 */

import { ContentMetadata } from '@/services/openai';

// Use environment variables for API keys
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const TEXT_MODEL = 'gpt-3.5-turbo';

/**
 * Extract metadata for a single paragraph
 * @param paragraphText The paragraph text to analyze
 * @returns Promise resolving to paragraph metadata
 */
export const extractParagraphMetadata = async (paragraphText: string): Promise<ContentMetadata> => {
  try {
    // Create a system prompt for the analysis
    const systemPrompt = `
      You are an expert content analyzer that extracts emotional metadata from text.
      Analyze the provided paragraph and extract the following information:
      - mood: The primary emotional tone (e.g., suspense, happy, sad, thriller, romantic)
      - genre: The content genre (e.g., mystery, romance, adventure, sci-fi)
      - intensity: A number from 1-10 representing emotional intensity (1=calm, 10=intense)
      - tempo: The appropriate pace for narration (slow, medium, fast)
      
      Return ONLY a JSON object with these fields, no additional text.
      Example:
      {
        "mood": "suspense",
        "genre": "mystery",
        "intensity": 8,
        "tempo": "medium"
      }
    `;
    
    // Create the prompt with the paragraph
    const userPrompt = `Analyze this paragraph: ${paragraphText}`;
    
    // Use the server-side proxy endpoint instead of calling OpenAI API directly
    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    const metadataString = data.choices[0].message.content;
    
    try {
      // Parse the JSON response
      const metadata = JSON.parse(metadataString) as ContentMetadata;
      console.log('Extracted paragraph metadata:', metadata);
      return metadata;
    } catch (parseError) {
      console.error('Error parsing metadata JSON:', parseError);
      throw new Error('Failed to parse metadata from API response');
    }
  } catch (error: any) {
    console.error('Error extracting paragraph metadata:', error);
    throw error;
  }
};
