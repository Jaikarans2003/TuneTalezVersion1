'use client';

// Define the Episode interface
export interface Episode {
  id?: string;
  title: string;
  text: string;
  thumbnailUrl?: string;
  narrationUrl?: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  published: boolean;
  seriesId?: string;
  order?: number;
  tags?: string[];
}

// Episode creation payload (omits auto-generated fields)
export type EpisodeCreatePayload = Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>;

// Episode update payload
export type EpisodeUpdatePayload = Partial<Omit<Episode, 'id' | 'createdAt'>>;
