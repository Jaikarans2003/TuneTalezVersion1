# TuneTalez - Interactive Book Reading Platform

A web application that allows users to upload, view, and manage books and PDFs with interactive features and audio narration.

## Features

- Upload and manage books and PDFs
- Interactive book reading experience
- Audio narration for books
- Like, save, and share functionality
- Admin dashboard for content management
- Responsive design with modern UI

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Firebase (Firestore, Authentication, Hosting)
- Cloudflare R2 Storage
- TipTap Editor
- AI-powered content generation

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase account
- Cloudflare R2 account

### Installation

1. Clone the repository

```bash
git clone https://github.com/Jaikarans2003/TuneTalezVersion1.git
cd TuneTalezVersion1
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up Firebase

- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Firestore Database and Authentication
- Add a web app to your Firebase project
- Copy the Firebase configuration

4. Set up Cloudflare R2

- Create a Cloudflare R2 bucket at [Cloudflare Dashboard](https://dash.cloudflare.com/)
- Create API tokens with appropriate permissions
- Note your Account ID, Access Key ID, and Secret Access Key

5. Configure environment variables

Create a `.env.local` file in the root directory and add your configurations:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Cloudflare R2 Configuration
NEXT_PUBLIC_R2_ACCOUNT_ID=your-cloudflare-account-id
NEXT_PUBLIC_R2_ACCESS_KEY_ID=your-access-key-id
NEXT_PUBLIC_R2_SECRET_ACCESS_KEY=your-secret-access-key
NEXT_PUBLIC_R2_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_R2_PUBLIC_URL=your-r2-public-url

# Optional: AI Services (if using)
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

6. Run the development server

```bash
npm run dev
# or
yarn dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - React components
- `/src/firebase` - Firebase configuration and services
- `/src/r2` - Cloudflare R2 storage services
- `/src/utils` - Utility functions
- `/src/services` - External services integration

## Key Features Implementation

### File Storage with Cloudflare R2

All files (books, PDFs, thumbnails, audio) are stored in Cloudflare R2. The implementation can be found in:

- `/src/r2/services.ts` - Core R2 functionality
- `/src/utils/audioUtils.ts` - Audio file handling utilities
- `/src/utils/nodeAudioNarrationService.ts` - Audio narration generation

### Book Reading Experience

The book reading experience is implemented with:

- `/src/app/read/[id]/page.tsx` - Book reading page
- `/src/components/book` - Book-related components

## Deployment

1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

2. Login to Firebase

```bash
firebase login
```

3. Build the Next.js application

```bash
npm run build
# or
yarn build
```

4. Deploy to Firebase

```bash
firebase deploy
# or
npm run deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
