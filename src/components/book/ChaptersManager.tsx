'use client';

import { useState, useEffect } from 'react';
import { Chapter } from '@/firebase/services';
import ChapterEditor from './ChapterEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ChaptersManagerProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
  bookId?: string; // Optional bookId for new chapters
}

const ChaptersManager = ({ chapters = [], onChange, bookId }: ChaptersManagerProps) => {
  const [localChapters, setLocalChapters] = useState<Chapter[]>(chapters);

  // Update local chapters when props change
  useEffect(() => {
    setLocalChapters(chapters);
  }, [chapters]);

  // Add a new chapter
  const addChapter = () => {
    const newChapter: Chapter = {
      id: `temp_${Date.now()}`, // Temporary ID until saved
      bookId: bookId, // Set bookId if available
      title: '',
      content: '',
      order: localChapters.length,
      createdAt: Date.now(),
      audioUrl: '' // Initialize audioUrl to prevent undefined value
    };
    
    const updatedChapters = [...localChapters, newChapter];
    setLocalChapters(updatedChapters);
    onChange(updatedChapters);
  };

  // Update a chapter
  const updateChapter = (index: number, updatedChapter: Partial<Chapter>) => {
    const newChapters = [...localChapters];
    newChapters[index] = { ...newChapters[index], ...updatedChapter };
    setLocalChapters(newChapters);
    onChange(newChapters);
  };

  // Delete a chapter
  const deleteChapter = (index: number) => {
    const newChapters = localChapters.filter((_, i) => i !== index);
    // Update order property for all chapters
    const updatedChapters = newChapters.map((chapter, idx) => ({
      ...chapter,
      order: idx
    }));
    setLocalChapters(updatedChapters);
    onChange(updatedChapters);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return; // Dropped outside the list

    const items = Array.from(localChapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property for all chapters
    const updatedChapters = items.map((chapter, idx) => ({
      ...chapter,
      order: idx
    }));
    
    setLocalChapters(updatedChapters);
    onChange(updatedChapters);
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Episodes</h2>
        <button
          onClick={addChapter}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Add Episode
        </button>
      </div>

      {localChapters.length === 0 ? (
        <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center">
          <p className="text-gray-400">No episodes yet. Click "Add Episode" to create your first episode.</p>
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
                {localChapters.map((chapter, index) => (
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
                              onChange={(updatedChapter) => updateChapter(index, updatedChapter)}
                              onDelete={() => deleteChapter(index)}
                              episodeNumber={index + 1}
                              useEnhancedNarration={true}
                            />
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
  );
};

export default ChaptersManager;
