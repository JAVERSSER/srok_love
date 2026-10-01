import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@sroklove:";

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore write errors in demo
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mine = keys.filter((k) => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(mine);
    } catch {
      // ignore
    }
  },
};

export const KEYS = {
  onboarded: "onboarded",
  loggedIn: "loggedIn",
  account: "account",
  tokens: "tokens",
  myPhotos: "myPhotos",
  currentUser: "currentUser",
  likes: "likes",
  passes: "passes",
  matches: "matches",
  messages: "messages",
  preferences: "preferences",
  privacy: "privacy",
  blocked: "blocked",
  notifications: "notifications",
} as const;
