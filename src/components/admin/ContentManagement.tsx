'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { BookDocument, PdfDocument, deleteBook, deletePdf } from '@/firebase/services';
import { Tab } from '@headlessui/react';
import AdminBookForm from './AdminBookForm';
import Link from 'next/link';

export default function ContentManagement() {
  const router = useRouter();
  const [books, setBooks] = useState<BookDocument[]>([]);
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBook, setEditingBook] = useState<BookDocument | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      try {
        // Fetch books
        const booksQuery = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
        const booksSnapshot = await getDocs(booksQuery);
        const booksList = booksSnapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as BookDocument));
        
        // Fetch PDFs
        const pdfsQuery = query(collection(db, 'pdfs'), orderBy('createdAt', 'desc'));
        const pdfsSnapshot = await getDocs(pdfsQuery);
        const pdfsList = pdfsSnapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as PdfDocument));
        
        setBooks(booksList);
        setPdfs(pdfsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching content:', error);
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  const handleDeleteBook = async (book: BookDocument) => {
    if (window.confirm(`Are you sure you want to delete the book "${book.title}"?`)) {
      try {
        await deleteBook(book);
        setBooks(prevBooks => prevBooks.filter(b => b.id !== book.id));
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };
  
  const handleEditBook = (book: BookDocument) => {
    // Navigate to the dedicated edit page for this book
    router.push(`/admin/edit/${book.id}`);
  };
  
  const handleBookFormSuccess = () => {
    // Refresh the books list
    async function fetchBooks() {
      try {
        const booksQuery = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
        const booksSnapshot = await getDocs(booksQuery);
        const booksList = booksSnapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as BookDocument));
        
        setBooks(booksList);
      } catch (error) {
        console.error('Error fetching books:', error);
      }
    }
    
    fetchBooks();
    setShowBookForm(false);
    setEditingBook(null);
  };

  const handleDeletePdf = async (pdf: PdfDocument) => {
    if (window.confirm(`Are you sure you want to delete the PDF "${pdf.name || pdf.title}"?`)) {
      try {
        await deletePdf(pdf);
        setPdfs(prevPdfs => prevPdfs.filter(p => p.id !== pdf.id));
      } catch (error) {
        console.error('Error deleting PDF:', error);
      }
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPdfs = pdfs.filter(pdf => 
    (pdf.name || pdf.title).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF0000]"></div>
      </div>
    );
  }

  return (
    <div>
      {showBookForm ? (
        <div>
          <button 
            onClick={() => setShowBookForm(false)}
            className="mb-4 px-3 py-1 bg-black text-white border border-[#FF0000] rounded-md hover:bg-[#1F1F1F] transition-colors"
          >
            ← Back to Content Management
          </button>
          <AdminBookForm 
            onSuccess={handleBookFormSuccess}
            existingBook={editingBook || undefined}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#FF0000]">Content Management</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setEditingBook(null);
                  setShowBookForm(true);
                }}
                className="px-4 py-2 bg-[#FF0000] text-white rounded hover:bg-[#CC0000] transition-colors"
              >
                Create New Book
              </button>
              <Link
                href="/admin/fix-audio-urls"
                className="px-4 py-2 bg-black text-[#FF0000] border border-[#FF0000] rounded hover:bg-[#1F1F1F] transition-colors"
              >
                Fix Audio URLs
              </Link>
              <Link
                href="/admin/test-audio"
                className="px-4 py-2 bg-black text-[#FF0000] border border-[#FF0000] rounded hover:bg-[#1F1F1F] transition-colors"
              >
                Test Audio
              </Link>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search content..."
                  className="px-4 py-2 border border-[#333333] rounded-lg bg-[#1F1F1F] text-white focus:outline-none focus:ring-2 focus:ring-[#FF0000]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-black border border-[#333333] p-1 mb-4">
              <Tab
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                  ${selected 
                    ? 'bg-[#1F1F1F] shadow text-[#FF0000] border border-[#FF0000]' 
                    : 'text-white hover:bg-[#1F1F1F] hover:text-[#FF0000]'
                  }`
                }
              >
                Books ({books.length})
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                  ${selected 
                    ? 'bg-[#1F1F1F] shadow text-[#FF0000] border border-[#FF0000]' 
                    : 'text-white hover:bg-[#1F1F1F] hover:text-[#FF0000]'
                  }`
                }
              >
                PDFs ({pdfs.length})
              </Tab>
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-[#1F1F1F] rounded-lg overflow-hidden border border-[#333333]">
                    <thead className="bg-black">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Episodes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredBooks.map((book) => (
                        <tr key={book.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {book.thumbnailUrl ? (
                                <img className="h-10 w-10 object-cover rounded mr-3" src={book.thumbnailUrl} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-black flex items-center justify-center mr-3">
                                  <span className="text-[#FF0000] text-sm">📚</span>
                                </div>
                              )}
                              <div className="font-medium text-white">{book.title}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">
                            {book.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-black text-[#FF0000] border border-[#FF0000] rounded-full text-xs">
                              {book.chapters?.length || 0} episodes
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">
                            {new Date(book.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-3">
                            <button
                              onClick={() => handleEditBook(book)}
                              className="text-[#FF0000] hover:text-white"
                            >
                              Edit
                            </button>
                            <Link
                              href={`/admin/manage-episodes/${book.id}`}
                              className="text-[#FF0000] hover:text-white"
                            >
                              Episodes
                            </Link>
                            <button
                              onClick={() => handleDeleteBook(book)}
                              className="text-[#FF0000] hover:text-white"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tab.Panel>
              <Tab.Panel>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-[#1F1F1F] rounded-lg overflow-hidden border border-[#333333]">
                    <thead className="bg-black">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">PDF Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#FF0000] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredPdfs.map((pdf) => (
                        <tr key={pdf.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded bg-black flex items-center justify-center mr-3">
                                <span className="text-[#FF0000] text-sm">📄</span>
                              </div>
                              <div className="font-medium text-white">{pdf.name || pdf.title}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">
                            {new Date(pdf.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDeletePdf(pdf)}
                              className="text-[#FF0000] hover:text-white"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </>
      )}
    </div>
  );
}
