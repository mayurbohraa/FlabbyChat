# FlabbyChat

A college collaboration app for conversations, calls and project work.

## Overview

FlabbyChat brings group chat, private messages, tasks and shared documents into one React application. Firebase handles verified accounts and real-time data, Cloudinary stores images and PDFs, and WebRTC supports private calls. The original logo is retained, with its cyan/violet colors used in light and near-black dark themes.

Dashboard opens after login. The approved layout separates the sidebar, header and content into panels, with flat sections and simple dividers inside. The main sidebar opens each section directly; team and project choices stay inside their pages. Chat has its own conversation list beside the chat window. A shared header provides search and a notification dropdown with All/Unread filters. On mobile, the header contains menu and search buttons; search expands below it.

## Features

- Email/password login and signup, email verification, resend and password reset.
- Profile name, photo and bio editing, verified email display and password changes with current-password confirmation.
- Channels and private chats with search, image/PDF attachments, conversation drafts, timestamps and JSON export.
- Favorites for channels and private chats.
- Voice/video calls with calling sounds, mute/camera controls, snapshots, outcomes and duration in chat history. Calling controls appear only in supported, signed-in private chats; channels and demo sessions do not show them.
- Teams with owner-managed membership and separate projects.
- Assigned tasks with deadlines, priorities, status, filters and CSV export.
- Project calendar and discussion boards with replies.
- Personal/team file libraries with consistent folder rows, search, downloads and explicit sharing into a chosen chat.
- Images and PDFs open inside the app in a popup. PDF.js provides page navigation and zoom without a browser PDF plugin or external viewer.
- Notification dropdown with unread filtering and read actions; optional browser notifications.
- Light, dark and system themes; validated JSON backup import/export.
- Settings grouped into Appearance, Notifications and Backup; Profile split into Details and Password. Text buttons use a shared 40 px minimum height on desktop and 44 px on mobile; icon controls use 36 px and 44 px respectively. Small dismissible toasts confirm success, while errors stay beside the relevant form or field.

## Stack

React 19, Vite 7, Firebase Authentication and Realtime Database, Cloudinary Upload API, WebRTC, Lucide icons, PDF.js, Vitest and React Testing Library.

## Local setup

Use Node.js 24 LTS (recommended) or Node.js 22.13+. Supported Node release ranges are recorded in `package.json`.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and fill in the Firebase Web app configuration and Cloudinary values. These are frontend configuration values; never put service-account keys or Cloudinary API secrets in `VITE_` variables.

```sh
npm start
```

Open the URL printed by Vite, normally http://127.0.0.1:5173. Demo mode uses sample users and browser storage; it does not create real accounts, upload cloud files or connect calls. Password changes are available only for signed-in accounts.

## Firebase setup

1. Enable **Email/Password** in Authentication.
2. Add localhost and your deployed domain to Authentication's authorized domains, when required.
3. Create or select a Realtime Database and copy its exact URL into `.env.local`.
4. In **Realtime Database > Rules**, publish the complete `database.rules.json` supplied with this version. The team, library and call-history features need these updated paths.
5. Review verification and password-reset email templates. Sign up with an accessible email, follow the verification link, then select **I've verified my email** in the app.

Cloud data lives under `collegeChat`. Existing channel/private-message paths are retained. Earlier legacy paths are not automatically migrated or deleted. Back up existing data and rules before publishing changes to a project used by another deployed version.

## Cloudinary setup

1. Create an **Unsigned** upload preset.
2. Under the preset's **Optimize and Deliver > Allowed formats**, enter `jpg,jpeg,png,webp,gif,pdf`. Leave **Format** and incoming/eager transformations blank for this basic setup, then save.
3. Under **Settings > Security**, enable **Allow delivery of PDF and ZIP files**. The app accepts supported images and PDFs, not ZIPs.
4. Set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` in `.env.local`, then restart Vite.

The app checks a 5 MB file limit. Cloudinary presets restrict formats but do not offer a per-preset size limit. Anyone holding a delivery link can open the file, including links shared in private chats. Library permissions protect metadata rather than Cloudinary delivery. Removing a message or library reference does not delete the Cloudinary asset.

Without Cloudinary, small images can use the database fallback. Demo files are limited to 250 KB. Provider and browser quotas still apply.

## Projects, files and backups

Create a team, add registered users and create/select a project. Tasks, calendar events and discussion posts belong to the selected project. Team files are shared with that team's members; personal files belong to your own library. Sharing a file opens a conversation selector and attaches it as a draft. Press Send to publish it to that chat.

**Settings > Backup** exports personal-library metadata and selected-team project records as JSON. Import validates the backup, shows a review step and adds records with fresh IDs in one update. Existing records are preserved; account credentials and team memberships are excluded. File exports contain links rather than copies of Cloudinary assets. Unsent chat drafts last while the app is open and are not restored after a reload.

## Commands and checks

```sh
npm test
npm run build
npm run preview
```

Tests in `src/tests/` cover accounts, conversation isolation, uploads, team/project workflows, calls, mobile search, notification popups, contextual feedback and PDF rendering controls. The latest local run passed 68 tests across 12 files. External services are mocked in automated tests. Real email delivery, database permissions and device calls should also be checked with separate verified accounts.

Production output goes to `build/`. Firebase hosting configuration and database rules are included. After reviewing the rules and checking cloud workflows, deployment can be run explicitly with Firebase CLI:

```sh
firebase deploy --only hosting,database --project YOUR_PROJECT_ID
```

## Deployment and domains

- Keep local configuration in ignored `.env.local`; use `.env.example` as the setup reference. Restart Vite after changing configuration.
- A production build contains frontend configuration. Never add admin credentials, service-account files or Cloudinary API secrets to it.
- `firebase.json` serves `build/`, rewrites app routes to `index.html`, and points to `database.rules.json`. Publish the current rules as well as the frontend when enabling the new team, library and call-history paths.
- Add the final hostname to Firebase Authentication's authorized domains. For a custom domain, connect it in Firebase Hosting and apply the DNS records shown by the console. Use HTTPS for microphone/camera access outside localhost.
- After deployment, verify signup, email verification, password reset, uploads and a call between two verified accounts on separate devices. Browser permission settings and a TURN relay may affect calling.

## Verification status

The production build and automated tests pass locally. Browser review covered desktop/mobile navigation, Settings, Profile, notification dropdowns, file folders, a PDF preview, zoom, closing the viewer and downloading a local test file. Configuration checks confirmed the required Firebase and Cloudinary variables are present; they do not verify the provider-console settings or published rules. The dependency audit reported zero vulnerabilities after updating the test runner and the pinned Firebase transport dependency.

## Project structure

```text
src/
  App.jsx, main.jsx   App entry and account gate
  components/        Screens, dialogs and shared UI
  services/          Firebase, calling and file uploads
  hooks/             Team and library subscriptions
  utils/             Data, backup, export and theme helpers
  styles/            Base styles and shared UI/theme rules
  tests/             Automated checks and test setup
  assets/            Original logo and calling sound
public/              Favicon and crawler instructions
docs/local/          Case study and project details (ignored)
```

`README.md` is the only root Markdown file. Supporting documents stay local in ignored `docs/local/`. Dependencies, build output, caches, real environment values and editor files are ignored. Keep `package-lock.json`, `.env.example`, `firebase.json` and `database.rules.json` in source control. Temporary reference files and unused starter assets have been removed. Design previews remain outside the repository.

## Limitations

Calls and browser notifications require an open app. Audio autoplay may need a click. Calls require HTTPS or localhost and browser microphone/camera permissions. Some networks need a TURN relay beyond the public STUN server. This version has no group calls, recording, closed-browser push service, external productivity integrations or end-to-end encryption. Large-history pagination and timezone-aware scheduling remain future work. Cloudinary delivery links are unsuitable for confidential documents.

## Links

[Firebase setup](https://firebase.google.com/docs/auth/web/start) | [Cloudinary presets](https://cloudinary.com/documentation/upload_presets) | [PDF.js](https://mozilla.github.io/pdf.js/)

[Source repository](https://github.com/mayurbohraa/FlabbyChat). This version has not been deployed during the local update.
