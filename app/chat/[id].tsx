import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { MessageBubble, BubblePosition } from "@/components/MessageBubble";
import type { Message, UserProfile } from "@/models";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

// Messages from the same sender closer together than this are grouped.
const GROUP_GAP_MS = 5 * 60 * 1000;
// Messages younger than this animate in (i.e. ones that just arrived).
const FRESH_MS = 2000;

// Desktop browsers: Enter sends, Shift+Enter adds a line. On phones Enter
// stays a newline, like other chat apps.
const enterSends =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(pointer: fine)").matches;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const daysAgo = (today.getTime() - d.getTime()) / 86_400_000;
  if (daysAgo < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

type Row =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: Message;
      position: BubblePosition;
      showTime: boolean;
      sent: boolean;
    };

// Turns a sorted conversation into list rows: a divider at each new day, and
// each message tagged with its place in its sender group.
function buildRows(convo: Message[]): Row[] {
  const rows: Row[] = [];
  const joins = (a: Message | undefined, b: Message | undefined) =>
    !!a &&
    !!b &&
    a.senderId === b.senderId &&
    dayKey(a.createdAt) === dayKey(b.createdAt) &&
    Date.parse(b.createdAt) - Date.parse(a.createdAt) < GROUP_GAP_MS;

  convo.forEach((m, i) => {
    const prev = convo[i - 1];
    const next = convo[i + 1];
    if (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)) {
      rows.push({ kind: "day", key: `day_${dayKey(m.createdAt)}`, label: formatDay(m.createdAt) });
    }
    const above = joins(prev, m);
    const below = joins(m, next);
    const position: BubblePosition =
      above && below ? "middle" : above ? "last" : below ? "first" : "single";
    rows.push({
      kind: "msg",
      key: m.id,
      message: m,
      position,
      showTime: !below,
      sent: m.senderId === "me" && i === convo.length - 1,
    });
  });
  return rows;
}

// Conversation starters drawn from the match's profile.
function buildIcebreakers(user: UserProfile): string[] {
  const ideas = [`Hi ${user.name}! 👋 How's your day going?`];
  if (user.interests[0]) {
    ideas.push(`I see you're into ${user.interests[0]} — how did you get started?`);
  }
  ideas.push(`What's your favourite place to hang out in ${user.city ?? user.location}?`);
  return ideas;
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getUserById = useAppStore((s) => s.getUserById);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const allMessages = useAppStore((s) => s.messages);
  const privacy = useAppStore((s) => s.privacy);

  const user = getUserById(id);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // On web, react-native-web's TextInput ref is the underlying <textarea>.
  const inputEl = () =>
    Platform.OS === "web" ? (inputRef.current as unknown as HTMLTextAreaElement | null) : null;

  // Focusing an input that the keyboard will cover makes iOS Safari pan the
  // whole page up, and then our viewport pinning (app/_layout.tsx) moves it
  // back: the screen visibly jumps. `preventScroll` stops the pan, so the
  // only movement left is the app shrinking to fit above the keyboard.
  const focusInput = useCallback(() => {
    const el = inputEl();
    if (el) el.focus({ preventScroll: true });
    else inputRef.current?.focus();
  }, []);

  // Route the user's own first tap on the input through focusInput too,
  // since a native tap-to-focus would trigger the same pan.
  const hasUser = !!user;
  useEffect(() => {
    const el = inputEl();
    if (!el) return;
    const onTouchEnd = (e: TouchEvent) => {
      if (document.activeElement === el) return; // already focused: allow caret moves
      e.preventDefault();
      focusInput();
    };
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => el.removeEventListener("touchend", onTouchEnd);
  }, [hasUser, focusInput]);

  // Memoized: the screen re-renders on every keystroke, and re-filtering and
  // re-sorting all messages each time makes typing lag.
  const convo = useMemo(
    () =>
      allMessages
        .filter((m) => m.conversationId === `conv_${id}`)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allMessages, id]
  );

  // The list is inverted (newest at offset 0), so "bottom of the chat" is the
  // top of the scroll. If the user had scrolled up, bring them back down.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [convo.length]);

  // Newest first, to match the inverted list.
  const rows = useMemo(() => buildRows(convo).reverse(), [convo]);

  const renderItem = useCallback(({ item }: { item: Row }) => {
    if (item.kind === "day") {
      return <Text style={styles.day}>{item.label}</Text>;
    }
    const { message } = item;
    return (
      <MessageBubble
        text={message.text}
        mine={message.senderId === "me"}
        position={item.position}
        time={item.showTime ? formatTime(message.createdAt) : undefined}
        sent={item.sent}
        animateIn={Date.now() - Date.parse(message.createdAt) < FRESH_MS}
      />
    );
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.unavailable}>Conversation unavailable.</Text>
      </SafeAreaView>
    );
  }

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(user.id, trimmed);
    setText("");
    // Tapping the send button steals focus from the input, which closes the
    // keyboard. Refocusing within the same tap keeps it open so the user can
    // keep typing.
    focusInput();
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!enterSends) return;
    const { key, shiftKey } = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (key === "Enter" && !shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const pickIcebreaker = (idea: string) => {
    setText(idea);
    focusInput();
  };

  const canSend = text.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <ProfilePhoto uri={user.photos[0]} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          {privacy.showOnlineStatus && <Text style={styles.online}>Online</Text>}
        </View>
        <Pressable onPress={() => router.push(`/profile/${user.id}`)} hitSlop={10}>
          <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        // Inverted, like native chat apps: the list is anchored to the bottom,
        // so when the keyboard shrinks it the latest messages stay put instead
        // of the list re-scrolling on every frame of the keyboard animation.
        inverted={rows.length > 0}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <ProfilePhoto uri={user.photos[0]} size={72} />
            <Text style={styles.emptyTitle}>You matched with {user.name}!</Text>
            <Text style={styles.emptyText}>Not sure what to say? Tap one to start.</Text>
            <View style={styles.ideas}>
              {buildIcebreakers(user).map((idea) => (
                <Pressable
                  key={idea}
                  onPress={() => pickIcebreaker(idea)}
                  style={({ pressed }) => [styles.idea, pressed && styles.ideaPressed]}
                >
                  <Text style={styles.ideaText}>{idea}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={renderItem}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputBar}>
          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              multiline
              onKeyPress={onKeyPress}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !canSend && styles.sendDisabled,
                pressed && styles.sendPressed,
              ]}
              onPress={send}
              disabled={!canSend}
            >
              <Ionicons name="send" size={16} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  name: { fontSize: font.title, fontWeight: "700", color: colors.text },
  online: { fontSize: font.small, color: colors.success },
  messages: { padding: spacing.lg, flexGrow: 1 },
  day: {
    alignSelf: "center",
    fontSize: font.tiny,
    fontWeight: "600",
    color: colors.textTertiary,
    marginVertical: spacing.md,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: font.title, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
  ideas: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.lg },
  idea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ideaPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  ideaText: { fontSize: font.body, color: colors.text },
  inputBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  // Input and send button share one pill, ChatGPT-style.
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    // 16px minimum: anything smaller makes iOS Safari zoom in on focus.
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
    marginRight: spacing.sm,
    maxHeight: 120,
    ...Platform.select({ web: { outlineStyle: "none" } as object }),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: colors.textTertiary },
  sendPressed: { transform: [{ scale: 0.88 }] },
  unavailable: { textAlign: "center", marginTop: spacing.xxl, color: colors.textSecondary },
});
