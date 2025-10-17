'use client';

import { useEffect, useState, Suspense } from 'react';
import { PdfDocument, getPdfs, deletePdf, BookDocument, getBooks, deleteBook } from '@/firebase/services';
import PdfCard from '@/components/pdf/PdfCard';
import BookCard from '@/components/book/BookCard';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/layout/Logo';

function HomeContent() {  
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [books, setBooks] = useState<BookDocument[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookDocument[]>([]);
  const [filteredPdfs, setFilteredPdfs] = useState<PdfDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get search query from URL
  const searchParams = useSearchParams(); 
  
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchTerm(q);
    } else {
      setSearchTerm('');
    }
  }, [searchParams]);

  const fetchPdfs = async () => {
    try {
      const pdfDocs = await getPdfs();
      setPdfs(pdfDocs);
      return true;
    } catch (err) {
      console.error('Error fetching PDFs:', err);
      return false;   
    }
  };

  const fetchBooks = async () => {
    try {
      const bookDocs = await getBooks();
      setBooks(bookDocs);
      return true;
    } catch (err) {
      console.error('Error fetching books:', err);
      return false;
    }
  };

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const [pdfsSuccess, booksSuccess] = await Promise.all([
        fetchPdfs(),
        fetchBooks()
      ]);
      
      if (!pdfsSuccess && !booksSuccess) {
        setError('Failed to load content. Please try again later.');
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter books and PDFs based on search term
  useEffect(() => {
    if (books.length > 0) {
      setFilteredBooks(
        searchTerm
          ? books.filter(book => 
              book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
              book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
            )
          : books
      );
    }
    
    if (pdfs.length > 0) {
      setFilteredPdfs(
        searchTerm
          ? pdfs.filter(pdf => 
              (pdf.name || pdf.title).toLowerCase().includes(searchTerm.toLowerCase())
            )
          : pdfs
      );
    }
  }, [searchTerm, books, pdfs]);

  useEffect(() => {
    fetchAllContent();
  }, []);

  const handleDeletePdf = async (pdf: PdfDocument) => {
    if (window.confirm(`Are you sure you want to delete ${pdf.name || pdf.title}?`)) {
      try {
        await deletePdf(pdf);
        // Refresh the list
        fetchPdfs();
      } catch (err) {
        console.error('Error deleting PDF:', err);
        setError('Failed to delete PDF. Please try again.');
      }
    }
  };

  const handleDeleteBook = async (book: BookDocument) => {
    try {
      await deleteBook(book);
      // Refresh the list
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book. Please try again.');
    }
  };

  return (
    <div className="w-full">
      {/* Main content */}
      {/* Hero Banner - directly below header with no gap */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#212121] via-[#2D2D2D] to-[#1F1F1F] text-white w-full">
        {/* Abstract background shapes */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-orange/20 rounded-full blur-3xl"></div> 
          <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-primary/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full px-4 py-20 md:py-17 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-primary/20 to-orange/20 rounded-full backdrop-blur-sm animate-fade-in">
              <span className="text-white/90 font-medium">Because Every Story Deserves a Voice</span>
            </div>
            <div className="flex items-center justify-center mb-0 animate-slide-up">
              <h1 className="text-25xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-300">
                <span className="text-primary">Tune</span>Talez
              </h1> 
            </div>
            <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-5xl mx-auto leading-relaxed animate-slide-up stagger-1">
              Discover and enjoy a world of stories at your fingertips. Read, listen, and immerse yourself in captivating narratives.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up stagger-2">
              <button 
                className="bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-primary/30 hover:scale-105 transform"
                suppressHydrationWarning
                onClick={() => {
                  document.getElementById('featured-collection')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore Content
              </button>
              <Link href="/beta-signup">
                <button 
                  className="bg-transparent border-2 border-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:bg-white/10 hover:border-white/50"
                  suppressHydrationWarning
                >
                  Join for Beta
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
          <svg className="absolute bottom-0 w-full h-24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#121212" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      
      <div className="w-full py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <>
            {/* Featured Collection - Recently Added Books */}
            <section id="featured-collection" className="mb-16 py-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in">
                <div className="mb-6 md:mb-0 animate-slide-up">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Featured Collection</span>
                  </div>
                  <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Explore Collection</span>
                  </h2>
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-2">
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {books.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">No books found</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">Our collection is growing. Check back later for exciting new titles.</p>
                  <button 
                    className="bg-primary/20 hover:bg-primary/30 text-primary-light font-medium py-2 px-6 rounded-lg transition-all duration-300 animate-slide-up stagger-3 hover:scale-105"
                    suppressHydrationWarning
                  >
                    Notify Me When Books Arrive
                  </button>
                </div>
              ) : filteredBooks.length === 0 && searchTerm ? (
                <div className="text-center py-16 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">No books match your search</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">We couldn't find any books matching "{searchTerm}". Try a different search term or browse our categories.</p>
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="bg-primary/20 hover:bg-primary/30 text-primary-light font-medium py-2 px-6 rounded-lg transition-all duration-300 animate-slide-up stagger-3 hover:scale-105"
                    suppressHydrationWarning
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                  {/* Sort books by createdAt date and display all books in rows */}
                  {filteredBooks
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .map((book, index) => (
                      <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                        <BookCard book={book} />
                      </div>
                    ))}
                </div>
              )}
            </section>
            
            {/* History Collection */}
            <section className="mb-16 py-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in">
                <div className="mb-6 md:mb-0 animate-slide-up">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">History Collection</span>
                  </div>
                  {/* <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Historical Books</span>
                  </h2> */}
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-2">
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                {filteredBooks
                  .filter(book => book.tags && book.tags.some(tag => tag.toLowerCase() === 'history'))
                  .slice(0, 10)
                  .map((book, index) => (
                    <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                      <BookCard book={book} />
                    </div>
                  ))}
              </div>
            </section>
            
            {/* Academics Collection */}
            <section className="mb-16 py-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in">
                <div className="mb-6 md:mb-0 animate-slide-up">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Academics</span>
                  </div>
                  {/* <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Academic Books</span>
                  </h2> */}
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-2">
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                {filteredBooks
                  .filter(book => book.tags && book.tags.some(tag => tag.toLowerCase() === 'academics' || tag.toLowerCase() === 'academic'))
                  .slice(0, 10)
                  .map((book, index) => (
                    <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                      <BookCard book={book} />
                    </div>
                  ))}
              </div>
            </section>
            
            {/* Romance Collection */}
            <section className="mb-16 py-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in">
                <div className="mb-6 md:mb-0 animate-slide-up">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Romance</span>
                  </div>
                  {/* <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Romance Books</span>
                  </h2> */}
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-2">
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                {filteredBooks
                  .filter(book => book.tags && book.tags.some(tag => tag.toLowerCase() === 'romance'))
                  .slice(0, 10)
                  .map((book, index) => (
                    <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                      <BookCard book={book} />
                    </div>
                  ))}
              </div>
            </section>
            
            {/* Sci-Fi Collection */}
            <section className="mb-16 py-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in">
                <div className="mb-6 md:mb-0 animate-slide-up">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Sci-Fi</span>
                  </div>
                  {/* <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Science Fiction</span>
                  </h2> */}
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-2">
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110"
                    suppressHydrationWarning
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                {filteredBooks
                  .filter(book => book.tags && book.tags.some(tag => 
                    tag.toLowerCase() === 'sci-fi' || 
                    tag.toLowerCase() === 'science fiction' || 
                    tag.toLowerCase() === 'scifi'
                  ))
                  .slice(0, 10)
                  .map((book, index) => (
                    <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                      <BookCard book={book} />
                    </div>
                  ))}
              </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-16 my-16 relative overflow-hidden">
              {/* Background elements */}
              <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange/20 rounded-full blur-3xl animate-pulse"></div>
              </div>
              
              <div className="relative z-10">
                <div className="text-center mb-12 animate-fade-in">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
                    <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Our Early Believers</span>
                    <div className="w-10 h-1 bg-gradient-to-r from-orange to-primary rounded ml-3"></div>
                  </div>
                  {/* <h2 className="text-4xl font-bold text-white animate-slide-up">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Reader Testimonials</span>
                  </h2> */}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Testimonial 1 */}
                  <div className="bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 p-6 shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 animate-fade-in stagger-1">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-orange/30 flex items-center justify-center text-white font-bold text-xl">S</div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-white">Nitish Kashyap</h3>
                        <p className="text-gray-400 text-sm">Avid Reader</p>
                      </div>
                    </div>
                    <p className="text-gray-300 italic">"TuneTalez has completely transformed how I consume books. The interface is intuitive and the selection is fantastic. I especially love the audio features!"</p>
                    <div className="mt-4 flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  
                  {/* Testimonial 2 */}
                  <div className="bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 p-6 shadow-xl hover:shadow-orange/10 transition-all duration-300 hover:-translate-y-1 animate-fade-in stagger-2">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange/30 to-primary/30 flex items-center justify-center text-white font-bold text-xl">M</div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-white">Naren Narayana</h3>
                        <p className="text-gray-400 text-sm">Book Enthusiast</p>
                      </div>
                    </div>
                    <p className="text-gray-300 italic">"The quality of content on TuneTalez is outstanding. I've discovered so many new authors and genres that I wouldn't have found otherwise. Highly recommended!"</p>
                    <div className="mt-4 flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  
                  {/* Testimonial 3 */}
                  <div className="bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 p-6 shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 animate-fade-in stagger-3">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-orange/30 flex items-center justify-center text-white font-bold text-xl">A</div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-white">Vyshnavi Kadachar</h3>
                        <p className="text-gray-400 text-sm">Student</p>
                      </div>
                    </div>
                    <p className="text-gray-300 italic">"As a student, TuneTalez has been invaluable for my research. The PDF collection is extensive and well-organized. The platform is fast and reliable, making my studies much easier."</p>
                    <div className="mt-4 flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                      
                {/* <div className="text-center mt-12 animate-fade-in stagger-4">
                  <button className="bg-transparent border-2 border-white/20 text-white font-medium py-3 px-8 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/30 hover:scale-105">
                    Read More Reviews
                  </button>
                </div> */}
              </div>
            </section>

            {/* PDFs Section - Hidden as requested */}
            {/* 
            <section className="py-16 mt-8 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 px-6 animate-slide-up">
                <div className="mb-6 md:mb-0">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-1 bg-gradient-to-r from-orange to-orange-light rounded mr-3"></div>
                    <span className="text-orange-light uppercase tracking-wider text-sm font-semibold">Digital Library</span>
                  </div>
                  <h2 className="text-4xl font-bold text-white flex items-center">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">PDF Collection</span>
                  </h2>
                </div>
                <div className="flex space-x-3 animate-fade-in stagger-1">
                  <button className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="bg-[#2A2A2A] hover:bg-[#333] p-3 rounded-full transition-all duration-300 hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {pdfs.length === 0 ? (
                <div className="text-center py-12 px-6 animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">No PDFs found</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">Our PDF collection is growing. Check back later for new documents.</p>
                  <button className="bg-orange/20 hover:bg-orange/30 text-orange-light font-medium py-2 px-6 rounded-lg transition-all duration-300 hover:scale-105 animate-slide-up stagger-3">
                    Upload a PDF
                  </button>
                </div>
              ) : filteredPdfs.length === 0 && searchTerm ? (
                <div className="text-center py-12 px-6 animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">No PDFs match your search</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">We couldn't find any PDFs matching "{searchTerm}". Try a different search term or browse our categories.</p>
                  <button onClick={() => setSearchTerm('')} className="bg-orange/20 hover:bg-orange/30 text-orange-light font-medium py-2 px-6 rounded-lg transition-all duration-300 hover:scale-105 animate-slide-up stagger-3">
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
                  {filteredPdfs.map((pdf, index) => (
                    <div key={pdf.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                      <PdfCard pdf={pdf} onDelete={handleDeletePdf} />
                    </div>
                  ))}
                </div>
              )}
            </section>
            */}
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-[#1F1F1F] rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-white">Loading content...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
