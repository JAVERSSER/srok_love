import React, { forwardRef, useState } from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  TextInput,
  TextInputProps,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { radius, spacing, font, shadow } from "@/constants/spacing";

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
  color = colors.primary,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.ghost, style]}>
      <Text style={[styles.ghostLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  label,
  value,
  onPress,
  danger,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
    >
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right}
      </View>
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.section, style]}>{children}</Text>;
}

// Web only: hide the browser's square focus ring (our rounded border shows
// focus instead) and fade border changes rather than snapping them.
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;
const webBorderFade =
  Platform.OS === "web"
    ? ({ transitionProperty: "border-color", transitionDuration: "150ms" } as object)
    : null;

// Plain bordered input. Keeps its own focus state so highlighting a field
// only re-renders that field.
export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      style={[styles.plainInput, focused && styles.inputFocused, style]}
      placeholderTextColor={colors.textTertiary}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
});

export function TextField({
  label,
  error,
  secure,
  style,
  ...inputProps
}: TextInputProps & {
  label: string;
  error?: string | null;
  secure?: boolean;
}) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          !!error && styles.inputWrapError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secure && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.eye}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  pressed: { opacity: 0.85 },
  disabled: { backgroundColor: colors.textTertiary },
  primaryLabel: { color: colors.white, fontWeight: "800", fontSize: font.title },
  ghost: { paddingVertical: spacing.md, alignItems: "center" },
  ghostLabel: { fontWeight: "700", fontSize: font.body },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { fontSize: font.body, color: colors.textSecondary },
  field: { marginTop: spacing.lg },
  fieldLabel: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...webBorderFade,
  },
  inputFocused: { borderColor: colors.primary },
  inputWrapError: { borderColor: colors.danger },
  input: {
    flex: 1,
    ...webNoOutline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // 16px minimum: anything smaller makes iOS Safari zoom in on focus.
    fontSize: 16,
    color: colors.text,
  },
  plainInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // 16px minimum: anything smaller makes iOS Safari zoom in on focus.
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...webNoOutline,
    ...webBorderFade,
  },
  eye: { paddingHorizontal: spacing.md },
  fieldError: { color: colors.danger, fontSize: font.small, marginTop: spacing.xs },
  section: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
});
