import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';

export default function ProfileScreen() {
  const { data, user, logout, reset, saveClient } = useApp();
  const client = data?.clients.find((item) => item.id === user?.clientId);
  if (!data || !user) return null;
  const signOut = async () => { await logout(); router.replace('/'); };
  const restore = () => Alert.alert('Restaurar datos locales', 'Se eliminarán usuarios, clientes, productos y ventas de este dispositivo. Solo se recreará la cuenta admin de demostración.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Restaurar', style: 'destructive', onPress: () => void reset().then(() => router.replace('/')).catch((error) => Alert.alert('No pudimos restaurar', error instanceof Error ? error.message : 'Intenta nuevamente.')) },
  ]);
  return (
    <Screen>
      <Header eyebrow="Cuenta" title="Perfil" subtitle="Administra tu información y la sesión de este dispositivo." />
      <Card>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(client?.name ?? 'A').charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.role}>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </Card>
      {client ? <ProfileEditor key={client.id} client={client} saveClient={saveClient} /> : null}
      {user.role === 'admin' ? <Card>
        <Text style={styles.sectionTitle}>Datos locales</Text>
        <Text style={styles.description}>Esta instalación contiene {data.clients.length} clientes, {data.products.length} productos y {data.saleHeaders.length} ventas.</Text>
        <Button title="Restaurar datos locales" onPress={restore} variant="danger" icon="refresh-outline" />
      </Card> : null}
      <Button title="Cerrar sesión" onPress={() => void signOut()} variant="ghost" icon="log-out-outline" />
      <Text style={styles.note}>VentaLocal guarda toda la información únicamente en este dispositivo.</Text>
    </Screen>
  );
}

function ProfileEditor({ client, saveClient }: { client: NonNullable<ReturnType<typeof useApp>['data']>['clients'][number]; saveClient: ReturnType<typeof useApp>['saveClient'] }) {
  const [name, setName] = useState(client.name);
  const [birthDate, setBirthDate] = useState(client.birthDate);
  const [email, setEmail] = useState(client.email);
  const [loading, setLoading] = useState(false);
  const save = async () => {
    setLoading(true);
    try { await saveClient({ name, birthDate, email }, client.id); Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.'); }
    catch (error) { Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el perfil.'); }
    finally { setLoading(false); }
  };
  return <Card>
    <Text style={styles.sectionTitle}>Datos personales</Text>
    <Field label="Nombre completo" value={name} onChangeText={setName} />
    <Field label="Fecha de nacimiento" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" maxLength={10} />
    <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
    <Button title="Guardar cambios" onPress={save} loading={loading} />
  </Card>;
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, avatarText: { color: colors.white, fontSize: 26, fontWeight: '900' },
  role: { textAlign: 'center', color: colors.text, fontWeight: '900', fontSize: 18 }, email: { textAlign: 'center', color: colors.muted }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  description: { color: colors.muted, lineHeight: 20 }, note: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
