'use client';

import { ContentMetadata } from '@/services/openai';
import { r2Client } from '@/r2/config';
import { getFileUrlFromR2, fileExistsInR2 } from '@/r2/services';
import { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';

// Background music categories
export type MusicCategory = 'Horror' | 'Suspence' | 'Happy' | 'Thriller';

// Background music file structure
export interface BackgroundMusic {
  url: string;
  category: MusicCategory;
  index: number;
  filename: string;
}

// Map mood from metadata to music category
const mapMoodToCategory = (mood: string): MusicCategory => {
  // Normalize the mood to lowercase for case-insensitive matching
  const normalizedMood = mood.toLowerCase();
  
  // Map various moods to our available categories
  if (normalizedMood.includes('horror') || normalizedMood.includes('scary') || normalizedMood.includes('terrifying')) {
    return 'Horror';
  } else if (normalizedMood.includes('suspense') || normalizedMood.includes('mysterious') || normalizedMood.includes('tense')) {
    return 'Suspence';
  } else if (normalizedMood.includes('happy') || normalizedMood.includes('joyful') || normalizedMood.includes('cheerful')) {
    return 'Happy';
  } else if (normalizedMood.includes('thriller') || normalizedMood.includes('action') || normalizedMood.includes('exciting')) {
    return 'Thriller';
  }
  
  // Default to Suspence if no match is found
  console.warn(`No direct match found for mood: ${mood}. Defaulting to Suspence.`);
  return 'Suspence';
};


// Helper function to get background music with fallback options
const getBackgroundMusicWithFallback = async (category: MusicCategory, musicIndex: number): Promise<BackgroundMusic> => {
  // Try to get the music file with the calculated index
  // If not found, try other indices in descending order of preference
  const indexesToTry = [
    musicIndex,           // First try the calculated index
    1,                    // Then try the default index 1
    2, 3, 4, 5, 6, 7      // Then try all other indices
  ].filter((idx, pos, arr) => arr.indexOf(idx) === pos); // Remove duplicates
  
  // Try each index until we find a file that exists
  let url = '';
  let foundIndex = 1;
  let filename = '';
  let found = false;
  
  for (const idx of indexesToTry) {
    try {
      // Try both uppercase and lowercase file extensions
      const filenameUppercase = `${category}_${idx}.MP3`;
      const filenameLowercase = `${category}_${idx}.mp3`;
      
      // First try uppercase extension
      try {
        const pathUppercase = `BackgroundMusic/${category}/${filenameUppercase}`;
        console.log(`Trying to access: ${pathUppercase}`);
        
        // Check if file exists in R2
        const existsUppercase = await fileExistsInR2(pathUppercase);
        if (existsUppercase) {
          url = await getFileUrlFromR2(pathUppercase);
          filename = filenameUppercase;
          foundIndex = idx;
          found = true;
          console.log(`Found background music file with uppercase extension: ${filenameUppercase}`);
          break;
        } else {
          // Try lowercase extension
          const pathLowercase = `BackgroundMusic/${category}/${filenameLowercase}`;
          console.log(`Trying to access: ${pathLowercase}`);
          
          const existsLowercase = await fileExistsInR2(pathLowercase);
          if (existsLowercase) {
            url = await getFileUrlFromR2(pathLowercase);
            filename = filenameLowercase;
            foundIndex = idx;
            found = true;
            console.log(`Found background music file with lowercase extension: ${filenameLowercase}`);
            break;
          } else {
            console.warn(`Background music file not found with either case: ${category}_${idx}.MP3 or ${category}_${idx}.mp3`);
            continue; // Try next index
          }
        }
      } catch (err: any) {
        console.error("Unexpected error accessing background music:", err);
        continue; // Try next index
      }
    } catch (err: any) {
      // This catch block handles errors not caught by the inner try-catch blocks
      console.error("Unexpected error accessing background music:", err);
      throw err;
    }
  }
  
  // If no file was found after trying all indices, try a different category
  if (!found) {
    const fallbackCategories: MusicCategory[] = ['Suspence', 'Happy', 'Thriller', 'Horror']
      .filter(c => c !== category) as MusicCategory[];
    
    for (const fallbackCategory of fallbackCategories) {
      // Try both uppercase and lowercase file extensions for fallback
      const filenameUppercase = `${fallbackCategory}_1.MP3`;
      const filenameLowercase = `${fallbackCategory}_1.mp3`;
      
      // First try uppercase extension
      try {
        const pathUppercase = `BackgroundMusic/${fallbackCategory}/${filenameUppercase}`;
        console.log(`Trying fallback with uppercase extension: ${pathUppercase}`);
        
        const existsUppercase = await fileExistsInR2(pathUppercase);
        if (existsUppercase) {
          url = await getFileUrlFromR2(pathUppercase);
          console.log(`Found fallback music with uppercase extension: ${filenameUppercase}`);
          return {
            url,
            category: fallbackCategory,
            index: 1,
            filename: filenameUppercase
          };
        } else {
          // Try lowercase extension
          const pathLowercase = `BackgroundMusic/${fallbackCategory}/${filenameLowercase}`;
          console.log(`Trying fallback with lowercase extension: ${pathLowercase}`);
          
          const existsLowercase = await fileExistsInR2(pathLowercase);
          if (existsLowercase) {
            url = await getFileUrlFromR2(pathLowercase);
            console.log(`Found fallback music with lowercase extension: ${filenameLowercase}`);
            return {
              url,
              category: fallbackCategory,
              index: 1,
              filename: filenameLowercase
            };
          } else {
            console.warn(`Fallback music file not found with either case: ${fallbackCategory}_1.MP3 or ${fallbackCategory}_1.mp3`);
            continue; // Try next category
          }
        }
      } catch (err: any) {
        console.error(`Error trying fallback category ${fallbackCategory}:`, err);
        continue; // Try next category
      }
    }
    
    // If we still can't find any music file, throw an error
    throw new Error(`No background music files found in any category`);
  }
  
  return {
    url,
    category,
    index: foundIndex,
    filename
  };
};

// Get background music based on metadata
export const getBackgroundMusicForMetadata = async (metadata: ContentMetadata): Promise<BackgroundMusic> => {
  try {
    // Map the mood to a category
    const category = mapMoodToCategory(metadata.mood);
    
    // Choose a music index based on intensity (1-7)
    // Map intensity from 1-10 scale to 1-7 scale for our files
    const musicIndex = Math.max(1, Math.min(7, Math.ceil(metadata.intensity / 10 * 7)));
    
    // Get background music with fallback options
    return await getBackgroundMusicWithFallback(category, musicIndex);
  } catch (error) {
    console.error('Error fetching background music:', error);
    // Return a hardcoded fallback music object when all else fails
    return {
      url: '/fallback-music.mp3', // This should be a local file in your public directory
      category: 'Suspence',
      index: 1,
      filename: 'fallback-music.mp3'
    };
  }
};

// Get multiple background music tracks for paragraph-level analysis
export const getBackgroundMusicForParagraphs = async (metadata: ContentMetadata): Promise<BackgroundMusic[]> => {
  try {
    // If no paragraph moods are available, just get one track for the overall mood
    if (!metadata.paragraphMoods || metadata.paragraphMoods.length === 0) {
      const music = await getBackgroundMusicForMetadata(metadata);
      return [music];
    }
    
    // Get a unique music track for each unique mood in the paragraphs
    const uniqueMoods = new Set(metadata.paragraphMoods.map(p => p.mood));
    
    // Map to store music by mood
    const musicByMood = new Map<string, BackgroundMusic>();
    
    // Fetch music for each unique mood
    for (const mood of uniqueMoods) {
      try {
        const category = mapMoodToCategory(mood);
        
        // Find the paragraph with this mood that has the highest intensity
        const paragraphWithMood = metadata.paragraphMoods
          .filter(p => p.mood === mood)
          .sort((a, b) => {
            // Sort by transition intensity if available, otherwise use overall intensity
            const intensityA = a.transition?.intensity || metadata.intensity;
            const intensityB = b.transition?.intensity || metadata.intensity;
            return intensityB - intensityA; // Descending order
          })[0];
        
        // Use transition intensity if available, otherwise use overall intensity
        const intensity = paragraphWithMood.transition?.intensity || metadata.intensity;
        
        // Map intensity to music index (1-7)
        const musicIndex = Math.max(1, Math.min(7, Math.ceil(intensity / 10 * 7)));
        
        // Get background music with fallback options
        const music = await getBackgroundMusicWithFallback(category, musicIndex);
        
        // Store the music by mood
        musicByMood.set(mood, music);
      } catch (err) {
        console.error(`Failed to get music for mood ${mood}:`, err);
        // Continue with the next mood
      }
    }
    
    // If we couldn't get any music, get at least one track
    if (musicByMood.size === 0) {
      try {
        const defaultMusic = await getBackgroundMusicForMetadata(metadata);
        musicByMood.set(metadata.mood, defaultMusic);
      } catch (err) {
        console.error('Failed to get default background music:', err);
        throw new Error('Could not find any background music');
      }
    }
    
    // Map each paragraph to its corresponding music
    return metadata.paragraphMoods.map(paragraph => {
      const music = musicByMood.get(paragraph.mood);
      if (music) return music;
      
      // If we don't have music for this specific mood, use any available music
      const firstAvailableMusic = Array.from(musicByMood.values())[0];
      if (firstAvailableMusic) return firstAvailableMusic;
      
      // This should never happen since we ensure musicByMood has at least one entry
      throw new Error('No background music available');
    });
  } catch (error) {
    console.error('Error fetching background music for paragraphs:', error);
    throw error;
  }
};

// List all available background music categories
export const listBackgroundMusicCategories = async (): Promise<string[]> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
      Prefix: 'BackgroundMusic/',
      Delimiter: '/'
    });
    
    const result: ListObjectsV2CommandOutput = await r2Client.send(command);
    
    // Extract common prefixes (directories)
    const categories: string[] = [];
    if (result.CommonPrefixes) {
      for (const prefix of result.CommonPrefixes) {
        if (prefix.Prefix) {
          // Extract category name from prefix (e.g., "BackgroundMusic/Horror/" -> "Horror")
          const categoryName = prefix.Prefix.replace('BackgroundMusic/', '').replace('/', '');
          if (categoryName) {
            categories.push(categoryName);
          }
        }
      }
    }
    
    return categories;
  } catch (error) {
    console.error('Error listing background music categories:', error);
    throw error;
  }
};

// List all music files in a category
export const listBackgroundMusicInCategory = async (category: string): Promise<string[]> => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
      Prefix: `BackgroundMusic/${category}/`
    });
    
    const result: ListObjectsV2CommandOutput = await r2Client.send(command);
    
    const fileNames: string[] = [];
    if (result.Contents) {
      for (const item of result.Contents) {
        if (item.Key) {
          // Extract filename from key (e.g., "BackgroundMusic/Horror/Horror_1.mp3" -> "Horror_1.mp3")
          const fileName = item.Key.split('/').pop();
          if (fileName) {
            fileNames.push(fileName);
          }
        }
      }
    }
    
    return fileNames;
  } catch (error) {
    console.error(`Error listing music in category ${category}:`, error);
    throw error;
  }
};

/**
 * Gets a random background music file from a specific category
 * @param category The category to get music from (Horror, Suspence, Happy, Thriller)
 * @returns Promise resolving to a BackgroundMusic object
 */
export const getRandomBackgroundMusic = async (category: MusicCategory): Promise<BackgroundMusic> => {
  try {
    console.log(`Getting random background music from category: ${category}`);
    
    // List all files in the category
    const files = await listBackgroundMusicInCategory(category);
    
    // Filter for MP3 files (both uppercase and lowercase extensions)
    const mp3Files = files.filter(filename => 
      filename.toLowerCase().endsWith('.mp3')
    );
    
    if (mp3Files.length === 0) {
      console.warn(`No MP3 files found in category: ${category}`);
      throw new Error(`No MP3 files found in category: ${category}`);
    }
    
    // Select a random file
    const randomIndex = Math.floor(Math.random() * mp3Files.length);
    const randomFileName = mp3Files[randomIndex];
    
    console.log(`Selected random file: ${randomFileName} from category: ${category}`);
    
    // Get download URL
    const path = `BackgroundMusic/${category}/${randomFileName}`;
    const url = await getFileUrlFromR2(path);
    
    // Extract index from filename (e.g., "Happy_3.mp3" -> 3)
    const filenameMatch = randomFileName.match(/(\d+)\.mp3$/i);
    const index = filenameMatch ? parseInt(filenameMatch[1]) : 1;
    
    return {
      url,
      category,
      index,
      filename: randomFileName
    };
  } catch (error) {
    console.error(`Error getting random background music from category ${category}:`, error);
    
    // Try fallback categories if the specified category fails
    try {
      const fallbackCategories: MusicCategory[] = ['Suspence', 'Happy', 'Thriller', 'Horror']
        .filter(c => c !== category) as MusicCategory[];
      
      for (const fallbackCategory of fallbackCategories) {
        try {
          console.log(`Trying fallback category: ${fallbackCategory}`);
          return await getRandomBackgroundMusic(fallbackCategory);
        } catch (fallbackError) {
          console.warn(`Fallback to category ${fallbackCategory} failed`);
          // Continue to next fallback
        }
      }
    } catch (fallbackError) {
      console.error('All fallback categories failed');
    }
    
    // If all fallbacks fail, throw the original error
    throw error;
  }
};

/**
 * Gets a random background music file based on content metadata
 * @param metadata Content metadata containing mood information
 * @returns Promise resolving to a BackgroundMusic object
 */
export const getRandomBackgroundMusicForMetadata = async (metadata: ContentMetadata): Promise<BackgroundMusic> => {
  // Map the mood to a category
  const category = mapMoodToCategory(metadata.mood);
  
  try {
    // Get random music from the mapped category
    return await getRandomBackgroundMusic(category);
  } catch (error) {
    console.error(`Error getting random music for mood ${metadata.mood}:`, error);
    throw error;
  }
};

/**
 * Gets random background music tracks for each paragraph based on their moods
 * @param metadata Content metadata containing paragraph-level mood information
 * @returns Promise resolving to an array of BackgroundMusic objects
 */
export const getRandomBackgroundMusicForParagraphs = async (metadata: ContentMetadata): Promise<BackgroundMusic[]> => {
  try {
    // If no paragraph moods are available, just get one track for the overall mood
    if (!metadata.paragraphMoods || metadata.paragraphMoods.length === 0) {
      const music = await getRandomBackgroundMusicForMetadata(metadata);
      return [music];
    }
    
    // Get a unique music track for each unique mood in the paragraphs
    const uniqueMoods = new Set(metadata.paragraphMoods.map(p => p.mood));
    
    // Map to store music by mood
    const musicByMood = new Map<string, BackgroundMusic>();
    
    // Fetch music for each unique mood
    for (const mood of uniqueMoods) {
      try {
        const category = mapMoodToCategory(mood);
        
        // Get random music for this mood category
        const music = await getRandomBackgroundMusic(category);
        
        // Store the music by mood
        musicByMood.set(mood, music);
      } catch (err) {
        console.error(`Failed to get random music for mood ${mood}:`, err);
        // Continue with the next mood
      }
    }
    
    // If we couldn't get any music, get at least one track
    if (musicByMood.size === 0) {
      try {
        const defaultMusic = await getRandomBackgroundMusicForMetadata(metadata);
        musicByMood.set(metadata.mood, defaultMusic);
      } catch (err) {
        console.error('Failed to get default background music:', err);
        throw new Error('Could not find any background music');
      }
    }
    
    // Map each paragraph to its corresponding music
    return metadata.paragraphMoods.map(paragraph => {
      const music = musicByMood.get(paragraph.mood);
      if (music) return music;
      
      // If we don't have music for this specific mood, use any available music
      const firstAvailableMusic = Array.from(musicByMood.values())[0];
      if (firstAvailableMusic) return firstAvailableMusic;
      
      // This should never happen since we ensure musicByMood has at least one entry
      throw new Error('No background music available');
    });
  } catch (error) {
    console.error('Error getting random background music for paragraphs:', error);
    throw error;
  }
};
