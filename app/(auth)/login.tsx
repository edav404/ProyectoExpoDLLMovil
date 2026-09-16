import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(app)/dashboard');
    } catch (error) {
      Alert.alert('No pudimos iniciar sesión', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Button title="Volver" onPress={() => router.back()} variant="ghost" icon="arrow-back" />
      <Header eyebrow="Bienvenido" title="Inicia sesión" subtitle="Accede a tus ventas y al inventario guardado en este dispositivo." />
      <View style={styles.form}>
        <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="tu@correo.com" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Tu contraseña" />
        <Button title="Ingresar" onPress={submit} loading={loading} disabled={!email || !password} />
      </View>
      <Text style={styles.demo}>Demo: admin@demo.com · Admin123*</Text>
      <Button title="¿No tienes cuenta? Regístrate" onPress={() => router.replace('/(auth)/register')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.md }, demo: { color: colors.muted, textAlign: 'center', fontSize: 13 } });

