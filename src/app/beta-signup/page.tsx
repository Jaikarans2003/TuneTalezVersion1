'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaStar } from 'react-icons/fa';
import { saveBetaSignup } from '@/firebase/betaSignupService';

export default function BetaSignup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    rating: 0,
    remarks: ''
  });
  
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const result = await saveBetaSignup(formData);
      
      if (result.success) {
        setSubmitted(true);
      } else {
        setError('Failed to submit your information. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md p-8 bg-[#1E1E1E] rounded-xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <Image 
                src="/logos/2.png" 
                alt="TuneTalez Logo" 
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-6">
            <span className="text-primary">Tune</span>Talez
          </h1>
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
            <p className="mb-6">Your beta signup has been received. We'll be in touch soon!</p>
            <Link href="/" className="inline-block bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-primary/30 hover:scale-105">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 bg-[#1E1E1E] rounded-xl shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <Image 
              src="/logos/1.png" 
              alt="TuneTalez Logo" 
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">
          <span className="text-primary">Tune</span>Talez
        </h1>
        <h2 className="text-xl text-white text-center mb-8">Join Our Beta Program</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white"
              placeholder="Your name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white"
              placeholder="your.email@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white"
              placeholder="Your phone number (optional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">How would you rate TuneTalez so far?</label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <FaStar 
                    className={`text-2xl ${
                      star <= (hoverRating || formData.rating) 
                        ? 'text-yellow-400' 
                        : 'text-gray-600'
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-300 mb-1">Any Remarks</label>
            <textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white"
              placeholder="Share your thoughts about TuneTalez..."
            />
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-primary/30 hover:scale-105'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-white rounded-lg">
              {error}
            </div>
          )}
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-primary hover:text-primary-light text-sm">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}