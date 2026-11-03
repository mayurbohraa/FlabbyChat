# FlabbyChat

Chat, calls and project collaboration for student teams.

## About

FlabbyChat is my college major project. It brings team conversations, calls, tasks, schedules and shared documents into one application.

## Key Features

- Email/password login, email verification, password reset and profile editing.
- Channels and private chats with replies, favorites and attachments.
- Private voice/video calls and call history.
- Teams, projects, tasks, calendars and discussion boards.
- Personal and team files with upload, preview, download, copy and move options.
- Dashboard, notifications, themes and a guest demo.

## Live Website

[flabby-chat.vercel.app](https://flabby-chat.vercel.app/)

## Tech Stack

- **Frontend:** React, JavaScript, Vite, CSS and Lucide icons.
- **Authentication and database:** Firebase Authentication and Realtime Database.
- **Files:** Cloudinary and PDF.js.
- **Calls:** WebRTC.
- **Testing:** Vitest and React Testing Library.

## Prerequisites

- Node.js 24 and npm.
- A Firebase project.
- A Cloudinary account for file uploads.

## Installation & Environment Setup

1. Download or clone the project and open a terminal in its application folder.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. In Firebase Console, register a Web app, enable **Email/Password** authentication and create a **Realtime Database**.
4. Publish `database.rules.json` in the database's **Rules** tab and add your local/deployed hostname to Authentication's **Authorized domains** when needed.
5. In Cloudinary, create an **unsigned upload preset**. Allow `jpg,jpeg,png,webp,gif,pdf` and enable PDF delivery under **Security** if blocked. The app supports cloud uploads up to 5 MB.
6. Copy `.env.example` to `.env.local` and fill in the values from Firebase and Cloudinary:

   ```env
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_DATABASE_URL=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_APP_ID=
   VITE_CLOUDINARY_CLOUD_NAME=
   VITE_CLOUDINARY_UPLOAD_PRESET=
   ```

7. Start the application:

   ```sh
   npm start
   ```

8. Open the URL printed in the terminal. Sign up and verify your email, or select **Try demo without an account**. The guest demo does not require Firebase or Cloudinary setup.

Restart the server after changing `.env.local`. Use public client configuration only; keep API secrets out of this file.

## Local Run, Build & Test Commands

| Command           | Purpose                                 |
| ----------------- | --------------------------------------- |
| `npm start`       | Run locally                             |
| `npm run dev`     | Alternative development command         |
| `npm run build`   | Generate the production build in build/ |
| `npm run preview` | Preview the production build            |
| `npm test`        | Run automated tests                     |

## Brief Project Structure

```text
public/                 Public assets
src/
├── assets/             Logo and audio
├── components/         Screens and shared UI
├── hooks/              Shared state hooks
├── services/           Firebase, uploads and calls
├── styles/             Stylesheets
├── tests/              Automated tests
├── utils/              Helpers and demo data
├── App.jsx
└── main.jsx
.env.example            Configuration template
database.rules.json     Database rules
firebase.json           Firebase configuration
vercel.json             Vercel configuration
vite.config.js          Build and test configuration
package.json            Dependencies and commands
```
