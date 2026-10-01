import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "@/constants/colors";

const BAR_HEIGHT = 64;
const BAR_PADDING = 6;
const SIDE_MARGIN = 16;
const MIN_BOTTOM_GAP = 12;

// iOS 26+ gets Apple's real Liquid Glass material; everything else gets a
// frosted blur with a light rim that imitates it.
const nativeGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

const spring = { damping: 18, stiffness: 180, mass: 0.8 };

/**
 * The bar floats over the screens, so scrollable content needs this much
 * bottom padding to avoid ending up hidden behind it.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_GAP) + 12;
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const tabWidth = width > 0 ? (width - BAR_PADDING * 2) / state.routes.length : 0;

  const indicatorX = useSharedValue(0);
  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, spring);
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, MIN_BOTTOM_GAP) }]}
    >
      <View style={styles.shadow} onLayout={onLayout}>
        <View style={styles.bar}>
          {nativeGlass ? (
            <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" isInteractive />
          ) : (
            <>
              <BlurView
                style={StyleSheet.absoluteFill}
                intensity={Platform.OS === "web" ? 40 : 60}
                tint="systemChromeMaterialLight"
                experimentalBlurMethod="dimezisBlurView"
              />
              <View style={styles.tint} pointerEvents="none" />
              <View style={styles.sheen} pointerEvents="none" />
            </>
          )}

          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, { width: tabWidth }, indicatorStyle]}
            >
              {nativeGlass ? (
                <GlassView
                  style={StyleSheet.absoluteFill}
                  glassEffectStyle="clear"
                  tintColor="rgba(231,39,94,0.12)"
                />
              ) : (
                <View style={styles.indicatorFill} />
              )}
            </Animated.View>
          )}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const color = focused ? colors.primary : colors.textSecondary;
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <TabItem
                key={route.key}
                focused={focused}
                label={label}
                badge={options.tabBarBadge}
                onPress={onPress}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                accessibilityLabel={options.tabBarAccessibilityLabel}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </TabItem>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  focused,
  label,
  badge,
  onPress,
  onLongPress,
  accessibilityLabel,
  children,
}: {
  focused: boolean;
  label: string;
  badge?: string | number;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => (scale.value = withSpring(0.88, spring))}
      onPressOut={() => (scale.value = withSpring(1, spring))}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {children}
        {badge != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
  },
  shadow: {
    borderRadius: BAR_HEIGHT / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: "hidden",
    flexDirection: "row",
    padding: BAR_PADDING,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
    // Android/web blur can be faint, so keep some body behind it.
    backgroundColor: nativeGlass ? "transparent" : "rgba(255,255,255,0.35)",
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  // Bright upper rim that gives the pill its "lens" look.
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT / 2,
    borderTopLeftRadius: BAR_HEIGHT / 2,
    borderTopRightRadius: BAR_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  indicator: {
    position: "absolute",
    top: BAR_PADDING,
    left: BAR_PADDING,
    bottom: BAR_PADDING,
    borderRadius: (BAR_HEIGHT - BAR_PADDING * 2) / 2,
    overflow: "hidden",
  },
  indicatorFill: {
    flex: 1,
    backgroundColor: "rgba(231,39,94,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: (BAR_HEIGHT - BAR_PADDING * 2) / 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
});
