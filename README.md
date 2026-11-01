# FlabbyChat

Chat, calls and project collaboration for student teams.

## Overview

FlabbyChat is my college major project, bringing conversations, assigned tasks, schedules and shared documents into one application. I worked on project planning, research, full-stack development, UI design and the original FlabbyChat logo.

The app provides a common workspace for student teams, with real-time updates, a dashboard and light/dark themes. A browser-only demo is available for exploring the interface without setting up cloud services.

## Key features

- **Accounts and profiles:** Email/password signup and login, email verification, password reset, profile editing and automatically saved profile photos.
- **Chat:** Channels and private conversations with search, replies, favorites, message deletion, image/PDF attachments and online/offline status.
- **Calls:** One-to-one voice/video calls with calling sounds, mute/camera controls and timestamped call history with outcomes and duration.
- **Project work:** Teams, project workspaces, assigned tasks, deadlines, priorities, status tracking, task CSV export, four calendar views and discussion boards.
- **Document libraries:** Personal and team folders with search, upload, in-app previews, downloads, chat sharing and copy/move between libraries.
- **Dashboard and preferences:** Task-progress and team-workload charts, upcoming work, notification dropdowns, optional browser notifications, themes, message alignment and a 12/24-hour clock.

## Technologies

| Area                          | Technologies                                  |
| ----------------------------- | --------------------------------------------- |
| Frontend                      | React 19, Vite 7, CSS and Lucide icons        |
| Accounts and live data        | Firebase Authentication and Realtime Database |
| Uploads and document previews | Cloudinary Upload API and PDF.js              |
| Calls                         | WebRTC with Firebase signaling                |
| Testing                       | Vitest, React Testing Library and jsdom       |

## Prerequisites and installation

Install **Node.js 24 with npm** and **Git**. Other supported Node versions are listed in [package.json](package.json).

```sh
git clone https://github.com/mayurbohraa/FlabbyChat.git
cd FlabbyChat
npm ci
```

## Environment configuration

Copy [.env.example](.env.example) to `.env.local` in the project root, then fill in the values from your own service accounts:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=your_realtime_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_web_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

Firebase is required for real accounts and shared data. Configure Cloudinary for PDF uploads and images up to 5 MB. Without Cloudinary, signed-in uploads are limited to small images; demo files are limited to 250 KB.

`.env.local` is ignored by Git. Use Firebase's Web app configuration here, not administrator credentials. Never put service-account keys or Cloudinary API secrets in `VITE_` variables.

### Firebase

1. Create or select a project in Firebase Console and [register a Web app](https://firebase.google.com/docs/web/setup).
2. Enable [Email/Password authentication](https://firebase.google.com/docs/auth/web/password-auth).
3. Create a [Realtime Database](https://firebase.google.com/docs/database/web/start) and copy its exact URL into `VITE_FIREBASE_DATABASE_URL`.
4. Publish the complete [database.rules.json](database.rules.json) under Realtime Database > Rules.
5. Copy `apiKey`, `authDomain`, `projectId` and `appId` from the Web app configuration into the matching environment variables. Add the appropriate local/deployed hostnames to Authentication's authorized domains when needed.

### Cloudinary

1. Copy your Cloudinary **Cloud name** into `VITE_CLOUDINARY_CLOUD_NAME`.
2. Create an [unsigned upload preset](https://cloudinary.com/documentation/upload_presets) in Console Settings > Upload > Upload Presets. Set its name as `VITE_CLOUDINARY_UPLOAD_PRESET`.
3. Restrict allowed formats to `jpg,jpeg,png,webp,gif,pdf`.
4. For PDFs, enable **Allow delivery of PDF and ZIP files** in Console Settings > Security. See [PDF delivery setup](https://cloudinary.com/documentation/pdf_optimization).

The app checks a 5 MB cloud-upload limit. Cloudinary delivery links can be opened by anyone who has the URL; library permissions protect metadata, not those public links. An upload server, Firebase Storage and S3 are not required by this implementation.

## Run locally

```sh
npm start
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Restart the server after changing `.env.local`.

For real accounts, sign up and verify your email before entering the app. To explore without cloud configuration, select **Try demo without an account**. Demo data stays in the browser; demo mode does not connect real calls or upload cloud files.

## Development, build and test commands

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `npm start`       | Start the local development server                |
| `npm run dev`     | Alternative development-server command            |
| `npm test`        | Run the automated test suite                      |
| `npm run build`   | Generate production assets in `build/`            |
| `npm run preview` | Serve the production build locally after building |

## Project structure

```text
FlabbyChat/
├── public/                Favicon and crawler instructions
├── src/
│   ├── assets/            Original logo and ringtone
│   ├── components/        Screens, charts, dialogs and shared controls
│   ├── hooks/             Team and library subscriptions
│   ├── services/          Firebase, uploads and call signaling
│   ├── styles/            Layout and theme styles
│   ├── tests/             Automated tests and setup
│   ├── utils/             Data, date/time, CSV and theme helpers
│   ├── App.jsx            Authentication gate and app entry
│   └── main.jsx           React bootstrap and stylesheet imports
├── .env.example           Frontend configuration template
├── database.rules.json    Realtime Database permissions and validation
├── firebase.json          Firebase Hosting and rules configuration
├── vercel.json            Vercel build configuration
├── vite.config.js         Development, build and test configuration
├── package.json           Dependencies and commands
├── package-lock.json      Locked dependency versions
└── README.md
```

## Deployment and links

For Vercel, import the repository as a Vite project. [vercel.json](vercel.json) sets `npm run build` as the build command and `build` as the output directory. Add the environment variables above to the Vercel project before deployment; local environment files are not uploaded. Redeploy after changing their values.

Firebase Hosting configuration is also included in [firebase.json](firebase.json). Publish the current database rules separately when required, and authorize the deployed hostname in Firebase Authentication.

Calls require HTTPS or localhost, microphone/camera permission and an open app. The current call configuration uses STUN; restrictive networks may need a TURN relay. Browser notifications also require an open app and permission.

**Live demo: [https://flabby-chat.vercel.app/](https://flabby-chat.vercel.app/)**

**Source: [github.com/mayurbohraa/FlabbyChat](https://github.com/mayurbohraa/FlabbyChat)**
