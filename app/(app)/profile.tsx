import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Client } from '@/types';

export default function ProfileScreen() {
  const { data, user, logout, reset, saveClient } = useApp();
  const client = data?.clients.find((item) => item.id === user?.clientId);
  if (!data || !user) return null;

  /**
   * Un cliente se considera "sin perfil completo" cuando sus datos de nombre
   * están vacíos (ocurre justo después de que el admin activa la cuenta).
   */
  const isProfileIncomplete = user.role === 'client' && (!client?.firstName || !client?.lastName || !client?.birthDate);

  const signOut = async () => { await logout(); router.replace('/'); };
  const restore = () => Alert.alert(
    'Restaurar datos locales',
    'Se eliminarán usuarios, clientes, productos y ventas de este dispositivo. Solo se recreará la cuenta admin de demostración.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar', style: 'destructive',
        onPress: () => void reset()
          .then(() => router.replace('/'))
          .catch((error) => Alert.alert('No pudimos restaurar', error instanceof Error ? error.message : 'Intenta nuevamente.')),
      },
    ],
  );

  const fullName = client?.firstName ? `${client.firstName} ${client.lastName}`.trim() : null;
  const avatarLetter = (fullName ?? user.email).charAt(0).toUpperCase();

  return (
    <Screen>
      <Header
        eyebrow="Cuenta"
        title="Perfil"
        subtitle={isProfileIncomplete
          ? 'Completa tus datos personales para poder realizar compras.'
          : 'Administra tu información y la sesión de este dispositivo.'}
      />

      {isProfileIncomplete ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Datos incompletos</Text>
          <Text style={styles.warningText}>
            Debes completar tu nombre, apellido y fecha de nacimiento antes de poder realizar compras.
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.role}>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</Text>
        {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
        <Text style={styles.email}>{user.email}</Text>
      </Card>

      {client ? <ProfileEditor key={client.id} client={client} saveClient={saveClient} /> : null}

      {user.role === 'admin' ? (
        <Card>
          <Text style={styles.sectionTitle}>Datos locales</Text>
          <Text style={styles.description}>
            Esta instalación contiene {data.clients.length} clientes, {data.products.length} productos y {data.saleHeaders.length} ventas.
          </Text>
          <Button title="Restaurar datos locales" onPress={restore} variant="danger" icon="refresh-outline" />
        </Card>
      ) : null}

      <Button title="Cerrar sesión" onPress={() => void signOut()} variant="ghost" icon="log-out-outline" />
      <Text style={styles.note}>VentaLocal guarda toda la información únicamente en este dispositivo.</Text>
    </Screen>
  );
}

function ProfileEditor({
  client,
  saveClient,
}: {
  client: Client;
  saveClient: ReturnType<typeof useApp>['saveClient'];
}) {
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [birthDate, setBirthDate] = useState(client.birthDate);
  const [email, setEmail] = useState(client.email);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await saveClient({ firstName, lastName, birthDate, email }, client.id);
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (error) {
      Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el perfil.');
    } finally { setLoading(false); }
  };

  const isComplete = firstName.trim().length >= 2 && lastName.trim().length >= 2 && birthDate.length === 10 && email.includes('@');

  return (
    <Card>
      <Text style={styles.sectionTitle}>Datos personales</Text>
      <Field label="Nombre" value={firstName} onChangeText={setFirstName} autoCapitalize="words" placeholder="Tu nombre" />
      <Field label="Apellido" value={lastName} onChangeText={setLastName} autoCapitalize="words" placeholder="Tu apellido" />
      <Field
        label="Fecha de nacimiento"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
        placeholder="AAAA-MM-DD"
        maxLength={10}
      />
      <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button title="Guardar cambios" onPress={save} loading={loading} disabled={!isComplete} />
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '900' },
  role: { textAlign: 'center', color: colors.text, fontWeight: '900', fontSize: 18, marginTop: spacing.xs },
  fullName: { textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '600' },
  email: { textAlign: 'center', color: colors.muted },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: spacing.sm },
  description: { color: colors.muted, lineHeight: 20 },
  note: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  warningCard: { backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1 },
  warningTitle: { color: colors.warning, fontWeight: '800', fontSize: 15, marginBottom: spacing.xs },
  warningText: { color: colors.warning, lineHeight: 20 },
});
