import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { MessageBubble } from "@/components/MessageBubble";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const convo = allMessages
    .filter((m) => m.conversationId === `conv_${id}`)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [convo.length]);

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
    inputRef.current?.focus();
  };

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
        data={convo}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        // The list shrinks when the keyboard opens; keep the latest message in view.
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              You matched with {user.name}. Say hello! 👋
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble
            text={item.text}
            time={formatTime(item.createdAt)}
            mine={item.senderId === "me"}
          />
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !text.trim() && styles.sendDisabled]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxxl },
  emptyText: { color: colors.textSecondary, textAlign: "center" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.body,
    color: colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: colors.textTertiary },
  unavailable: { textAlign: "center", marginTop: spacing.xxl, color: colors.textSecondary },
});
