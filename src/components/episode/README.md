# Episode Narration System

This system provides a complete solution for generating, storing, and playing audio narrations for episodes using OpenAI's TTS API and Firebase Storage.

## Overview

The narration system follows these steps:

1. Generate audio from text using OpenAI's TTS API (returns an ArrayBuffer)
2. Convert the ArrayBuffer to a Blob
3. Upload the Blob to Firebase Storage
4. Get a persistent download URL from Firebase
5. Save that URL in Firestore (in the episode document)
6. Play the audio using the Firebase URL (never the blob URL)

## Components

### 1. EpisodeNarrationGenerator

This component provides a button to generate narration for an episode:

```tsx
<EpisodeNarrationGenerator
  episodeId="episode-123"
  text="Text to be narrated"
  onSuccess={(audioUrl) => console.log('Narration URL:', audioUrl)}
  onError={(error) => console.error('Error:', error)}
/>
```

### 2. EpisodePlayer

This component plays the narration for an episode:

```tsx
<EpisodePlayer episodeId="episode-123" />
```

## Firebase Services

### Episode Management

```tsx
// Create a new episode
const newEpisode = await createEpisode({
  title: 'Episode Title',
  text: 'Episode content to be narrated',
  authorId: 'user-123',
  published: true
});

// Get an episode
const episode = await getEpisodeById('episode-123');

// Get all episodes
const episodes = await getEpisodes();

// Update an episode
await updateEpisode('episode-123', {
  title: 'Updated Title'
});

// Delete an episode
await deleteEpisode('episode-123');
```

### Audio Narration

```tsx
// Generate and upload narration
const audioBuffer = await generateAudio('Text to narrate');
const audioBlob = arrayBufferToBlob(audioBuffer);

// Upload to Firebase and update episode
const narrationUrl = await uploadEpisodeNarration(
  'episode-123',
  audioBlob,
  (progress) => console.log(`Upload progress: ${progress}%`)
);
```

## Usage Example

1. Create an episode at `/episodes`
2. Navigate to the episode at `/episodes/[id]`
3. Click "Generate Narration" to create and upload audio
4. The audio URL is automatically saved to the episode document
5. The audio player uses the Firebase Storage URL for playback

## Implementation Details

- The audio files are stored in Firebase Storage at `audio-narrations/episodes/[episodeId]/[timestamp]_narration.mp3`
- The audio URL is stored in the episode document's `narrationUrl` field
- The AudioPlayer component validates URLs and only accepts HTTPS URLs
- Upload progress is tracked and displayed to the user
- Retry logic is implemented for failed uploads

## Security

- Firebase Storage security rules should be configured to control access to audio files
- The URLs used for playback are public by default
- Consider implementing authentication for sensitive content

## Best Practices

- Always use Firebase Storage URLs, never blob URLs
- Store the narration URL with the episode metadata
- Show upload progress to users during generation
- Implement retry logic for network failures
- Validate URLs in the audio player
