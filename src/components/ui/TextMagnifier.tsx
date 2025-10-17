'use client';

import { useState, useEffect } from 'react';

interface TextMagnifierProps {
  defaultFontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
  step?: number;
}

const TextMagnifier = ({
  defaultFontSize = 16,
  minFontSize = 12,
  maxFontSize = 32,
  step = 2
}: TextMagnifierProps) => {
  const [fontSize, setFontSize] = useState(defaultFontSize);

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + step, maxFontSize));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - step, minFontSize));
  };

  const resetFontSize = () => {
    setFontSize(defaultFontSize);
  };

  // Apply the font size to all elements with class 'prose' whenever fontSize changes
  useEffect(() => {
    const proseElements = document.querySelectorAll('.prose');
    proseElements.forEach(element => {
      (element as HTMLElement).style.fontSize = `${fontSize}px`;
    });
    
    // Save the current font size to localStorage
    localStorage.setItem('tunetalez-font-size', fontSize.toString());
  }, [fontSize]);
  
  // Load saved font size from localStorage on component mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('tunetalez-font-size');
    if (savedFontSize) {
      const parsedSize = parseInt(savedFontSize, 10);
      if (!isNaN(parsedSize) && parsedSize >= minFontSize && parsedSize <= maxFontSize) {
        setFontSize(parsedSize);
      }
    }
  }, [minFontSize, maxFontSize]);

  return (
    <div className="flex items-center gap-2 bg-[#2a2a2a] p-2 rounded-lg">
      <button
        onClick={decreaseFontSize}
        disabled={fontSize <= minFontSize}
        className="w-8 h-8 flex items-center justify-center bg-[#333333] hover:bg-primary disabled:opacity-50 disabled:hover:bg-[#333333] text-white rounded-md transition-colors"
        title="Decrease text size"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={resetFontSize}
        className="text-xs bg-[#333333] hover:bg-primary text-white px-2 py-1 rounded-md transition-colors"
        title="Reset text size"
      >
        {fontSize}px
      </button>
      
      <button
        onClick={increaseFontSize}
        disabled={fontSize >= maxFontSize}
        className="w-8 h-8 flex items-center justify-center bg-[#333333] hover:bg-primary disabled:opacity-50 disabled:hover:bg-[#333333] text-white rounded-md transition-colors"
        title="Increase text size"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default TextMagnifier;