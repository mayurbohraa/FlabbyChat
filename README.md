# FlabbyChat

Chat, calls and project collaboration for student teams.

## About

FlabbyChat is my **college major project**, bringing real-time conversations, private calls, tasks, schedules and project documents into one responsive application. My confirmed work includes project planning, research, full-stack development, UI design direction and the original logo.

The guest demo is populated with fictional people, teams and work, so visitors can explore the application without configuring cloud services. Real accounts use Firebase and stay separate from demo data.

## Key features

- **Accounts:** Email/password signup and login, email verification, password reset, profile editing and automatically saved photos.
- **Communication:** Shared channels, private chats, replies, favorites, search, own-message deletion, image/PDF attachments and visible-session presence.
- **Calls:** Private voice/video calling, ringing, media controls and outcome/duration history.
- **Project work:** Teams, ownership management, project workspaces, assigned tasks, CSV export, four calendar views and discussions.
- **Files:** Personal/team libraries, folders, previews, downloads, chat sharing and copy/move between libraries.
- **Overview and preferences:** Dashboard charts, upcoming work, notifications, themes, message alignment and a 12/24-hour clock.

## Live website

**[Open FlabbyChat](https://flabby-chat.vercel.app/)**

## Tech stack

| Area                     | Technologies                                      |
| ------------------------ | ------------------------------------------------- |
| Frontend                 | JavaScript, React 19, Vite 7, CSS, Lucide icons   |
| Accounts and persistence | Firebase Authentication and Realtime Database     |
| Uploads and previews     | Cloudinary Upload API and PDF.js                  |
| Calls                    | WebRTC with Firebase signaling                    |
| Testing                  | Vitest, React Testing Library, jest-dom and jsdom |

## Prerequisites

- Node.js 24 with npm. Other accepted versions are specified in package.json.
- Firebase project for real accounts and shared data.
- Cloudinary account for PDFs and images up to 5 MB.

Cloud setup is optional for the browser-only guest demo.

## Installation and environment setup

Open a terminal in the application repository. In this local workspace it is `FlabbyChat_Code/`.

```sh
npm ci
```

Copy `.env.example` to `.env.local` in that folder and fill in your public client configuration:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=your_realtime_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

### Firebase

1. Register a Web app in Firebase Console and copy its configuration into the matching variables.
2. Enable Email/Password under Authentication.
3. Create a Realtime Database and use its exact database URL.
4. Publish the complete `database.rules.json` under Realtime Database → Rules.
5. Configure Authentication's authorized domains for the local/deployed hostname when needed. Test verification and reset email delivery.

Sign up and verify your email before entering the cloud workspace. Updating a local rules file does not publish it to Firebase.

### Cloudinary

1. Copy the Cloud name from your account into the environment file.
2. Create an unsigned upload preset in Settings → Upload → Upload Presets.
3. Restrict allowed formats to `jpg,jpeg,png,webp,gif,pdf`, and apply provider-side size restrictions where available. The app checks a 5 MB limit.
4. Enable PDF delivery in Settings → Security if the account blocks it.

Cloudinary links are accessible to anyone holding the URL; library permissions protect metadata rather than asset delivery. Without Cloudinary, signed-in uploads support images up to 250 KB. Demo images/PDFs are local and limited to 250 KB. Firebase Storage, S3 and an upload server are not used.

`.env.local` is ignored. VITE_ values are bundled into the client: never include service-account credentials, administrator keys or Cloudinary API secrets.

## Run, build and test

```sh
npm start
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Restart the server after environment changes. Choose **Try demo without an account** to explore the populated guest workspace; demo edits stay in that browser and real calls are disabled.

| Command           | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `npm start`       | Start development server                   |
| `npm run dev`     | Alternative development command            |
| `npm test`        | Run automated tests                        |
| `npm run build`   | Generate production assets in build/       |
| `npm run preview` | Serve an existing production build locally |

There are no configured lint or TypeScript-check scripts.

## Project structure

```text
FlabbyChat_Code/             Application repository
├── public/                 Favicon and crawler instructions
├── src/
│   ├── assets/             Original logo and ringtone
│   ├── components/         Screens, dialogs and shared UI
│   ├── hooks/              Team/library subscriptions
│   ├── services/           Firebase, uploads and calls
│   ├── styles/             Layout and theme CSS
│   ├── tests/              Automated tests and fixtures
│   ├── utils/              Data, demo, date/time and export helpers
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── database.rules.json
├── firebase.json
├── vercel.json
├── vite.config.js
├── package.json
└── package-lock.json
```

Private technical documents, portfolio content, visuals and college submissions are maintained in sibling folders outside this repository.

## Deployment notes

Vercel configuration uses Vite, `npm run build` and output directory `build`. Add the environment values in the hosting project before building; redeploy after changing them. Firebase Hosting configuration also targets `build/`. Publish current database rules separately when required and authorize the deployed hostname in Firebase Authentication.

Calls require HTTPS or localhost, device permissions and an open app. STUN is configured; restrictive networks may need TURN. Browser notifications also need an open app and permission.

**Live application: [flabby-chat.vercel.app](https://flabby-chat.vercel.app/)**
