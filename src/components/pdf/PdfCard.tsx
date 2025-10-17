import React from 'react';
import Link from 'next/link';
import { PdfDocument } from '@/firebase/services';

interface PdfCardProps {
  pdf: PdfDocument;
  onDelete: (pdf: PdfDocument) => void;
}

const PdfCard: React.FC<PdfCardProps> = ({ pdf, onDelete }) => {
  return (
    <div className="bg-[#1F1F1F] rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-red-500/30 hover:shadow-xl hover:-translate-y-1 group">
      {/* PDF Icon Header */}
      <div className="relative w-full pb-[56.25%]">
        <div className="absolute top-0 left-0 h-full w-full bg-[#2D2D2D] flex items-center justify-center" style={{aspectRatio: '16/9'}}>
          <div className="text-primary text-6xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-4">
          <Link 
            href={`/view/${pdf.id}`} 
            className="w-full text-center text-white font-bold py-3 px-4 rounded-lg bg-primary hover:bg-red-700 transition-colors duration-300 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg"
          >
            View Now
          </Link>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary transition-colors duration-300" title={pdf.name || pdf.title}>
              {pdf.name || pdf.title}
            </h3>
            <p className="text-gray-400 text-sm mb-2">{pdf.description || 'No description available'}</p>
          </div>
          <button
            onClick={() => onDelete(pdf)}
            className="text-gray-400 hover:text-red-500 text-sm ml-2"
            aria-label="Delete PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfCard;