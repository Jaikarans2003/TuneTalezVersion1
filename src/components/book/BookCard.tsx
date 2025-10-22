import Link from 'next/link';
import Image from 'next/image';
import { BookDocument } from '@/firebase/services';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ShareButton from './ShareButton';

interface BookCardProps {
  book: BookDocument;
  onDelete?: (book: BookDocument) => void;
}

const BookCard = ({ book, onDelete }: BookCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    // Stop propagation to prevent navigation when delete button is clicked
    e.stopPropagation();
    
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete "${book.title}"?`)) {
        onDelete(book);
      }
    }
  };

  return (
    <Link href={`/book/${book.id}`} className="block h-full">
      <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-800 hover:border-primary/50 transition-all duration-300 h-full flex flex-col hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer">
        <div className="relative overflow-hidden group w-full pb-[140%]">
          <Image
            src={book.thumbnailUrl || '/images/book-placeholder.jpg'}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110 shadow-lg"
            quality={100}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={true}
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-between p-4">
            <div className="self-end flex gap-2" onClick={(e) => e.stopPropagation()}>
              <LikeButton bookId={book.id || ''} className="text-white hover:text-red-500" />
              <SaveButton bookId={book.id || ''} className="text-white hover:text-primary" />
              <ShareButton 
                title={book.title}
                text={`Check out "${book.title}" by ${book.author} on TuneTalez`}
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${book.id}`}
                thumbnailUrl={book.thumbnailUrl}
                author={book.author}
                iconOnly={true}
                className="text-white hover:text-primary"
              />
            </div>
            {/* Removed the "Read Now" button since the entire card is now clickable */}
          </div>
        </div>
        <div className="p-4 flex-grow flex flex-col">
          <h3 className="font-bold text-white mb-1 line-clamp-1">{book.title}</h3>
          <p className="text-gray-400 text-sm mb-2">{book.author}</p>
          <div className="flex flex-wrap gap-1 mt-auto">
            {book.tags?.map((tag, index) => (
              <span key={index} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded transition-all duration-300 hover:bg-primary/20 hover:text-white cursor-pointer">
                {tag}
              </span>
            ))}
          </div>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 text-sm mt-3 self-end transition-colors duration-300"
              aria-label="Delete book"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;