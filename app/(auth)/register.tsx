import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';

export default function RegisterScreen() {
  const { register } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password !== confirmation) return Alert.alert('Revisa las contraseñas', 'Las contraseñas no coinciden.');
    setLoading(true);
    try {
      await register({ email, password });
      Alert.alert(
        '¡Solicitud enviada!',
        'Tu cuenta ha sido creada con estado pendiente. Un administrador debe aprobarte antes de que puedas ingresar.',
        [{ text: 'Entendido', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (error) {
      Alert.alert('No pudimos crear la cuenta', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Button title="Volver" onPress={() => router.back()} variant="ghost" icon="arrow-back" />
      <Header
        eyebrow="Nueva cuenta"
        title="Regístrate"
        subtitle="Ingresa tu correo y contraseña. Un administrador revisará y activará tu cuenta."
      />
      <View style={styles.form}>
        <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@correo.com" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 8 caracteres" />
        <Field label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry placeholder="Repite la contraseña" />
        <Text style={styles.help}>Debe contener mayúscula, minúscula y número.</Text>
        <Button
          title="Solicitar cuenta"
          onPress={submit}
          loading={loading}
          disabled={!email || !password || !confirmation}
        />
      </View>
      <Button title="Ya tengo una cuenta" onPress={() => router.replace('/(auth)/login')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  help: { color: colors.muted, fontSize: 13, marginTop: -spacing.sm },
});
