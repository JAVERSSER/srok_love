import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

interface Props {
  photos: string[];
  /** Index of the photo to open on; null closes the preview. */
  index: number | null;
  onClose: () => void;
  /** Shows a "Change photo" button on the first photo when given. */
  onChangeMain?: () => void;
}

/** Full-screen photo gallery: swipe (or use the arrows) to move between photos. */
export function PhotoPreview({ photos, index, onClose, onChangeMain }: Props) {
  const { width, height } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const visible = index !== null && photos.length > 0;

  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    // Wait a frame so the ScrollView has laid out before jumping.
    requestAnimationFrame(() => scroller.current?.scrollTo({ x: index * width, animated: false }));
  }, [index, width]);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, i));
    setCurrent(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== current && i >= 0 && i < photos.length) setCurrent(i);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
        >
          {photos.map((uri, i) => (
            <Pressable key={uri + i} style={{ width, height }} onPress={onClose}>
              <Image source={{ uri }} style={{ width, height }} contentFit="contain" transition={150} />
            </Pressable>
          ))}
        </ScrollView>

        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="box-none">
            <Text style={styles.counter}>
              {photos.length > 1 ? `${current + 1} / ${photos.length}` : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close preview"
              onPress={onClose}
              hitSlop={12}
              style={styles.roundBtn}
            >
              <Ionicons name="close" size={26} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.middle} pointerEvents="box-none">
            {current > 0 ? (
              <Pressable accessibilityLabel="Previous photo" onPress={() => goTo(current - 1)} style={styles.roundBtn}>
                <Ionicons name="chevron-back" size={26} color={colors.white} />
              </Pressable>
            ) : (
              <View />
            )}
            {current < photos.length - 1 ? (
              <Pressable accessibilityLabel="Next photo" onPress={() => goTo(current + 1)} style={styles.roundBtn}>
                <Ionicons name="chevron-forward" size={26} color={colors.white} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.bottom} pointerEvents="box-none">
            {photos.length > 1 && (
              <View style={styles.dots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
                ))}
              </View>
            )}
            {onChangeMain && current === 0 ? (
              <Pressable
                style={styles.changeBtn}
                onPress={() => {
                  onClose();
                  onChangeMain();
                }}
              >
                <Ionicons name="camera" size={18} color={colors.white} />
                <Text style={styles.changeText}>Change photo</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  counter: { color: colors.white, fontWeight: "700", fontSize: font.body, paddingLeft: spacing.sm },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  middle: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  bottom: { alignItems: "center", paddingBottom: spacing.xxl, gap: spacing.lg },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: colors.white, width: 18 },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  changeText: { color: colors.white, fontWeight: "700", fontSize: font.body },
});
