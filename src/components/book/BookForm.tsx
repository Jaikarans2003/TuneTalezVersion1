'use client';

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { uploadBookThumbnail, createBook, Chapter, BookDocument } from '@/firebase/services';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import ChaptersManager from './ChaptersManager';
import EnhancedAudioNarrationButton from './EnhancedAudioNarrationButton';
import { generateImageFromPrompt, generateConciseSummary, dataUrlToFile, rewriteAsStory } from '@/services/gemini';

interface BookFormProps {
  onSuccess?: () => void;
}

// Tiptap MenuBar component
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const [isRewriting, setIsRewriting] = useState(false);

  // Handler for "Write with AI" button
  const handleWriteWithAI = async () => {
    try {
      if (!editor) return;
      
      // Get current content
      const content = editor.getHTML();
      
      if (!content.trim()) {
        alert("Please add some content before using AI rewrite");
        return;
      }

      // Show loading state
      setIsRewriting(true);
      editor.setEditable(false);
      
      // Call the Gemini API to rewrite the content
      const rewrittenContent = await rewriteAsStory(content);
      
      // Update the editor with the rewritten content
      editor.commands.setContent(rewrittenContent);
      
      // Re-enable editing
      editor.setEditable(true);
    } catch (error) {
      console.error('Error rewriting with AI:', error);
      alert('Failed to rewrite content. Please try again.');
    } finally {
      setIsRewriting(false);
      editor.setEditable(true);
    }
  };

  return (
    <div className="border-b border-gray-600 p-1 flex flex-wrap gap-1 bg-[#333333]">
      <button
        type="button"
        onClick={handleWriteWithAI}
        disabled={isRewriting}
        className={`px-2 py-1 rounded ${isRewriting ? 'bg-purple-800 opacity-70' : 'bg-purple-700 hover:bg-purple-600'} text-white mr-2`}
        title="Rewrite content as a story using AI"
      >
        {isRewriting ? 'Rewriting...' : 'Write with AI'}
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`p-1 rounded ${editor.isActive('paragraph') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Paragraph"
      >
        P
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1 rounded ${editor.isActive('underline') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Underline"
      >
        <u>U</u>
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align left"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align center"
      >
        ↔
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align right"
      >
        →
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Bullet list"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Numbered list"
      >
        1. List
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="p-1 rounded bg-[#444444] hover:bg-gray-600"
        title="Clear formatting"
      >
        Clear
      </button>
    </div>
  );
}

const BookForm = ({ onSuccess }: BookFormProps) => {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<string>('');
  const [conciseSummary, setConciseSummary] = useState<string>('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [author, setAuthor] = useState('');
  const [authorError, setAuthorError] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [tagsError, setTagsError] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersError, setChaptersError] = useState<string>('');
  const [publishMode, setPublishMode] = useState<'single' | 'episodes'>('single');
  const [bookId, setBookId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Handle thumbnail selection
  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.includes('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setThumbnail(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setThumbnailPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Generate concise summary with AI
  const handleGenerateConciseSummary = async () => {
    if (!description.trim()) {
      setDescriptionError('Description is required to generate a concise summary');
      setError('Please enter a book description first');
      return;
    }
    
    try {
      setGeneratingSummary(true);
      setError(null);
      
      // Generate concise summary using Gemini API
      const summary = await generateConciseSummary(description);
      
      // Set the concise summary
      setConciseSummary(summary);
      
    } catch (err: any) {
      console.error('Error generating concise summary:', err);
      setError(`Failed to generate summary: ${err.message || 'Please try again.'}`);
    } finally {
      setGeneratingSummary(false);
    }
  };
  
  // Generate thumbnail with AI
  const [generatingImage, setGeneratingImage] = useState(false);
  
  const handleGenerateAIThumbnail = async () => {
    if (!conciseSummary.trim()) {
      setError('Please generate a concise summary first');
      return;
    }
    
    try {
      setGeneratingImage(true);
      setError(null);
      
      // Generate image using Gemini API with the concise summary as prompt
      const imageDataUrl = await generateImageFromPrompt(conciseSummary);
      
      // Convert data URL to File object
      const file = dataUrlToFile(imageDataUrl, `ai-generated-${Date.now()}.png`);
      
      // Set as thumbnail
      setThumbnail(file);
      setThumbnailPreview(imageDataUrl);
      
    } catch (err: any) {
      console.error('Error generating AI image:', err);
      setError(`Failed to generate image: ${err.message || 'Please try again.'}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Write your book description here...',
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4 text-white',
        dir: 'ltr',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      
      if (publishMode === 'single' && !html.trim()) {
        setContentError('Content is required for single-chapter books');
      } else {
        setContentError('');
      }
    },
    // Fix SSR hydration issues
    immediatelyRender: false,
  });
  
  // Set editor loaded state when editor is ready
  useEffect(() => {
    if (editor) {
      setEditorLoaded(true);
    }
  }, [editor]);
  
  // Disable/enable editor when uploading status changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!uploading);
    }
  }, [uploading, editor]);

  // Handle chapters change
  const handleChaptersChange = (updatedChapters: Chapter[]) => {
    setChapters(updatedChapters);
    
    if (publishMode === 'episodes' && updatedChapters.length === 0) {
      setChaptersError('At least one episode is required');
    } else {
      setChaptersError('');
    }
  };

  // Handle publish mode change
  const handlePublishModeChange = (mode: 'single' | 'episodes') => {
    setPublishMode(mode);
    
    // Reset validation errors based on new mode
    if (mode === 'single') {
      setChaptersError('');
      if (!content.trim()) {
        setContentError('Content is required for single-chapter books');
      }
    } else {
      setContentError('');
      if (chapters.length === 0) {
        setChaptersError('At least one episode is required');
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!title.trim()) {
      setTitleError('Title is required');
      setError('Please enter a book title');
      return;
    } else {
      setTitleError('');
    }
    
    if (!author.trim()) {
      setAuthorError('Author is required');
      setError('Please enter an author name');
      return;
    } else {
      setAuthorError('');
    }
    
    if (!description.trim()) {
      setDescriptionError('Book description is required');
      setError('Please enter a book description/summary');
      return;
    } else {
      setDescriptionError('');
    }
    
    if (publishMode === 'single' && !content.trim()) {
      setContentError('Content is required');
      setError('Please enter book content');
      return;
    } else {
      setContentError('');
    }

    if (publishMode === 'episodes' && chapters.length === 0) {
      setChaptersError('At least one episode is required');
      setError('Please add at least one episode');
      return;
    } else {
      setChaptersError('');
    }
    
    if (!tagsInput.trim()) {
      setTagsError('At least one tag is required');
      setError('Please add at least one tag');
      return;
    } else {
      setTagsError('');
    }
    
    if (!thumbnail) {
      setError('Please upload a thumbnail image');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Upload thumbnail first
      const thumbnailUrl = await uploadBookThumbnail(thumbnail, (progress) => {
        setUploadProgress(progress);
      });
      
      // Process tags (split by commas and trim)
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Prepare chapters data
      let finalChapters: Chapter[] = [];
      
      if (publishMode === 'single') {
        // For single mode, create one chapter with the main content
        finalChapters = [{
          id: `chapter_${Date.now()}`,
          title: 'Main Content',
          content: content.trim(),
          order: 0,
          createdAt: Date.now()
        }];
      } else {
        // For episodes mode, use the chapters from state
        // Filter out any invalid chapters
        finalChapters = chapters
          .filter(chapter => chapter.title && chapter.content)
          .map((chapter, index) => ({
            ...chapter,
            order: index,
            audioUrl: chapter.audioUrl || '' // Ensure audioUrl is never undefined
          }));
      }
      
      // Create book document
      const bookData: Omit<BookDocument, 'id' | 'createdAt' | 'lastUpdated'> = {
        title: title.trim(),
        content: publishMode === 'single' ? content.trim() : '', // Only use content for single mode
        description: description.trim(), // Book summary/description
        author: author.trim(),
        tags,
        thumbnailUrl,
        chapters: finalChapters,
        audioUrl: audioUrl || '' // Ensure audioUrl is never undefined
      };
      
      const result = await createBook(bookData);
      
      console.log('Book created successfully:', result);
      
      // Store the book ID for audio narration
      if (result.id) {
        setBookId(result.id);
      }
      
      // Reset form
      setTitle('');
      setContent('');
      setDescription('');
      setAuthor('');
      setTagsInput('');
      setThumbnail(null);
      setThumbnailPreview(null);
      setUploadProgress(0);
      setChapters([]);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err: any) {
      console.error('Error creating book:', err);
      setError(`Failed to create book: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-[#1F1F1F] rounded-lg shadow-md text-white">
      <h2 className="text-2xl font-bold mb-6">Write a New Book</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 text-white rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Book Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
            placeholder="Enter book title"
            disabled={uploading}
            required
          />
          {titleError && <p className="text-red-500 text-sm mt-1">{titleError}</p>}
        </div>
        
        {/* Author */}
        <div className="mb-4">
          <label htmlFor="author" className="block text-sm font-medium text-gray-300 mb-1">
            Author Name *
          </label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
            placeholder="Enter author name"
            disabled={uploading}
            required
          />
          {authorError && <p className="text-red-500 text-sm mt-1">{authorError}</p>}
        </div>
        
        {/* Description */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Book Description/Summary *
            </label>
            <button
              type="button"
              onClick={handleGenerateConciseSummary}
              className="px-3 py-1 text-sm bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C]"
              disabled={uploading || generatingSummary || !description.trim()}
              title={!description.trim() ? "Enter a description first" : "Generate a concise summary for AI image generation"}
            >
              {generatingSummary ? (
                <>
                  <span className="inline-block animate-spin mr-1">⟳</span>
                  Summarizing...
                </>
              ) : (
                <>Concise Summary</>
              )}
            </button>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              // Clear concise summary when description changes
              if (conciseSummary) {
                setConciseSummary('');
              }
            }}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
            placeholder="Enter a summary or description of your book"
            rows={4}
            disabled={uploading || generatingSummary}
            required
          />
          {descriptionError && <p className="text-red-500 text-sm mt-1">{descriptionError}</p>}
          
          {/* Concise Summary Display */}
          {conciseSummary && (
            <div className="mt-2 p-3 bg-[#2a2a2a] border border-[#5A3E85] rounded-md">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-[#9D7BC5]">Concise Summary (for AI generation):</span>
              </div>
              <p className="text-sm text-white">{conciseSummary}</p>
            </div>
          )}
        </div>
        
        {/* Tags */}
        <div className="mb-4">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
            Tags (comma separated) *
          </label>
          <input
            type="text"
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
            placeholder="fiction, fantasy, adventure"
            disabled={uploading}
            required
          />
          {tagsError && <p className="text-red-500 text-sm mt-1">{tagsError}</p>}
        </div>
        
        {/* Thumbnail */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Book Thumbnail *
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#333333] text-white rounded hover:bg-[#444444] transition-colors disabled:bg-[#222222]"
              disabled={uploading || generatingImage}
            >
              Select Image
            </button>
            <button
              type="button"
              onClick={handleGenerateAIThumbnail}
              className="px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C]"
              disabled={uploading || generatingImage || !conciseSummary.trim()}
              title={!conciseSummary.trim() ? "Generate a concise summary first" : "Generate thumbnail using AI"}
            >
              {generatingImage ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Generating...
                </>
              ) : (
                <>Generate with AI</>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleThumbnailChange}
              className="hidden"
              accept="image/*"
              disabled={uploading || generatingImage}
            />
            <span className="text-sm text-gray-400">
              {thumbnail ? (
                thumbnail.name.startsWith('ai-generated') 
                  ? 'AI-generated image' 
                  : thumbnail.name
              ) : 'No file selected'}
            </span>
          </div>
          
          {/* Thumbnail Preview */}
          {thumbnailPreview && (
            <div className="mt-4 flex justify-center">
              <div className="relative aspect-[9/16] h-60 border border-gray-300 rounded overflow-hidden">
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Publishing Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Publishing Mode
          </label>
          <div className="flex space-x-4">
            <div className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="publishMode"
                checked={publishMode === 'single'}
                onChange={() => handlePublishModeChange('single')}
                className="mr-2"
                disabled={uploading}
                id="single-mode"
              />
              <label htmlFor="single-mode">Single Chapter</label>
            </div>
            <div className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="publishMode"
                checked={publishMode === 'episodes'}
                onChange={() => handlePublishModeChange('episodes')}
                className="mr-2"
                disabled={uploading}
                id="episodes-mode"
              />
              <label htmlFor="episodes-mode">Multiple Episodes</label>
            </div>
          </div>
        </div>
        
        {/* Content - Show only in single mode */}
        {publishMode === 'single' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                Book Content *
              </label>
              
              {/* Audio Narration Button */}
              {content && (
                <EnhancedAudioNarrationButton 
                  text={content.replace(/<[^>]*>/g, ' ')} // Strip HTML tags for narration
                  bookId={bookId || undefined}
                  onSuccess={(url) => setAudioUrl(url)}
                  className="text-sm"
                />
              )}
            </div>
            
            {/* Tiptap Editor */}
            <div className="border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-primary overflow-hidden">
              {!editorLoaded ? (
                <div className="w-full px-3 py-2 bg-[#2a2a2a] text-white min-h-[300px] flex items-center justify-center">
                  <p>Loading editor...</p>
                </div>
              ) : (
                <div className="bg-[#2a2a2a]">
                  <MenuBar editor={editor} />
                  <EditorContent editor={editor} className="prose-invert" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Use the toolbar to format your content</p>
            {contentError && <p className="text-red-500 text-sm mt-1">{contentError}</p>}
            
            {/* Audio Preview */}
            {audioUrl && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-300 mb-1">Audio Narration Preview</p>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        )}
        
        {/* Chapters Manager - Show only in episodes mode */}
        {publishMode === 'episodes' && (
          <div className="mb-6">
            <ChaptersManager 
              chapters={chapters} 
              onChange={handleChaptersChange}
              bookId={bookId || undefined}
            />
            {chaptersError && <p className="text-red-500 text-sm mt-1">{chaptersError}</p>}
          </div>
        )}
        
        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400 mt-1">{Math.round(uploadProgress)}% uploaded</p>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? 'Publishing...' : 'Publish Book'}
          <span className="ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
      </form>
    </div>
  );
};

export default BookForm;