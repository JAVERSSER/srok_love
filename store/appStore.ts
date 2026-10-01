import { create } from "zustand";
import { storage, KEYS } from "@/services/storage";
import { defaultCurrentUser } from "@/data/seed";
import * as api from "@/services/api";
import { AUTH_DISABLED } from "@/constants/api";
import {
  Account,
  ProfilePhoto,
  UserProfile,
  Like,
  Match,
  Message,
  Notification,
  Preference,
  Privacy,
  BlockedUser,
  Report,
  ReportReason,
} from "@/models";

const defaultPreference: Preference = {
  interestedIn: "Everyone",
  ageMin: 18,
  ageMax: 35,
  distanceKm: 50,
  province: "Phnom Penh",
};

const defaultPrivacy: Privacy = {
  showProfile: true,
  showAge: true,
  showDistance: true,
  showOnlineStatus: true,
  allowMatchMessages: true,
};

// Bump to wipe everything saved on the device the next time the app starts.
// 2: drops all data saved by the demo builds (fake profiles, matches, chats,
// notifications and placeholder photos), including the login session.
const DATA_VERSION = 2;

interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  loggedIn: boolean;
  account: Account | null;
  myPhotos: ProfilePhoto[];
  // Profile photo picked while creating a profile, before there's an account
  // to upload it to. Memory only: picker URIs don't survive a restart on web.
  pendingPhoto: api.LocalImage | null;

  currentUser: UserProfile;
  users: UserProfile[];
  likes: Like[];
  passes: string[];
  matches: Match[];
  messages: Message[];
  notifications: Notification[];
  preference: Preference;
  privacy: Privacy;
  blocked: BlockedUser[];
  reports: Report[];

  lastMatch: UserProfile | null;

  hydrate: () => Promise<void>;
  setOnboarded: (v: boolean) => void;
  // Both throw api.ApiError with a user-facing message on failure.
  register: (input: api.RegisterInput) => Promise<void>;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
  // Only used while AUTH_DISABLED: enters the app without an account.
  skipAuth: () => void;

  setPendingPhoto: (photo: api.LocalImage | null) => void;
  // Uploads pendingPhoto once logged in. Throws api.ApiError on failure.
  uploadPendingPhoto: () => Promise<void>;
  // There's one profile photo; these throw api.ApiError on failure.
  setProfilePhoto: (image: api.LocalImage) => Promise<void>;
  removeProfilePhoto: () => Promise<void>;

  updateCurrentUser: (patch: Partial<UserProfile>) => void;

  likeUser: (targetId: string, superLike?: boolean) => boolean; // returns isMatch
  passUser: (targetId: string) => void;

  sendMessage: (otherUserId: string, text: string) => void;
  getConversation: (otherUserId: string) => Message[];

  setPreference: (patch: Partial<Preference>) => void;
  setPrivacy: (patch: Partial<Privacy>) => void;

  blockUser: (targetId: string) => void;
  reportUser: (targetId: string, reason: ReportReason) => void;

  markNotificationsRead: () => void;
  clearLastMatch: () => void;

  getUserById: (id: string) => UserProfile | undefined;
  getDiscoverQueue: () => UserProfile[];
}

function persist(state: AppState) {
  storage.set(KEYS.onboarded, state.onboarded);
  storage.set(KEYS.loggedIn, state.loggedIn);
  storage.set(KEYS.account, state.account);
  storage.set(KEYS.myPhotos, state.myPhotos);
  storage.set(KEYS.currentUser, state.currentUser);
  storage.set(KEYS.likes, state.likes);
  storage.set(KEYS.passes, state.passes);
  storage.set(KEYS.matches, state.matches);
  storage.set(KEYS.messages, state.messages);
  storage.set(KEYS.preferences, state.preference);
  storage.set(KEYS.privacy, state.privacy);
  storage.set(KEYS.blocked, state.blocked);
  storage.set(KEYS.notifications, state.notifications);
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  loggedIn: false,
  account: null,
  myPhotos: [],
  pendingPhoto: null,

  currentUser: defaultCurrentUser,
  // No profile-discovery API on the backend yet, so there are no other users.
  users: [],
  likes: [],
  passes: [],
  matches: [],
  messages: [],
  notifications: [],
  preference: defaultPreference,
  privacy: defaultPrivacy,
  blocked: [],
  reports: [],

  lastMatch: null,

  hydrate: async () => {
    if ((await storage.get<number>(KEYS.dataVersion)) !== DATA_VERSION) {
      await storage.clearAll();
      await api.clearTokens();
      await storage.set(KEYS.dataVersion, DATA_VERSION);
    }

    const [
      onboarded,
      loggedIn,
      account,
      myPhotos,
      currentUser,
      likes,
      passes,
      matches,
      messages,
      preference,
      privacy,
      blocked,
      notifications,
    ] = await Promise.all([
      storage.get<boolean>(KEYS.onboarded),
      storage.get<boolean>(KEYS.loggedIn),
      storage.get<Account>(KEYS.account),
      storage.get<ProfilePhoto[]>(KEYS.myPhotos),
      storage.get<UserProfile>(KEYS.currentUser),
      storage.get<Like[]>(KEYS.likes),
      storage.get<string[]>(KEYS.passes),
      storage.get<Match[]>(KEYS.matches),
      storage.get<Message[]>(KEYS.messages),
      storage.get<Preference>(KEYS.preferences),
      storage.get<Privacy>(KEYS.privacy),
      storage.get<BlockedUser[]>(KEYS.blocked),
      storage.get<Notification[]>(KEYS.notifications),
    ]);

    set({
      hydrated: true,
      onboarded: AUTH_DISABLED || (onboarded ?? false),
      // A session without a server account (including old on-device
      // accounts, which had a passwordHash) isn't valid, so log in again.
      loggedIn:
        AUTH_DISABLED || ((loggedIn ?? false) && !!account && !("passwordHash" in account)),
      account: account ?? null,
      myPhotos: myPhotos ?? [],
      currentUser: currentUser ?? defaultCurrentUser,
      likes: likes ?? [],
      passes: passes ?? [],
      matches: matches ?? [],
      messages: messages ?? [],
      preference: preference ?? defaultPreference,
      privacy: privacy ?? defaultPrivacy,
      blocked: blocked ?? [],
      notifications: notifications ?? [],
    });
  },

  setOnboarded: (v) => {
    set({ onboarded: v });
    persist(get());
  },

  register: async (input) => {
    const user = await api.register(input);
    set({
      account: { username: user.username, userId: user.id, createdAt: new Date().toISOString() },
      loggedIn: true,
    });
    persist(get());
  },

  login: async (loginId, password) => {
    const user = await api.login(loginId, password);
    set({
      account: { username: user.username, userId: user.id, createdAt: new Date().toISOString() },
      loggedIn: true,
      onboarded: true,
    });
    persist(get());
  },

  // Ends the session but keeps the profile on this device.
  logout: () => {
    api.clearTokens();
    set({ loggedIn: false, lastMatch: null });
    persist(get());
  },

  skipAuth: () => {
    set({ loggedIn: true, onboarded: true });
    persist(get());
  },

  setPendingPhoto: (photo) => set({ pendingPhoto: photo }),

  uploadPendingPhoto: async () => {
    const pending = get().pendingPhoto;
    if (!pending) return;
    try {
      await get().setProfilePhoto(pending);
    } finally {
      set({ pendingPhoto: null });
    }
  },

  setProfilePhoto: async (image) => {
    const uploaded = await api.uploadPhoto(image);
    const myPhotos = [{ id: uploaded.id, url: uploaded.url }];
    await api.assignPhotos([uploaded.id]);
    set((s) => ({ myPhotos, currentUser: { ...s.currentUser, photos: [uploaded.url] } }));
    persist(get());
  },

  removeProfilePhoto: async () => {
    await api.assignPhotos([]);
    set((s) => ({ myPhotos: [], currentUser: { ...s.currentUser, photos: [] } }));
    persist(get());
  },

  updateCurrentUser: (patch) => {
    set((s) => ({ currentUser: { ...s.currentUser, ...patch } }));
    persist(get());
  },

  likeUser: (targetId, superLike = false) => {
    const state = get();
    const alreadyLiked = state.likes.some(
      (l) => l.userId === "me" && l.targetId === targetId
    );
    const newLike: Like = {
      id: `like_${Date.now()}_${targetId}`,
      userId: "me",
      targetId,
      superLike,
      createdAt: new Date().toISOString(),
    };
    const likes = alreadyLiked ? state.likes : [...state.likes, newLike];

    // A match needs the other person to like back, which needs a backend
    // endpoint that doesn't exist yet, so a like never matches here.
    set({ likes });
    persist(get());
    return false;
  },

  passUser: (targetId) => {
    set((s) => ({
      passes: s.passes.includes(targetId)
        ? s.passes
        : [...s.passes, targetId],
    }));
    persist(get());
  },

  sendMessage: (otherUserId, text) => {
    const conversationId = `conv_${otherUserId}`;
    const msg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    // Only messages changed; persisting everything (photos included) on every
    // send blocks the UI thread and makes the chat feel laggy.
    storage.set(KEYS.messages, get().messages);
  },

  getConversation: (otherUserId) => {
    const conversationId = `conv_${otherUserId}`;
    return get()
      .messages.filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  setPreference: (patch) => {
    set((s) => ({ preference: { ...s.preference, ...patch } }));
    persist(get());
  },

  setPrivacy: (patch) => {
    set((s) => ({ privacy: { ...s.privacy, ...patch } }));
    persist(get());
  },

  blockUser: (targetId) => {
    set((s) => ({
      blocked: s.blocked.some((b) => b.userId === targetId)
        ? s.blocked
        : [
            ...s.blocked,
            {
              id: `block_${Date.now()}`,
              userId: targetId,
              createdAt: new Date().toISOString(),
            },
          ],
      matches: s.matches.filter((m) => m.matchedUserId !== targetId),
    }));
    persist(get());
  },

  reportUser: (targetId, reason) => {
    set((s) => ({
      reports: [
        ...s.reports,
        {
          id: `report_${Date.now()}`,
          reporterId: "me",
          targetId,
          reason,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  markNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    persist(get());
  },

  clearLastMatch: () => set({ lastMatch: null }),

  getUserById: (id) => get().users.find((u) => u.id === id),

  getDiscoverQueue: () => {
    const s = get();
    const blockedIds = new Set(s.blocked.map((b) => b.userId));
    const likedIds = new Set(
      s.likes.filter((l) => l.userId === "me").map((l) => l.targetId)
    );
    const passedIds = new Set(s.passes);
    const pref = s.preference;

    return s.users.filter((u) => {
      if (blockedIds.has(u.id)) return false;
      if (likedIds.has(u.id)) return false;
      if (passedIds.has(u.id)) return false;
      if (u.age < pref.ageMin || u.age > pref.ageMax) return false;
      if (pref.interestedIn === "Men" && u.gender !== "male") return false;
      if (pref.interestedIn === "Women" && u.gender !== "female") return false;
      return true;
    });
  },
}));

// If the refresh token expires, drop back to the welcome/login flow.
api.setOnSessionExpired(() => {
  if (AUTH_DISABLED) return;
  if (useAppStore.getState().loggedIn) useAppStore.getState().logout();
});
