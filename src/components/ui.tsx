import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  ) : (
    <View style={styles.screenContent}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[`button_${variant}`], (disabled || loading) && styles.disabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} /> : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={19} color={variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary} /> : null}
          <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Header({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ icon, title, message }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <View style={[styles.chip, styles[`chip_${tone}`]]}><Text style={[styles.chipText, styles[`chipText_${tone}`]]}>{label}</Text></View>;
}

export function IconButton({ icon, label, onPress, danger, disabled }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.iconButton, danger && styles.iconButtonDanger, disabled && styles.disabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, paddingBottom: 120, gap: spacing.md, flexGrow: 1 },
  button: { minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1 },
  button_primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  button_danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  button_ghost: { backgroundColor: 'transparent', borderColor: colors.border },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonText_primary: { color: colors.white },
  buttonText_secondary: { color: colors.primaryDark },
  buttonText_danger: { color: colors.danger },
  buttonText_ghost: { color: colors.primary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  fieldWrap: { gap: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  headerCopy: { flex: 1, gap: 5 },
  eyebrow: { color: colors.primary, fontWeight: '800', letterSpacing: 0.8, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 29, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  empty: { minHeight: 230, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chip: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.background },
  chip_success: { backgroundColor: colors.successSoft },
  chip_warning: { backgroundColor: colors.warningSoft },
  chip_danger: { backgroundColor: colors.dangerSoft },
  chip_neutral: { backgroundColor: colors.background },
  chipText: { fontWeight: '700', fontSize: 12 },
  chipText_success: { color: colors.success },
  chipText_warning: { color: colors.warning },
  chipText_danger: { color: colors.danger },
  chipText_neutral: { color: colors.muted },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  iconButtonDanger: { backgroundColor: colors.dangerSoft },
});

export const uiStyles = styles;
