import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold text-primary">TuneTalez</h3>
            <p className="text-sm mt-1">Write books and upload PDF files with ease</p>
          </div>
          <div className="text-sm">
            <p>&copy; {new Date().getFullYear()} TuneTalez. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;