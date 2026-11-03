# FlabbyChat

Chat, calls and project collaboration for student teams.

## About

FlabbyChat is my college major project: a responsive workspace for students to communicate, organize project work and share documents. It includes real accounts backed by Firebase and a separate guest demo populated with fictional people and sample projects.

## Key Features

- Email/password accounts, email verification, password reset and editable profiles.
- Shared channels and private chats with replies, favorites, search and image/PDF attachments.
- Private voice/video calls with ringing, media controls and call history.
- Teams, project workspaces, assigned tasks, calendar views and discussion boards.
- Personal/team document libraries with previews, downloads, sharing, copying and moving files.
- Dashboard charts, notifications, light/dark themes and message/time display preferences.

## Live Website

**[Open FlabbyChat](https://flabby-chat.vercel.app/)**

## Tech Stack

| Area                    | Technologies                                    |
| ----------------------- | ----------------------------------------------- |
| Frontend                | JavaScript, React 19, Vite 7, CSS, Lucide icons |
| Authentication and data | Firebase Authentication, Realtime Database      |
| Files and previews      | Cloudinary, PDF.js                              |
| Calls                   | WebRTC with Firebase signaling                  |
| Testing                 | Vitest, React Testing Library, jest-dom, jsdom  |

## Prerequisites

- Node.js 24 and npm; other supported versions are listed in package.json.
- Firebase project for real accounts and shared data.
- Cloudinary account for PDF uploads and images up to 5 MB.

The guest demo works without cloud configuration.

## Installation & Environment Setup

1. Download or clone the project and open a terminal in the application repository.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env.local` and fill in your public client configuration:

   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=your_realtime_database_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_web_app_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
   ```

### Firebase Setup

Register a Web app in Firebase Console, enable Email/Password authentication and create a Realtime Database. Use its exact URL in the environment file and publish the included `database.rules.json`. Add the required hostnames to Authentication's authorized domains. Users must verify their email before accessing the cloud workspace.

### Cloudinary Setup

Create an unsigned upload preset restricted to `jpg,jpeg,png,webp,gif,pdf`. Set its name and your Cloud name in the environment file. Enable PDF delivery under Security if blocked, and apply provider-side size restrictions where available. The app checks a 5 MB cloud-upload limit.

Cloudinary delivery URLs can be opened by anyone holding the link. Without Cloudinary, signed-in uploads support images up to 250 KB; demo images/PDFs are local and limited to 250 KB.

`.env.local` is ignored by Git. Never put administrator credentials, service-account keys or Cloudinary API secrets in `VITE_` variables.

## Local Run, Build & Test Commands

```sh
npm start
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Restart after environment changes. Select **Try demo without an account** to explore the guest workspace; real calls are disabled in demo mode.

| Command           | Purpose                            |
| ----------------- | ---------------------------------- |
| `npm start`       | Start the development server       |
| `npm run dev`     | Alternative development command    |
| `npm test`        | Run automated tests                |
| `npm run build`   | Create production assets in build/ |
| `npm run preview` | Serve the production build locally |

## Brief Project Structure

```text
public/                 Favicon and crawler instructions
src/
├── assets/             Logo and ringtone
├── components/         Screens and shared UI
├── hooks/              Team/library subscriptions
├── services/           Firebase, uploads and calls
├── styles/             Layout and themes
├── tests/              Automated tests and fixtures
├── utils/              Data, dates, demo and export helpers
├── App.jsx             Authentication gate
└── main.jsx            Application entry
.env.example            Environment template
database.rules.json     Database permissions
firebase.json           Firebase Hosting configuration
vercel.json             Vercel configuration
vite.config.js          Build and test configuration
package.json            Dependencies and commands
```
