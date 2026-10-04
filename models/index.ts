export type Gender = "male" | "female";

/** The round thumbnail for a user: their avatar, else their first photo. */
export function avatarOf(u: { avatar?: string; photos: string[] } | null | undefined): string {
  return u?.avatar || u?.photos[0] || "";
}

/** "@name", "t.me/name" or a full link → "name". */
export function normalizeTelegram(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?(t|telegram)\.me\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

/** "facebook.com/name", "web.facebook.com/name/" or "name" → "name". */
export function normalizeFacebook(input: string): string {
  const s = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^([a-z]+\.)?(facebook|fb)\.com\//i, "");
  // profile.php?id=123 keeps its id; anything else is a username.
  const id = s.match(/^profile\.php\?id=(\d+)/i);
  return id ? id[1] : s.replace(/^@/, "").split(/[/?#]/)[0];
}

export const telegramUrl = (name: string) => `https://t.me/${name}`;
export const facebookUrl = (name: string) =>
  /^\d+$/.test(name) ? `https://www.facebook.com/profile.php?id=${name}` : `https://www.facebook.com/${name}`;

/** The photos for a card or full profile: the gallery, else just the avatar. */
export function galleryOf(u: { avatar?: string; photos: string[] }): string[] {
  return u.photos.length ? u.photos : u.avatar ? [u.avatar] : [];
}

export interface UserProfile {
  id: string;
  username?: string;
  name: string;
  age: number; // 0 when unknown (the discover API doesn't return it)
  dateOfBirth?: string; // YYYY-MM-DD; when set, age is calculated from it
  gender?: Gender;
  location: string; // province
  city?: string;
  bio: string;
  // The round profile picture shown in lists, chats and matches.
  avatar?: string;
  // The photo gallery shown on cards and the full profile, kept separate from the avatar.
  photos: string[];
  interests: string[];
  occupation?: string;
  education?: string;
  height?: string;
  relationshipGoal?: string;
  // Social accounts, shown to matches only. Telegram is a username without
  // "@"; Facebook is a username or numeric profile id.
  telegram?: string;
  facebook?: string;
  verified?: boolean;
  distanceKm?: number;
}

export interface Like {
  id: string;
  userId: string; // who liked
  targetId: string; // who was liked
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  roomId?: number; // the chat room the backend opened for this match
  compatibility?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string; // "me" for our own messages
  text: string;
  createdAt: string;
  read?: boolean;
  // Sent over the socket but not yet echoed back by the server.
  pending?: boolean;
}

// A chat room from /api/chats/list/. conversationId on messages is the roomId.
export interface Conversation {
  roomId: number;
  otherUserId: string;
  lastMessage?: string;
  lastActivity?: string;
  unread: number;
}

export interface Notification {
  id: string;
  type: "like" | "message" | "match";
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Preference {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  province: string;
}

export interface Privacy {
  showProfile: boolean;
  showAge: boolean;
  showDistance: boolean;
  showOnlineStatus: boolean;
  allowMatchMessages: boolean;
}

export type ReportReason =
  | "Harassment"
  | "Fake profile"
  | "Spam"
  | "Inappropriate content"
  | "Other";

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  reason: ReportReason;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  userId: string;
  name?: string;
  avatar?: string;
  createdAt: string;
}

export interface Account {
  username: string;
  userId: string | null; // the backend's user id, when known
  createdAt: string;
}

// A photo uploaded to the backend and assigned to the user's profile.
export interface ProfilePhoto {
  id: number;
  url: string;
}
