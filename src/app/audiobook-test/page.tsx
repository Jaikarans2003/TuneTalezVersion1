'use client';

import { useState } from 'react';
import AudiobookProduction from '@/components/audiobook/AudiobookProduction';

export default function AudiobookTestPage() {
  const [text, setText] = useState<string>('');
  const [bookId, setBookId] = useState<string>(`test_${Date.now()}`);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  
  // Sample texts for testing
  const sampleTexts = [
    {
      title: "Happy Story",
      text: "It was a beautiful sunny day. The birds were singing and children were playing in the park. Everyone was smiling and enjoying the perfect weather.\n\nA small puppy ran around, wagging its tail excitedly. It jumped into a pile of colorful autumn leaves, making the children laugh with delight.\n\nAt the ice cream stand, a kind vendor was giving free cones to everyone. The sweet taste of vanilla and chocolate brought joy to all who visited the park that day."
    },
    {
      title: "Suspenseful Mystery",
      text: "The old mansion stood silent on the hill, its windows like dark eyes watching the town below. Nobody had entered it for decades, they said.\n\nSarah approached the rusty gate, her heart pounding in her chest. The key she had found in her grandmother's attic felt heavy in her pocket.\n\nAs she pushed open the creaking door, a cold draft brushed against her face. Something moved in the shadows at the end of the hallway. Was she truly alone in this forgotten place?"
    },
    {
      title: "Mixed Emotions",
      text: "The graduation ceremony was bittersweet. After years of hard work, Maria felt proud of her accomplishments, yet anxious about the uncertain future ahead.\n\nAs she walked across the stage to receive her diploma, she remembered the challenges she had overcome. The late nights studying, the failed tests, and the moments of doubt.\n\nSuddenly, a thunderstorm broke out. People rushed for cover, screaming and pushing. In the chaos, Maria lost sight of her family. Fear gripped her heart as lightning illuminated the panicked crowd.\n\nHours later, reunited with her loved ones at home, they celebrated with cake and laughter. The storm had passed, both literally and metaphorically. Tomorrow would bring new adventures."
    }
  ];
  
  const handleSampleSelect = (sample: typeof sampleTexts[0]) => {
    setText(sample.text);
  };
  
  const handleSuccess = (audioUrl: string) => {
    setGeneratedAudioUrl(audioUrl);
    console.log('Audiobook generated successfully:', audioUrl);
  };
  
  const handleError = (error: Error) => {
    console.error('Error generating audiobook:', error);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      <div className="container mx-auto max-w-4xl bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-3xl font-bold text-center text-[#5A3E85] mb-6">
          Audiobook Production Test
        </h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Sample Texts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleTexts.map((sample, index) => (
              <button
                key={index}
                onClick={() => handleSampleSelect(sample)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <h3 className="font-medium text-[#5A3E85]">{sample.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                  {sample.text.substring(0, 100)}...
                </p>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Text Input</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text for audiobook production..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A3E85] focus:border-transparent"
          />
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Book ID (optional)</h2>
          <input
            type="text"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            placeholder="Enter book ID..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A3E85] focus:border-transparent"
          />
        </div>
        
        <div className="flex justify-center mb-6">
          <AudiobookProduction
            text={text}
            bookId={bookId}
            onSuccess={handleSuccess}
            onError={handleError}
            className="px-6 py-3 text-lg"
          />
        </div>
        
        {generatedAudioUrl && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Generated Audiobook</h2>
            <p className="mb-2 text-sm text-gray-600">
              Your audiobook has been generated and uploaded successfully. You can listen to it below:
            </p>
            <div className="mt-2">
              <audio 
                controls 
                src={generatedAudioUrl} 
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}