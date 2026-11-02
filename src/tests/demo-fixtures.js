import { sampleChat, saveDemo } from "../utils/chat-data.js";

// Interaction tests build their own teams/files rather than relying on showcase data.
export function seedEmptyDemo() {
  const data = sampleChat();
  saveDemo({
    ...data,
    teams: {},
    library: { files: {}, folders: {} },
    messages: { welcome: data.messages.welcome, reply: data.messages.reply },
    preferences: { favorites: {}, lastRead: {} },
  });
}
