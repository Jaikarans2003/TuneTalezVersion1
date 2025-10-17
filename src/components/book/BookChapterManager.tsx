'use client';

import { useState, useEffect } from 'react';
import { BookDocument, Chapter, getBookById, addChapter, updateChapter, deleteChapter, reorderChapters } from '@/firebase/services';
import ChapterEditor from './ChapterEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface BookChapterManagerProps {
  bookId: string;
  onSuccess?: () => void;
}

const BookChapterManager = ({ bookId, onSuccess }: BookChapterManagerProps) => {
  const [book, setBook] = useState<BookDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapter, setNewChapter] = useState<Partial<Chapter>>({
    title: '',
    content: '',
    order: 0
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        const bookData = await getBookById(bookId);
        
        if (!bookData) {
          setError('Book not found');
          return;
        }
        
        setBook(bookData);
        // Sort chapters by order
        const sortedChapters = [...(bookData.chapters || [])].sort((a, b) => a.order - b.order);
        setChapters(sortedChapters);
      } catch (err: any) {
        console.error('Error fetching book:', err);
        setError(`Failed to load book: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
  }, [bookId]);

  // Handle adding a new chapter
  const handleAddChapter = async () => {
    if (!bookId || !newChapter.title || !newChapter.content) {
      setError('Episode title and content are required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Add the new chapter
      const addedChapter = await addChapter(bookId, {
        title: newChapter.title,
        content: newChapter.content,
        order: chapters.length // Add to the end
      });
      
      // Update local state
      setChapters([...chapters, addedChapter]);
      setIsAddingChapter(false);
      setNewChapter({ title: '', content: '', order: 0 });
      setSuccessMessage('Episode added successfully!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error adding chapter:', err);
      setError(`Failed to add episode: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle updating a chapter
  const handleUpdateChapter = async (index: number) => {
    const chapter = chapters[index];
    if (!bookId || !chapter || !chapter.id) {
      setError('Invalid episode data');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Update the chapter
      const updatedChapter = await updateChapter(bookId, chapter.id, {
        title: chapter.title,
        content: chapter.content
      });
      
      // Update local state
      const updatedChapters = [...chapters];
      updatedChapters[index] = updatedChapter;
      setChapters(updatedChapters);
      
      setSuccessMessage('Episode updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error updating chapter:', err);
      setError(`Failed to update episode: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting a chapter
  const handleDeleteChapter = async (index: number) => {
    const chapter = chapters[index];
    if (!bookId || !chapter || !chapter.id) {
      setError('Invalid episode data');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete the episode "${chapter.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Delete the chapter
      await deleteChapter(bookId, chapter.id);
      
      // Update local state
      const updatedChapters = chapters.filter((_, i) => i !== index);
      // Update order property for all chapters
      const reorderedChapters = updatedChapters.map((ch, idx) => ({
        ...ch,
        order: idx
      }));
      
      setChapters(reorderedChapters);
      setSuccessMessage('Episode deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error deleting chapter:', err);
      setError(`Failed to delete episode: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle reordering chapters
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !bookId) return; // Dropped outside the list
    
    try {
      setSaving(true);
      
      const items = Array.from(chapters);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update order property for all chapters
      const reorderedChapters = items.map((chapter, idx) => ({
        ...chapter,
        order: idx
      }));
      
      // Update local state first for immediate feedback
      setChapters(reorderedChapters);
      
      // Get array of chapter IDs in new order
      const chapterIds = reorderedChapters.map(chapter => chapter.id || '');
      
      // Update in Firestore
      await reorderChapters(bookId, chapterIds);
      
      setSuccessMessage('Episodes reordered successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error reordering chapters:', err);
      setError(`Failed to reorder episodes: ${err.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-[#1F1F1F] rounded-lg shadow-md text-white">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-[#1F1F1F] rounded-lg shadow-md text-white">
        <div className="p-4 bg-red-900 border border-red-700 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-[#1F1F1F] rounded-lg shadow-md text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Episodes: {book?.title}</h2>
        <button
          onClick={() => setIsAddingChapter(!isAddingChapter)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          disabled={saving}
        >
          {isAddingChapter ? 'Cancel' : 'Add New Episode'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 text-white rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900 border border-green-700 text-white rounded">
          {successMessage}
        </div>
      )}
      
      {/* Add New Chapter Form */}
      {isAddingChapter && (
        <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-[#222222]">
          <h3 className="text-xl font-bold mb-4">Add New Episode</h3>
          <ChapterEditor
            chapter={newChapter}
            onChange={setNewChapter}
            isNew={true}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAddChapter}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={saving || !newChapter.title || !newChapter.content}
            >
              {saving ? 'Adding...' : 'Add Episode'}
            </button>
          </div>
        </div>
      )}
      
      {/* Chapters List */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">Current Episodes</h3>
        
        {chapters.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center">
            <p className="text-gray-400">No episodes yet. Click "Add New Episode" to create your first episode.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="chapters">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {chapters.map((chapter, index) => (
                    <Draggable key={chapter.id} draggableId={chapter.id || `temp_${index}`} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="flex items-start">
                            <div 
                              {...provided.dragHandleProps} 
                              className="p-2 mr-2 mt-4 cursor-move bg-[#333333] rounded flex items-center justify-center"
                              title="Drag to reorder"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                              </svg>
                            </div>
                            <div className="flex-grow">
                              <ChapterEditor
                                chapter={chapter}
                                onChange={(updatedChapter) => {
                                  const updatedChapters = [...chapters];
                                  updatedChapters[index] = { ...chapter, ...updatedChapter };
                                  setChapters(updatedChapters);
                                }}
                                onDelete={() => handleDeleteChapter(index)}
                              />
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() => handleUpdateChapter(index)}
                                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                  disabled={saving}
                                >
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default BookChapterManager;
