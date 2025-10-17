# TuneTalez - PDF Viewer Application

A web application that allows users to upload, view, and manage PDF files with a red and black color palette.

## Features

- Upload PDF files to Firebase Storage
- View list of uploaded PDFs
- View PDF files with pagination and zoom controls
- Delete PDF files
- Responsive design with red and black color palette

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Firebase (Storage, Firestore, Hosting)
- React PDF Viewer

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd tunetalez
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up Firebase

- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Firestore Database and Storage
- Add a web app to your Firebase project
- Copy the Firebase configuration

4. Configure environment variables

Create a `.env.local` file in the root directory and add your Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

5. Run the development server

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment

1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

2. Login to Firebase

```bash
firebase login
```

3. Initialize Firebase in your project

```bash
firebase init
```

4. Build the Next.js application

```bash
npm run build
# or
yarn build
```

5. Deploy to Firebase

```bash
firebase deploy
```

## License

This project is licensed under the MIT License.
