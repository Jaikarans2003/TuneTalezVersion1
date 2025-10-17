'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Chapter } from '@/firebase/services';
import AudioNarrationButton from './AudioNarrationButton';
import EnhancedAudioNarrationButton from './EnhancedAudioNarrationButton';
import { traceAudioUrl } from '@/utils/audioDebugger';
import { rewriteAsStory } from '@/services/gemini';
import NewEpisodeNarrationGenerator from './NewEpisodeNarrationGenerator';

interface ChapterEditorProps {
  chapter: Partial<Chapter>;
  onChange: (chapter: Partial<Chapter>) => void;
  onDelete?: () => void;
  isNew?: boolean;
  episodeNumber?: number;
  useEnhancedNarration?: boolean;
}

// Tiptap MenuBar component - reused from BookForm
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
        onClick={handleWriteWithAI}
        disabled={isRewriting}
        className={`px-2 py-1 rounded ${isRewriting ? 'bg-purple-800 opacity-70' : 'bg-purple-700 hover:bg-purple-600'} text-white mr-2`}
        title="Rewrite content as a story using AI"
      >
        {isRewriting ? 'Rewriting...' : 'Write with AI'}
      </button>
      <span className="mx-1 text-gray-500">|</span>
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
    </div>
  );
}

const ChapterEditor = ({ 
  chapter, 
  onChange, 
  onDelete, 
  isNew = false, 
  episodeNumber = 1,
  useEnhancedNarration = true 
}: ChapterEditorProps) => {
  const [title, setTitle] = useState(chapter.title || '');
  const [content, setContent] = useState(chapter.content || '');
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [titleError, setTitleError] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');

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
        placeholder: 'Write your episode content here...',
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

      // Notify parent component of changes
      onChange({
        ...chapter,
        title,
        content: html,
        audioUrl: chapter.audioUrl || '' // Ensure audioUrl is never undefined
      });
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

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (!newTitle.trim()) {
      setTitleError('Title is required');
    } else {
      setTitleError('');
    }

    // Notify parent component of changes
    onChange({
      ...chapter,
      title: newTitle,
      content,
      audioUrl: chapter.audioUrl || '' // Ensure audioUrl is never undefined
    });
  };

  return (
    <div className="mb-8 p-4 border border-gray-700 rounded-lg bg-[#222222]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">
          {isNew ? 'New Episode' : `Episode: ${title || 'Untitled'}`}
        </h3>
        <div className="flex items-center gap-2">
          {content && (
            chapter.id ? (
              useEnhancedNarration ? (
                <EnhancedAudioNarrationButton
                  text={content.replace(/<[^>]*>/g, ' ')} // Strip HTML tags for narration
                  bookId={chapter.bookId as string}
                  chapterId={chapter.id}
                  onSuccess={(audioUrl) => {
                    // Trace the audio URL to ensure it's a Firebase Storage URL
                    const tracedUrl = traceAudioUrl(audioUrl, 'ChapterEditor.onSuccessEnhanced');
                    onChange({
                      ...chapter,
                      audioUrl: tracedUrl
                    });
                  }}
                />
              ) : (
                <AudioNarrationButton 
                  text={content.replace(/<[^>]*>/g, ' ')} // Strip HTML tags for narration
                  bookId={chapter.bookId as string}
                  chapterId={chapter.id}
                  onSuccess={(audioUrl) => {
                    // Trace the audio URL to ensure it's a Firebase Storage URL
                    const tracedUrl = traceAudioUrl(audioUrl, 'ChapterEditor.onSuccess');
                    onChange({
                      ...chapter,
                      audioUrl: tracedUrl
                    });
                  }}
                />
              )
            ) : (
              // For new episodes that don't have an ID yet
              <NewEpisodeNarrationGenerator
                bookId={chapter.bookId || ''}
                text={content.replace(/<[^>]*>/g, ' ')} // Strip HTML tags for narration
                onSuccess={(audioUrl) => {
                  // Trace the audio URL to ensure it's a Firebase Storage URL
                  const tracedUrl = traceAudioUrl(audioUrl, 'ChapterEditor.onSuccessNewEpisode');
                  onChange({
                    ...chapter,
                    audioUrl: tracedUrl
                  });
                }}
                className="text-sm"
              />
            )
          )}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 transition-colors"
              title="Delete episode"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      {/* Title */}
      <div className="mb-4">
        <label htmlFor={`chapter-title-${chapter.id || 'new'}`} className="block text-sm font-medium text-gray-300 mb-1">
          Episode Title *
        </label>
        <input
          type="text"
          id={`chapter-title-${chapter.id || 'new'}`}
          value={title}
          onChange={handleTitleChange}
          className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-[#2a2a2a] text-white"
          placeholder="Enter episode title"
          required
        />
        {titleError && <p className="text-red-500 text-sm mt-1">{titleError}</p>}
      </div>
      
      {/* Content */}
      <div className="mb-2">
        <label htmlFor={`chapter-content-${chapter.id || 'new'}`} className="block text-sm font-medium text-gray-300 mb-1">
          Episode Content *
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
        {contentError && <p className="text-red-500 text-sm mt-1">{contentError}</p>}
      </div>
    </div>
  );
};

export default ChapterEditor;
