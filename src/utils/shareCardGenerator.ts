/**
 * Utility to generate dynamic share cards for social media sharing
 * Similar to Spotify's share functionality
 */

/**
 * Generates a share card image for social media
 * @param bookCoverUrl URL of the book cover image
 * @param title Book title
 * @param author Book author
 * @returns Promise that resolves to a data URL of the generated image
 */
export async function generateShareCard(
  bookCoverUrl: string,
  title: string,
  author: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas dimensions (Instagram story optimal size)
      canvas.width = 1080;
      canvas.height = 1920;
      
      // Load the book cover image
      const coverImage = new Image();
      coverImage.crossOrigin = 'anonymous'; // Enable CORS for the image
      
      coverImage.onload = () => {
        // Draw blurred background (using the cover image)
        ctx.filter = 'blur(30px) brightness(0.6)';
        ctx.drawImage(coverImage, -50, -50, canvas.width + 100, canvas.height + 100);
        ctx.filter = 'none';
        
        // Add gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw book cover (centered, taking up about 60% of height)
        const coverHeight = canvas.height * 0.6;
        const coverWidth = (coverImage.width / coverImage.height) * coverHeight;
        const coverX = (canvas.width - coverWidth) / 2;
        const coverY = canvas.height * 0.15;
        
        // Add drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;
        
        // Draw the cover image
        ctx.drawImage(coverImage, coverX, coverY, coverWidth, coverHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Add book title
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 70px Arial, sans-serif';
        
        // Wrap text if needed
        const maxWidth = canvas.width * 0.8;
        const words = title.split(' ');
        let line = '';
        let lines = [];
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        
        // Draw title lines
        let titleY = coverY + coverHeight + 100;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], canvas.width / 2, titleY);
          titleY += 80;
        }
        
        // Add author
        ctx.font = '40px Arial, sans-serif';
        ctx.fillText(`by ${author}`, canvas.width / 2, titleY + 60);
        
        // Add "Listen on TuneTalez" text
        ctx.font = 'bold 50px Arial, sans-serif';
        ctx.fillStyle = '#FF6B00'; // TuneTalez primary color
        ctx.fillText('Listen on TuneTalez', canvas.width / 2, canvas.height - 150);
        
        // Add TuneTalez logo or icon (placeholder - would need actual logo)
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height - 250, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      
      coverImage.onerror = () => {
        reject(new Error('Failed to load book cover image'));
      };
      
      coverImage.src = bookCoverUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Converts a data URL to a File object
 * @param dataUrl The data URL to convert
 * @param filename The filename to use
 * @returns File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}