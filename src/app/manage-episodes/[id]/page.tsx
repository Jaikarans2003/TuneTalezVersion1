'use client';

import { useParams } from 'next/navigation';
import BookChapterManager from '@/components/book/BookChapterManager';
import { useRouter } from 'next/navigation';

const ManageEpisodesPage = () => {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const handleSuccess = () => {
    // Optionally navigate back to the book view
    // router.push(`/view/${bookId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <BookChapterManager bookId={bookId} onSuccess={handleSuccess} />
    </div>
  );
};

export default ManageEpisodesPage;
