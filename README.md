# FlabbyChat

A college project for chat, calls and team collaboration.

FlabbyChat brings conversations, project tasks and shared documents into one app. It keeps a simple interface with the original logo, cyan/violet accents, and light and dark themes.

## Features

- Verified accounts, password reset and editable profiles.
- Channels and private chats with replies, favorites and attachments.
- Private voice/video calls with calling sounds and call history.
- Teams, projects, tasks, calendars and discussion boards.
- Personal and team file libraries with in-app previews and copy/move options.
- Dashboard charts, search, notifications and appearance settings.

## Built with

React, Vite, Firebase Authentication and Realtime Database, Cloudinary, WebRTC and PDF.js.

## Run locally

Use Node.js 24 and npm.

1. Copy [.env.example](.env.example) to `.env.local` and add your Firebase and Cloudinary configuration.
2. Enable Firebase Email/Password authentication and publish [database.rules.json](database.rules.json).
3. Configure a Cloudinary unsigned upload preset for supported images and PDFs, with PDF delivery enabled.

```sh
npm ci
npm start
```

Open the local URL printed in the terminal. Demo mode is available without cloud setup.

## Other commands

```sh
npm test
npm run build
npm run preview
```

Calls need HTTPS or localhost and microphone/camera permission. Cloudinary file links can be opened by anyone who has the URL; use ordinary project files rather than confidential documents.

[GitHub repository](https://github.com/mayurbohraa/FlabbyChat)
