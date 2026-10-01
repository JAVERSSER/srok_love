export type Gender = "male" | "female";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  lookingFor?: "Men" | "Women" | "Everyone";
  location: string; // province
  city?: string;
  bio: string;
  photos: string[];
  interests: string[];
  occupation?: string;
  education?: string;
  height?: string;
  relationshipGoal?: string;
  verified?: boolean;
}

export interface Like {
  id: string;
  userId: string; // who liked
  targetId: string; // who was liked
  superLike?: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  matchId: string;
  otherUserId: string;
  lastMessage?: string;
  lastActivity: string;
}

export interface Notification {
  id: string;
  type: "like" | "message" | "match";
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Preference {
  interestedIn: "Men" | "Women" | "Everyone";
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
