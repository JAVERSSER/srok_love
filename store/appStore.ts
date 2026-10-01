import { create } from "zustand";
import { storage, KEYS } from "@/services/storage";
import { defaultCurrentUser } from "@/data/seed";
import * as api from "@/services/api";
import { AUTH_DISABLED } from "@/constants/api";
import { provinceCoords } from "@/constants/provinces";
import {
  Account,
  Conversation,
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
  // Every other user we've seen from discover, matches or chats, by id.
  users: UserProfile[];
  // Ids returned by the last discover call, in the server's order.
  discoverIds: string[];
  likes: Like[];
  passes: string[];
  matches: Match[];
  conversations: Conversation[];
  // Loaded per chat room from the server; not persisted.
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
  // Replaces the round profile picture (avatar). The gallery is untouched.
  // Throws api.ApiError on failure.
  setProfilePhoto: (image: api.LocalImage) => Promise<void>;
  // Uploads photos and appends them to the gallery (myPhotos) in order. If
  // some uploads fail, the rest are still saved and an error is thrown.
  addPhotos: (images: api.LocalImage[]) => Promise<void>;
  // Takes a photo out of the gallery.
  removePhoto: (id: number) => Promise<void>;

  // Local-only change (fields the backend doesn't store, or AUTH_DISABLED).
  updateCurrentUser: (patch: Partial<UserProfile>) => void;
  // Saves locally and sends name/bio/gender/interests and the province's
  // location to the backend. Throws api.ApiError on failure.
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;

  // Pulls everything from the server after login or app start. Never throws.
  syncAll: () => Promise<void>;
  loadMyProfile: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  // Returns the users we newly matched with since the last refresh.
  refreshMatches: () => Promise<UserProfile[]>;
  refreshChats: () => Promise<void>;
  // Called when the match socket reports a new match.
  onMatchEvent: () => Promise<void>;

  likeUser: (targetId: string, superLike?: boolean) => Promise<boolean>; // resolves to isMatch
  passUser: (targetId: string) => Promise<void>;

  getRoomId: (otherUserId: string) => number | undefined;
  getConversation: (otherUserId: string) => Message[];
  loadMessages: (roomId: number) => Promise<void>;
  // A message as sent over the socket, shown until the server echoes it.
  addPendingMessage: (roomId: number, text: string) => void;
  // A raw message payload from the chat socket.
  receiveMessage: (roomId: number, data: Record<string, unknown>) => void;
  markRoomRead: (roomId: number) => Promise<void>;

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
  storage.set(KEYS.users, state.users);
  storage.set(KEYS.likes, state.likes);
  storage.set(KEYS.passes, state.passes);
  storage.set(KEYS.matches, state.matches);
  storage.set(KEYS.preferences, state.preference);
  storage.set(KEYS.privacy, state.privacy);
  storage.set(KEYS.blocked, state.blocked);
  storage.set(KEYS.notifications, state.notifications);
}

// Different endpoints return different slices of a user (discover has bio and
// distance, matches only username and avatar), so merge rather than replace.
function mergeUsers(existing: UserProfile[], incoming: UserProfile[]): UserProfile[] {
  const byId = new Map(existing.map((u) => [u.id, u]));
  for (const u of incoming) {
    const prev = byId.get(u.id);
    if (!prev) {
      byId.set(u.id, u);
      continue;
    }
    byId.set(u.id, {
      ...prev,
      name: u.name || prev.name,
      username: u.username ?? prev.username,
      age: u.age || prev.age,
      gender: u.gender ?? prev.gender,
      location: u.location || prev.location,
      bio: u.bio || prev.bio,
      avatar: u.avatar || prev.avatar,
      telegram: u.telegram ?? prev.telegram,
      facebook: u.facebook ?? prev.facebook,
      photos: u.photos.length ? u.photos : prev.photos,
      interests: u.interests.length ? u.interests : prev.interests,
      distanceKm: u.distanceKm ?? prev.distanceKm,
    });
  }
  return [...byId.values()];
}

export const MAX_PHOTOS = 9;

// Sends the gallery's order to the server, then mirrors it locally.
async function savePhotos(photos: ProfilePhoto[]) {
  if (!AUTH_DISABLED) await api.assignPhotos(photos.map((p) => p.id));
  useAppStore.setState((s) => ({
    myPhotos: photos,
    currentUser: { ...s.currentUser, photos: photos.map((p) => p.url) },
  }));
  persist(useAppStore.getState());
}

function byTime(a: Message, b: Message) {
  return a.createdAt.localeCompare(b.createdAt);
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  loggedIn: false,
  account: null,
  myPhotos: [],
  pendingPhoto: null,

  currentUser: defaultCurrentUser,
  users: [],
  discoverIds: [],
  likes: [],
  passes: [],
  matches: [],
  conversations: [],
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
      users,
      likes,
      passes,
      matches,
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
      storage.get<UserProfile[]>(KEYS.users),
      storage.get<Like[]>(KEYS.likes),
      storage.get<string[]>(KEYS.passes),
      storage.get<Match[]>(KEYS.matches),
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
      users: users ?? [],
      likes: likes ?? [],
      passes: passes ?? [],
      // Matches saved by older builds have no chat room; they're refetched.
      matches: (matches ?? []).filter((m) => m.roomId != null),
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
      // A fresh account starts with a blank profile and no history.
      currentUser: defaultCurrentUser,
      myPhotos: [],
      users: [],
      discoverIds: [],
      likes: [],
      passes: [],
      matches: [],
      conversations: [],
      messages: [],
      notifications: [],
    });
    persist(get());
  },

  login: async (loginId, password) => {
    const user = await api.login(loginId, password);
    const sameAccount = get().account?.username === user.username;
    set({
      account: { username: user.username, userId: user.id, createdAt: new Date().toISOString() },
      loggedIn: true,
      onboarded: true,
      // Someone else's data must not carry over to this account.
      ...(sameAccount
        ? {}
        : {
            currentUser: defaultCurrentUser,
            myPhotos: [],
            users: [],
            discoverIds: [],
            likes: [],
            passes: [],
            matches: [],
            conversations: [],
            messages: [],
            notifications: [],
            blocked: [],
          }),
    });
    // The tabs layout calls syncAll once it opens.
    persist(get());
  },

  // Ends the session but keeps the profile on this device.
  logout: () => {
    api.clearTokens();
    set({ loggedIn: false, lastMatch: null, messages: [], conversations: [] });
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

  // The avatar is what other people see in lists, chats and matches.
  setProfilePhoto: async (image) => {
    const avatar = AUTH_DISABLED ? image.uri : await api.uploadAvatar(image);
    set((s) => ({ currentUser: { ...s.currentUser, avatar: avatar || image.uri } }));
    persist(get());
  },

  addPhotos: async (images) => {
    const room = MAX_PHOTOS - get().myPhotos.length;
    if (room <= 0) throw new Error(`You can add up to ${MAX_PHOTOS} photos.`);
    const results = await Promise.allSettled(
      images.slice(0, room).map((image, i) =>
        AUTH_DISABLED ? Promise.resolve({ id: Date.now() + i, url: image.uri }) : api.uploadPhoto(image)
      )
    );
    const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [{ id: r.value.id, url: r.value.url }] : []));
    if (uploaded.length) await savePhotos([...get().myPhotos, ...uploaded]);
    const failed = results.length - uploaded.length;
    if (failed) throw new Error(`${failed} photo${failed > 1 ? "s" : ""} couldn't be uploaded. Please try again.`);
  },

  removePhoto: async (id) => {
    await savePhotos(get().myPhotos.filter((p) => p.id !== id));
  },

  updateCurrentUser: (patch) => {
    set((s) => ({ currentUser: { ...s.currentUser, ...patch } }));
    persist(get());
  },

  saveProfile: async (patch) => {
    const before = get().currentUser;
    get().updateCurrentUser(patch);
    if (AUTH_DISABLED) return;
    const u = get().currentUser;
    await api.updateProfile({
      name: u.name,
      bio: u.bio,
      ...(u.gender ? { gender: u.gender } : {}),
      interests: u.interests,
      telegram: u.telegram ?? "",
      facebook: u.facebook ?? "",
    });
    const coords = provinceCoords[u.location];
    if (coords && (u.location !== before.location || patch.location !== undefined)) {
      await api.updateLocation(coords.latitude, coords.longitude);
      get().refreshDiscover().catch(() => {});
    }
  },

  syncAll: async () => {
    if (AUTH_DISABLED) return;
    const s = get();
    await s.loadMyProfile().catch(() => {});
    // Discover only works once the server has a location for us.
    const coords = provinceCoords[get().currentUser.location];
    if (coords) await api.updateLocation(coords.latitude, coords.longitude).catch(() => {});
    await Promise.all([
      s.refreshDiscover().catch(() => {}),
      s.refreshMatches().catch(() => {}),
      s.refreshChats().catch(() => {}),
    ]);
  },

  loadMyProfile: async () => {
    const p = await api.getProfile();
    const gallery: ProfilePhoto[] = api.sortPhotos(p.photos).map(({ id, url }) => ({ id, url }));
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        name: p.name || s.currentUser.name,
        age: p.age || s.currentUser.age,
        gender: p.gender ?? s.currentUser.gender,
        interests: p.interests.length ? p.interests : s.currentUser.interests,
        telegram: p.telegram ?? s.currentUser.telegram,
        facebook: p.facebook ?? s.currentUser.facebook,
        avatar: p.avatarUrl || s.currentUser.avatar,
        photos: gallery.map((g) => g.url),
      },
      myPhotos: gallery,
    }));
    persist(get());
  },

  refreshDiscover: async () => {
    const found = await api.discover();
    set((s) => ({
      users: mergeUsers(s.users, found),
      discoverIds: found.map((u) => u.id),
    }));
    persist(get());
  },

  refreshMatches: async () => {
    const entries = await api.getMatches();
    const known = new Set(get().matches.map((m) => m.matchedUserId));
    set((s) => ({
      users: mergeUsers(s.users, entries.map((e) => e.user)),
      matches: entries.map((e) => e.match),
    }));
    persist(get());
    return entries
      .filter((e) => !known.has(e.match.matchedUserId))
      .map((e) => get().getUserById(e.match.matchedUserId) ?? e.user);
  },

  refreshChats: async () => {
    const entries = await api.getChats();
    set((s) => ({
      users: mergeUsers(s.users, entries.map((e) => e.user)),
      conversations: entries.map((e) => e.conversation),
    }));
  },

  onMatchEvent: async () => {
    const fresh = await get().refreshMatches();
    if (!fresh.length) return;
    set((s) => ({
      lastMatch: s.lastMatch ?? fresh[0],
      notifications: [
        ...fresh.map((u) => ({
          id: `notif_match_${u.id}_${Date.now()}`,
          type: "match" as const,
          text: `You matched with ${u.name}!`,
          createdAt: new Date().toISOString(),
          read: false,
        })),
        ...s.notifications,
      ],
    }));
    persist(get());
    get().refreshChats().catch(() => {});
  },

  likeUser: async (targetId, superLike = false) => {
    const state = get();
    if (!state.likes.some((l) => l.userId === "me" && l.targetId === targetId)) {
      const newLike: Like = {
        id: `like_${Date.now()}_${targetId}`,
        userId: "me",
        targetId,
        superLike,
        createdAt: new Date().toISOString(),
      };
      set({ likes: [...state.likes, newLike] });
      persist(get());
    }
    if (AUTH_DISABLED) return false;

    // The backend has no super like, so it's sent as a normal like. The swipe
    // response doesn't say whether it matched, so check the match list.
    await api.swipe(targetId, "like");
    const fresh = await get().refreshMatches();
    const matched = fresh.find((u) => u.id === targetId);
    if (matched) {
      set((s) => ({
        lastMatch: matched,
        notifications: [
          {
            id: `notif_match_${matched.id}_${Date.now()}`,
            type: "match",
            text: `You matched with ${matched.name}!`,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...s.notifications,
        ],
      }));
      persist(get());
      get().refreshChats().catch(() => {});
    }
    return !!matched;
  },

  passUser: async (targetId) => {
    set((s) => ({
      passes: s.passes.includes(targetId) ? s.passes : [...s.passes, targetId],
    }));
    persist(get());
    if (!AUTH_DISABLED) await api.swipe(targetId, "pass");
  },

  getRoomId: (otherUserId) => {
    const s = get();
    return (
      s.matches.find((m) => m.matchedUserId === otherUserId)?.roomId ??
      s.conversations.find((c) => c.otherUserId === otherUserId)?.roomId
    );
  },

  getConversation: (otherUserId) => {
    const roomId = get().getRoomId(otherUserId);
    if (roomId == null) return [];
    return get()
      .messages.filter((m) => m.conversationId === String(roomId))
      .sort(byTime);
  },

  loadMessages: async (roomId) => {
    const loaded = await api.getMessages(roomId, get().account?.userId ?? null);
    const key = String(roomId);
    set((s) => ({
      // Keep unsent messages; everything else comes from the server.
      messages: [
        ...s.messages.filter((m) => m.conversationId !== key || m.pending),
        ...loaded,
      ],
    }));
  },

  addPendingMessage: (roomId, text) => {
    const msg: Message = {
      id: `local_${Date.now()}`,
      conversationId: String(roomId),
      senderId: "me",
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  receiveMessage: (roomId, data) => {
    const msg = api.toMessage(data, roomId, get().account?.userId ?? null);
    const key = String(roomId);
    set((s) => {
      // The server echoes our own messages back: swap out the pending copy.
      if (msg.senderId === "me") {
        const i = s.messages.findIndex(
          (m) => m.pending && m.conversationId === key && m.text === msg.text
        );
        if (i >= 0) {
          const messages = [...s.messages];
          messages[i] = msg;
          return { messages };
        }
      }
      if (s.messages.some((m) => m.id === msg.id)) return {};
      return { messages: [...s.messages, msg] };
    });
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.roomId === roomId ? { ...c, lastMessage: msg.text, lastActivity: msg.createdAt } : c
      ),
    }));
  },

  markRoomRead: async (roomId) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.roomId === roomId ? { ...c, unread: 0 } : c)),
    }));
    await api.markRead(roomId);
  },

  setPreference: (patch) => {
    set((s) => ({ preference: { ...s.preference, ...patch } }));
    persist(get());
  },

  setPrivacy: (patch) => {
    set((s) => ({ privacy: { ...s.privacy, ...patch } }));
    persist(get());
  },

  // The backend has no block or report endpoints yet, so these stay on the
  // device: blocked users are hidden from Discover, Matches and Messages.
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
    // Discover keeps returning people we've already swiped on.
    const swiped = new Set([
      ...s.likes.filter((l) => l.userId === "me").map((l) => l.targetId),
      ...s.passes,
    ]);
    const matched = new Set(s.matches.map((m) => m.matchedUserId));
    const pref = s.preference;

    return s.discoverIds
      .map((id) => s.users.find((u) => u.id === id))
      .filter((u): u is UserProfile => {
        if (!u) return false;
        if (blockedIds.has(u.id) || swiped.has(u.id) || matched.has(u.id)) return false;
        // Discover doesn't return age or gender, so only filter when known.
        if (u.age > 0 && (u.age < pref.ageMin || u.age > pref.ageMax)) return false;
        if (u.gender && pref.interestedIn === "Men" && u.gender !== "male") return false;
        if (u.gender && pref.interestedIn === "Women" && u.gender !== "female") return false;
        if (u.distanceKm != null && u.distanceKm > pref.distanceKm) return false;
        return true;
      });
  },
}));

// If the refresh token expires, drop back to the welcome/login flow.
api.setOnSessionExpired(() => {
  if (AUTH_DISABLED) return;
  if (useAppStore.getState().loggedIn) useAppStore.getState().logout();
});
