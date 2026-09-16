import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Field, Header, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme';
import type { Client } from '@/types';
import { formatDate } from '@/utils';

export default function ClientsScreen() {
  const { data, user, saveClient, deleteClient } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  if (!data || !user) return null;
  if (user.role !== 'admin') return <Redirect href="/(app)/dashboard" />;
  const filtered = data.clients.filter((client) => `${client.name} ${client.email}`.toLowerCase().includes(search.trim().toLowerCase()));

  const remove = (client: Client) => Alert.alert('Eliminar cliente', `¿Quieres eliminar a ${client.name}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteClient(client.id).catch((error) => Alert.alert('No se puede eliminar', error.message)) },
  ]);

  return (
    <Screen>
      <Header eyebrow="Administración" title="Clientes" subtitle={`${data.clients.length} cliente(s) guardados en este dispositivo.`} />
      <Button title="Nuevo cliente" icon="person-add-outline" onPress={() => setEditing(null)} />
      <Field label="Buscar" value={search} onChangeText={setSearch} placeholder="Nombre o correo" />
      {!filtered.length ? <EmptyState icon="people-outline" title={search ? 'Sin resultados' : 'Aún no hay clientes'} message={search ? 'Prueba con otro nombre o correo.' : 'Crea el primer cliente para empezar a registrar ventas.'} /> : filtered.map((client) => {
        const linked = data.users.some((item) => item.clientId === client.id);
        return (
          <Card key={client.id}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.name}>{client.name}</Text>
                <Text style={styles.email}>{client.email}</Text>
              </View>
              {linked ? <Chip label="Con cuenta" tone="success" /> : <Chip label="Sin cuenta" />}
            </View>
            <Text style={styles.meta}>Nacimiento: {formatDate(`${client.birthDate}T00:00:00`)}</Text>
            <View style={styles.actions}>
              <IconButton icon="create-outline" label={`Editar ${client.name}`} onPress={() => setEditing(client)} />
              <IconButton icon="trash-outline" label={`Eliminar ${client.name}`} danger onPress={() => remove(client)} />
            </View>
          </Card>
        );
      })}
      {editing !== undefined ? <ClientModal client={editing} onClose={() => setEditing(undefined)} onSave={saveClient} /> : null}
    </Screen>
  );
}

function ClientModal({ client, onClose, onSave }: { client: Client | null; onClose: () => void; onSave: (input: { name: string; birthDate: string; email: string }, id?: string) => Promise<void> }) {
  const initial = useMemo(() => ({ name: client?.name ?? '', birthDate: client?.birthDate ?? '', email: client?.email ?? '' }), [client]);
  const [name, setName] = useState(initial.name);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [email, setEmail] = useState(initial.email);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await onSave({ name, birthDate, email }, client?.id); onClose(); }
    catch (error) { Alert.alert('Revisa los datos', error instanceof Error ? error.message : 'No pudimos guardar el cliente.'); }
    finally { setLoading(false); }
  };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <Header eyebrow={client ? 'Editar' : 'Nuevo'} title={client ? 'Editar cliente' : 'Crear cliente'} subtitle="Los campos se guardan únicamente en este dispositivo." />
        <Field label="Nombre completo" value={name} onChangeText={setName} placeholder="Nombre y apellido" autoCapitalize="words" />
        <Field label="Fecha de nacimiento" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
        <Field label="Correo" value={email} onChangeText={setEmail} placeholder="cliente@correo.com" keyboardType="email-address" autoCapitalize="none" />
        <Button title="Guardar cliente" onPress={submit} loading={loading} />
        <Button title="Cancelar" onPress={onClose} variant="ghost" />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' }, email: { color: colors.muted, marginTop: 3 }, meta: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.xs },
});
