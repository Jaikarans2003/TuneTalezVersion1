'use client';

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { uploadFileToR2 } from '@/r2/services';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { rewriteAsStory } from '@/services/gemini';

interface AdminDirectUploadFormProps {
  onSuccess?: () => void;
}

// Tiptap MenuBar component - same as BookForm
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
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`p-1 rounded ${editor.isActive('paragraph') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Paragraph"
      >
        P
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1 rounded ${editor.isActive('underline') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Underline"
      >
        <u>U</u>
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align left"
      >
        ←
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align center"
      >
        ↔
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-1 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Align right"
      >
        →
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Bullet list"
      >
        • List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-700' : 'bg-[#444444] hover:bg-gray-600'}`}
        title="Numbered list"
      >
        1. List
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="p-1 rounded bg-[#444444] hover:bg-gray-600"
        title="Clear formatting"
      >
        Clear
      </button>
      <span className="mx-1 text-gray-500">|</span>
      <button
        onClick={handleWriteWithAI}
        disabled={isRewriting}
        className={`px-2 py-1 rounded ${isRewriting ? 'bg-purple-800 opacity-70' : 'bg-purple-700 hover:bg-purple-600'} text-white`}
        title="Rewrite content as a story using AI"
      >
        {isRewriting ? 'Rewriting...' : 'Write with AI'}
      </button>
    </div>
  );
};

const AdminDirectUploadForm = ({ onSuccess }: AdminDirectUploadFormProps) => {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');
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
        placeholder: 'Write your book content here...',
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
      
      if (!html.trim()) {
        setContentError('Content is required');
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

  // Direct upload function that bypasses the service layer
  const uploadBookThumbnailDirect = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    try {
      // Create a unique filename
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Import R2 services
      const { uploadFileToR2 } = await import('@/r2/services');
      
      // Create a storage path
      const storagePath = `books/thumbnails/${fileName}`;
      
      // Track upload progress (simulated since R2 doesn't have built-in progress)
      const progressInterval = setInterval(() => {
        if (onProgress) {
          const newProgress = Math.min(90, Math.floor(Math.random() * 10) + 1);
          onProgress(newProgress);
        }
      }, 300);
      
      try {
        // Upload the file to R2
        const downloadURL = await uploadFileToR2(file, storagePath);
        
        // Clear the progress interval
        clearInterval(progressInterval);
        
        // Set progress to 100%
        if (onProgress) {
          onProgress(100);
        }
        
        return downloadURL;
      } catch (error) {
        // Clear the progress interval
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      throw error;
    }
  };

  // Direct create book function that bypasses the service layer
  const createBookDirect = async (bookData: {
    title: string;
    content: string;
    author: string;
    tags: string[];
    thumbnailUrl: string;
  }) => {
    try {
      const bookDoc = {
        ...bookData,
        createdAt: Date.now(),
        description: '', // Ensure description is never undefined
        chapters: [], // Ensure chapters is never undefined
        audioUrl: '' // Ensure audioUrl is never undefined
      };
      
      const docRef = await addDoc(collection(db, 'books'), bookDoc);
      return { ...bookDoc, id: docRef.id };
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
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
    
    if (!content.trim()) {
      setContentError('Content is required');
      setError('Please enter book content');
      return;
    } else {
      setContentError('');
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
      
      // Upload thumbnail directly
      const thumbnailUrl = await uploadBookThumbnailDirect(thumbnail, (progress) => {
        setUploadProgress(progress);
      });
      
      // Process tags (split by commas and trim)
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Create book document directly
      const result = await createBookDirect({
        title: title.trim(),
        content: content.trim(),
        author: author.trim(),
        tags,
        thumbnailUrl
      });
      
      console.log('Book created successfully:', result);
      
      // Reset form
      setTitle('');
      setContent('');
      setAuthor('');
      setTagsInput('');
      setThumbnail(null);
      setThumbnailPreview(null);
      setUploadProgress(0);
      
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
      <h2 className="text-2xl font-bold mb-6">Write a New Book (Admin Mode)</h2>
      
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
        </div>
        
        {/* Tags */}
        <div className="mb-4">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
            placeholder="fiction, fantasy, adventure"
            disabled={uploading}
          />
        </div>
        
        {/* Thumbnail */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Book Thumbnail *
          </label>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#333333] text-white rounded hover:bg-[#444444] transition-colors disabled:bg-[#222222]"
              disabled={uploading}
            >
              Select Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleThumbnailChange}
              className="hidden"
              accept="image/*"
              disabled={uploading}
            />
            <span className="text-sm text-gray-400">
              {thumbnail ? thumbnail.name : 'No file selected'}
            </span>
          </div>
          
          {/* Thumbnail Preview */}
          {thumbnailPreview && (
            <div className="mt-2">
              <img 
                src={thumbnailPreview} 
                alt="Thumbnail preview" 
                className="h-40 object-cover rounded border border-gray-300" 
              />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">
            Book Content *
          </label>
          
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
        </div>
        
        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{Math.round(uploadProgress)}% uploaded</p>
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

export default AdminDirectUploadForm;
