import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { ready, user } = useApp();
  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (user) return <Redirect href="/(app)/dashboard" />;
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}><Ionicons name="storefront" size={42} color={colors.white} /></View>
        <Text style={styles.brand}>VentaLocal</Text>
        <Text style={styles.title}>Tu negocio, organizado en un solo lugar.</Text>
        <Text style={styles.copy}>Administra clientes, inventario y ventas desde tu dispositivo, incluso sin conexión.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Iniciar sesión" onPress={() => router.push('/(auth)/login')} icon="log-in-outline" />
        <Button title="Crear una cuenta" onPress={() => router.push('/(auth)/register')} variant="secondary" icon="person-add-outline" />
      </View>
      <Text style={styles.offline}><Ionicons name="cloud-offline-outline" size={15} /> Tus datos permanecen en este dispositivo</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  logo: { width: 78, height: 78, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.primary, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 38, lineHeight: 44, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  actions: { gap: spacing.sm },
  offline: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: spacing.sm },
});

