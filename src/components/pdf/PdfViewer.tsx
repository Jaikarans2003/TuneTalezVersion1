import React from 'react';

interface PdfViewerProps {
  pdfUrl: string;
  fileName: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, fileName }) => {

  return (
    <div className="flex flex-col items-center">
      <div className="bg-secondary text-white p-4 rounded-t-lg w-full max-w-4xl">
        <h2 className="text-xl font-bold truncate">{fileName}</h2>
      </div>
      
      <div className="bg-white shadow-lg rounded-b-lg p-6 w-full max-w-4xl">
        <div className="flex justify-center border border-gray-200 rounded overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <iframe 
            src={pdfUrl} 
            title={fileName}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;