import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePathname, useRouter, type Href } from 'expo-router';

import { useApp } from '../context/AppContext';
import { breadcrumbs } from '../navigation';
import { colors, motion, radii, shadows, spacing } from '../theme';

function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const navigation = useRouter();
  const { user } = useApp();
  const crumbs = breadcrumbs(pathname, user?.role ?? null);
  const parent = [...crumbs].reverse().find((crumb) => crumb.href);
  const goBack = () => {
    if (navigation.canGoBack()) navigation.back();
    else if (parent?.href) navigation.push(parent.href as Href);
  };
  return (
    <View accessibilityRole="list" style={styles.crumbs}>
      {parent ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.crumbBack}><Ionicons name="chevron-back" size={18} color={colors.primary} /></Pressable> : null}
      {crumbs.map((crumb, index) => (
        <View key={`${crumb.label}-${index}`} style={styles.crumbItem}>
          {index > 0 ? <Ionicons name="chevron-forward" size={14} color={colors.muted} /> : null}
          {crumb.href ? (
            <Pressable accessibilityRole="link" accessibilityLabel={crumb.label} onPress={() => navigation.push(crumb.href as Href)} style={styles.crumbLink}>
              <Text style={styles.crumbLinkText}>{crumb.label}</Text>
            </Pressable>
          ) : <Text style={styles.crumbCurrent}>{crumb.label}</Text>}
        </View>
      ))}
    </View>
  );
}

export function Screen({ children, scroll = true, footer, crumb = true }: PropsWithChildren<{ scroll?: boolean; footer?: ReactNode; crumb?: boolean }>) {
  const reduced = useReduceMotion();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(10));
  useEffect(() => {
    if (reduced) { opacity.setValue(1); translateY.setValue(0); return; }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.base, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: motion.base, useNativeDriver: true }),
    ]).start();
  }, [opacity, reduced, translateY]);
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.screenContent, footer ? styles.screenContentWithFooter : null, wide && styles.screenContentWide]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
  ) : <View style={[styles.screenContent, wide && styles.screenContentWide]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.flex, { opacity, transform: [{ translateY }] }]}>
          {crumb ? <View style={[styles.crumbBar, wide && styles.screenContentWide]}><Breadcrumb /></View> : null}
          {content}
          {footer ? <View pointerEvents="box-none" style={styles.footerSlot}><View style={styles.footer}>{footer}</View></View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function GlassSurface({ children, style, intensity = 34 }: PropsWithChildren<{ style?: object; intensity?: number }>) {
  return <BlurView intensity={intensity} tint="light" style={[styles.glass, style]}>{children}</BlurView>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, haptic = true }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name']; haptic?: boolean;
}) {
  const reduced = useReduceMotion();
  const handlePress = () => {
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={handlePress}
    style={({ pressed }) => [styles.button, styles[`button_${variant}`], (disabled || loading) && styles.disabled, pressed && !reduced && styles.pressed]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} /> : <View style={styles.buttonInner}>
      {icon ? <Ionicons name={icon} size={19} color={variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary} /> : null}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title}</Text>
    </View>}
  </Pressable>;
}

export function Field({ label, error, icon, ...props }: TextInputProps & { label: string; error?: string; icon?: ComponentProps<typeof Ionicons>['name'] }) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputShell, error && styles.inputError]}>
      {icon ? <Ionicons name={icon} size={19} color={colors.muted} /> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} {...props} />
    </View>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}
  </View>;
}

export function Card({ children, style, glass = false }: PropsWithChildren<{ style?: object; glass?: boolean }>) {
  if (glass) return <GlassSurface style={[styles.card, styles.glassCard, style]}>{children}</GlassSurface>;
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Header({ eyebrow, title, subtitle, action, compact }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; compact?: boolean }) {
  return <View style={styles.header}><View style={styles.headerCopy}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>{action}</View>;
}

export function Notice({ tone, message }: { tone: 'error' | 'success' | 'warning' | 'info'; message: string }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, styles[`notice_${tone}`]]}><Text style={[styles.noticeText, styles[`noticeText_${tone}`]]}>{message}</Text></View>;
}

export function EmptyState({ icon, title, message, action }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; message: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.primary} /></View>
    <Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text>{action}</View>;
}

export function Chip({ label, tone = 'neutral', selected, onPress }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger'; selected?: boolean; onPress?: () => void }) {
  const body = <Text style={[styles.chipText, styles[`chipText_${tone}`], selected && styles.chipTextSelected]}>{label}</Text>;
  if (!onPress) return <View style={[styles.chip, styles[`chip_${tone}`]]}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} style={[styles.chip, styles.chipPressable, styles[`chip_${tone}`], selected && styles.chipSelected]}>{body}</Pressable>;
}

export function IconButton({ icon, label, onPress, danger, disabled }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const reduced = useReduceMotion();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { void Haptics.selectionAsync(); onPress(); }}
    style={({ pressed }) => [styles.iconButton, danger && styles.iconButtonDanger, disabled && styles.disabled, pressed && !reduced && styles.pressed]}>
    <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
  </Pressable>;
}

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | `${number}%`; height?: number; style?: object }) {
  const [opacity] = useState(() => new Animated.Value(0.45));
  const reduced = useReduceMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [opacity, reduced]);
  return <Animated.View accessibilityLabel="Cargando" style={[styles.skeleton, { width, height, opacity }, style]} />;
}

export function BottomSheet({ visible, title, children, onClose }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.sheetOverlay}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} />
      <View accessibilityViewIsModal style={styles.sheet}><View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="close" label="Cerrar" onPress={onClose} /></View>
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background }, screenContent: { padding: spacing.md, paddingBottom: 132, gap: spacing.md, flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  crumbBar: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  crumbs: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 44 },
  crumbItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  crumbBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  crumbLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  crumbLinkText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  crumbCurrent: { color: colors.text, fontWeight: '800', fontSize: 14, paddingHorizontal: 4 },
  screenContentWide: { paddingHorizontal: spacing.lg }, screenContentWithFooter: { paddingBottom: 248 },
  footerSlot: { position: 'absolute', left: 0, right: 0, bottom: 108, paddingHorizontal: spacing.md, alignItems: 'center' },
  footer: { width: '100%', maxWidth: 760, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, ...shadows.floating },
  glass: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
  button: { minHeight: 50, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1 },
  button_primary: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadows.card }, button_secondary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  button_danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }, button_ghost: { backgroundColor: colors.surfaceGlass, borderColor: colors.border },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, buttonText: { fontSize: 16, fontWeight: '800' },
  buttonText_primary: { color: colors.white }, buttonText_secondary: { color: colors.primaryDark }, buttonText_danger: { color: colors.danger }, buttonText_ghost: { color: colors.primary },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }, fieldWrap: { gap: 6 }, label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  inputShell: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: spacing.sm },
  input: { flex: 1, color: colors.text, fontSize: 16, minHeight: 50 }, multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }, inputError: { borderColor: colors.danger }, errorText: { color: colors.danger, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, ...shadows.card }, glassCard: { backgroundColor: colors.surfaceGlass },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xs }, headerCopy: { flex: 1, gap: 5 },
  eyebrow: { color: colors.primary, fontWeight: '900', letterSpacing: 1, fontSize: 11, textTransform: 'uppercase' }, title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 }, titleCompact: { fontSize: 24, lineHeight: 30 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  notice: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md }, notice_error: { backgroundColor: colors.dangerSoft, borderColor: colors.danger }, notice_success: { backgroundColor: colors.successSoft, borderColor: colors.success }, notice_warning: { backgroundColor: colors.warningSoft, borderColor: colors.warning }, notice_info: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  noticeText: { fontSize: 14, lineHeight: 20, fontWeight: '700' }, noticeText_error: { color: colors.danger }, noticeText_success: { color: colors.success }, noticeText_warning: { color: colors.warning }, noticeText_info: { color: colors.accent },
  empty: { minHeight: 230, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm }, emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }, emptyMessage: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  chip: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.background, borderWidth: 1, borderColor: 'transparent' }, chipPressable: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }, chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chip_success: { backgroundColor: colors.successSoft }, chip_warning: { backgroundColor: colors.warningSoft }, chip_danger: { backgroundColor: colors.dangerSoft }, chip_neutral: { backgroundColor: colors.backgroundTint },
  chipText: { fontWeight: '800', fontSize: 12 }, chipText_success: { color: colors.success }, chipText_warning: { color: colors.warning }, chipText_danger: { color: colors.danger }, chipText_neutral: { color: colors.muted }, chipTextSelected: { color: colors.primaryDark },
  iconButton: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, iconButtonDanger: { backgroundColor: colors.dangerSoft },
  skeleton: { borderRadius: radii.sm, backgroundColor: colors.border }, sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 37, 34, 0.38)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, maxHeight: '88%', ...shadows.floating }, sheetScroll: { maxHeight: 480 }, sheetContent: { gap: spacing.md, paddingBottom: spacing.md }, sheetHandle: { width: 42, height: 5, borderRadius: radii.pill, backgroundColor: colors.borderStrong, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
});

export const uiStyles = styles;
