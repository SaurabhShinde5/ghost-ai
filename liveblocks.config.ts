// Application-wide Liveblocks types.
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Live cursor position on the canvas, or null when off-canvas.
      cursor: { x: number; y: number } | null;
      // Whether this user is currently running an AI generation.
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Record<string, never>;

    // Custom user info attached to the session token when authenticating
    // with the secret key, for useSelf, useUser, useOthers, etc.
    UserMeta: {
      // The user's Clerk ID.
      id: string;
      info: {
        // Display name shown on cursors and avatars.
        name: string;
        // Avatar image URL.
        avatar: string;
        // Deterministic per-user cursor color.
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>;
  }
}

export {};
