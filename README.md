# FlabbyChat

[Live app](https://flabby-chat.vercel.app/)

Chat, calls and team collaboration for student teams.

FlabbyChat is my college major project, bringing conversations, project tasks and shared documents into one app. I worked on project planning, research, full-stack development, UI design and the original FlabbyChat logo. The interface uses cyan/violet accents with light and dark themes.

## Main features

- Verified accounts, password reset and editable profiles.
- Channels and private chats with replies, favorites and attachments.
- Private voice/video calls, notifications and call history.
- Teams, projects, tasks, calendars, discussion boards and dashboard charts.
- Personal/team file libraries with previews, downloads and copy/move options.

## Tech stack

| Purpose                | Technology                                    |
| ---------------------- | --------------------------------------------- |
| Frontend               | React, Vite, CSS and Lucide icons             |
| Accounts and live data | Firebase Authentication and Realtime Database |
| Files and previews     | Cloudinary and PDF.js                         |
| Voice/video calls      | WebRTC                                        |
| Testing                | Vitest and React Testing Library              |

## Local setup

Install **Node.js 24**, npm and Git, then clone the project:

```sh
git clone https://github.com/mayurbohraa/FlabbyChat.git
cd FlabbyChat
npm ci
```

Copy [.env.example](.env.example) to `.env.local` in the project root. Fill in these values after completing the service setup below:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=your_realtime_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_web_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

Use your Firebase Web app configuration, not admin credentials. Keep Cloudinary API secrets out of frontend variables. `.env.local` is ignored by Git.

## Firebase setup

1. Create or select a Firebase project and [register a Web app](https://firebase.google.com/docs/web/setup).
2. Enable [Email/Password](https://firebase.google.com/docs/auth/web/password-auth) under Authentication's sign-in methods.
3. Create a [Realtime Database](https://firebase.google.com/docs/database/web/start). Copy its exact URL into `VITE_FIREBASE_DATABASE_URL`.
4. In Realtime Database > Rules, replace the rules with [database.rules.json](database.rules.json) and publish them.
5. Copy the Web app's `apiKey`, `authDomain`, `projectId` and `appId` into their matching environment variables. Add `localhost` to Authentication's authorized domains if it is missing; add your hostname when deploying.

## Cloudinary setup

1. Create or select a Cloudinary account and copy its **Cloud name** into `VITE_CLOUDINARY_CLOUD_NAME`.
2. In Console Settings > Upload > Upload Presets, create an [unsigned upload preset](https://cloudinary.com/documentation/upload_presets). Save its name in `VITE_CLOUDINARY_UPLOAD_PRESET`.
3. Set the preset's allowed formats to `jpg,jpeg,png,webp,gif,pdf`.
4. In Console Settings > Security, enable **Allow delivery of PDF and ZIP files** for [PDF delivery](https://cloudinary.com/documentation/pdf_optimization). The app accepts PDFs and supported images, with a 5 MB upload limit.

No upload server or S3 bucket is required for this setup. Cloudinary delivery links are accessible to anyone who has the URL.

## Run the app

```sh
npm start
```

Open the URL printed by Vite, usually `http://127.0.0.1:5173`. Restart the server after changing `.env.local`. For real accounts, sign up and verify your email before entering the app. Demo mode is available without cloud configuration.

Calls require HTTPS or localhost and microphone/camera permission.

## Other commands

| Command           | Purpose                                 |
| ----------------- | --------------------------------------- |
| `npm test`        | Run automated tests                     |
| `npm run build`   | Create the production build in `build/` |
| `npm run preview` | Preview the production build locally    |

## Deploy on Vercel

Import this repository as a Vite project. The included [vercel.json](vercel.json) sets the build command to `npm run build` and the output directory to `build`.

Add the seven `VITE_` variables from `.env.example` to the Vercel project's environment variables before deploying; your local `.env.local` is not uploaded. Add the deployed hostname to Firebase Authentication's authorized domains. Redeploy after changing environment values.
