import { create } from "zustand";
import { storage, KEYS } from "@/services/storage";
import { mockUsers } from "@/data/users";
import { defaultCurrentUser, seedNotifications } from "@/data/seed";
import {
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

// Simulate mutual interest: a subset of mock users will "like back".
const MUTUAL_LIKERS = new Set([
  "u1", "u3", "u5", "u7", "u10", "u13", "u17", "u2",
]);

interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  loggedIn: boolean;

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
  login: () => void;
  logout: () => Promise<void>;

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

  currentUser: defaultCurrentUser,
  users: mockUsers,
  likes: [],
  passes: [],
  matches: [],
  messages: [],
  notifications: seedNotifications,
  preference: defaultPreference,
  privacy: defaultPrivacy,
  blocked: [],
  reports: [],

  lastMatch: null,

  hydrate: async () => {
    const [
      onboarded,
      loggedIn,
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
      onboarded: onboarded ?? false,
      loggedIn: loggedIn ?? false,
      currentUser: currentUser ?? defaultCurrentUser,
      likes: likes ?? [],
      passes: passes ?? [],
      matches: matches ?? [],
      messages: messages ?? [],
      preference: preference ?? defaultPreference,
      privacy: privacy ?? defaultPrivacy,
      blocked: blocked ?? [],
      notifications: notifications ?? seedNotifications,
    });
  },

  setOnboarded: (v) => {
    set({ onboarded: v });
    persist(get());
  },

  login: () => {
    set({ loggedIn: true });
    persist(get());
  },

  logout: async () => {
    await storage.clearAll();
    set({
      onboarded: false,
      loggedIn: false,
      currentUser: defaultCurrentUser,
      likes: [],
      passes: [],
      matches: [],
      messages: [],
      preference: defaultPreference,
      privacy: defaultPrivacy,
      blocked: [],
      notifications: seedNotifications,
      lastMatch: null,
    });
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

    const willMatch =
      MUTUAL_LIKERS.has(targetId) &&
      !state.matches.some((m) => m.matchedUserId === targetId);

    let matches = state.matches;
    let lastMatch = state.lastMatch;
    let notifications = state.notifications;

    if (willMatch) {
      const match: Match = {
        id: `match_${Date.now()}_${targetId}`,
        userId: "me",
        matchedUserId: targetId,
        createdAt: new Date().toISOString(),
      };
      matches = [...matches, match];
      lastMatch = state.users.find((u) => u.id === targetId) ?? null;
      notifications = [
        {
          id: `n_${Date.now()}`,
          type: "match",
          text: `You matched with ${lastMatch?.name ?? "someone"}!`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...notifications,
      ];
    }

    set({ likes, matches, lastMatch, notifications });
    persist(get());
    return willMatch;
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
    persist(get());

    // Simulate a reply after a short delay (demo only).
    setTimeout(() => {
      const reply: Message = {
        id: `msg_${Date.now()}_r`,
        conversationId,
        senderId: otherUserId,
        text: pickReply(),
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, reply] }));
      persist(get());
    }, 1400);
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

const replies = [
  "Hi! 👋 How are you?",
  "Nice to meet you 😊",
  "Haha that's great!",
  "What do you like to do on weekends?",
  "I love that too!",
  "Where in Cambodia are you from?",
  "Sounds good to me 🙌",
];
function pickReply(): string {
  return replies[Math.floor(Math.random() * replies.length)];
}
