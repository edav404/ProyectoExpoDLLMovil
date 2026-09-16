import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';
import type { Role } from '@/types';

export default function RegisterScreen() {
  const { register } = useApp();
  const [role, setRole] = useState<Role>('client');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password !== confirmation) return Alert.alert('Revisa las contraseñas', 'Las contraseñas no coinciden.');
    setLoading(true);
    try {
      await register({ name, birthDate, email, password, role });
      router.replace('/(app)/dashboard');
    } catch (error) {
      Alert.alert('No pudimos crear la cuenta', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Button title="Volver" onPress={() => router.back()} variant="ghost" icon="arrow-back" />
      <Header eyebrow="Nueva cuenta" title="Regístrate" subtitle="Elige el tipo de acceso que necesitas en VentaLocal." />
      <Text style={styles.label}>Rol</Text>
      <View style={styles.segment}>
        {(['client', 'admin'] as Role[]).map((item) => (
          <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: role === item }} onPress={() => setRole(item)} style={[styles.segmentItem, role === item && styles.segmentActive]}>
            <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>{item === 'client' ? 'Cliente' : 'Administrador'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.form}>
        {role === 'client' ? <>
          <Field label="Nombre completo" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Nombre y apellido" />
          <Field label="Fecha de nacimiento" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" placeholder="AAAA-MM-DD" maxLength={10} />
        </> : null}
        <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@correo.com" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 8 caracteres" />
        <Field label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry placeholder="Repite la contraseña" />
        <Text style={styles.help}>Debe contener mayúscula, minúscula y número.</Text>
        <Button title="Crear cuenta" onPress={submit} loading={loading} disabled={!email || !password || !confirmation || (role === 'client' && (!name || !birthDate))} />
      </View>
      <Button title="Ya tengo una cuenta" onPress={() => router.replace('/(auth)/login')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  label: { color: colors.text, fontWeight: '700' },
  help: { color: colors.muted, fontSize: 13, marginTop: -spacing.sm },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radii.md, backgroundColor: colors.primarySoft },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.primaryDark },
});
