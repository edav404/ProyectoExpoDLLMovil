import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Header, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radii, spacing } from '@/theme';
import type { Role, User } from '@/types';
import { formatDate } from '@/utils';

export default function UsersScreen() {
  const { data, user, activateUser } = useApp();
  const [activating, setActivating] = useState<User | null>(null);

  if (!data || !user) return null;
  if (user.role !== 'admin') return <Redirect href="/(app)/dashboard" />;

  const pendingUsers = data.users.filter((u) => u.status === 'pending');
  const activeUsers = data.users.filter((u) => u.status === 'active');

  return (
    <Screen>
      <Header
        eyebrow="Administración"
        title="Usuarios"
        subtitle={`${pendingUsers.length} solicitud(es) pendiente(s) · ${activeUsers.length} usuario(s) activo(s)`}
      />

      {pendingUsers.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Pendientes de aprobación</Text>
          {pendingUsers.map((u) => (
            <Card key={u.id}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.email}>{u.email}</Text>
                  <Text style={styles.meta}>Solicitud: {formatDate(u.createdAt)}</Text>
                </View>
                <Chip label="Pendiente" tone="warning" />
              </View>
              <Button
                title="Activar cuenta"
                icon="checkmark-circle-outline"
                onPress={() => setActivating(u)}
              />
            </Card>
          ))}
        </>
      ) : (
        <EmptyState
          icon="checkmark-done-outline"
          title="Sin solicitudes pendientes"
          message="Todas las solicitudes de registro han sido procesadas."
        />
      )}

      {activeUsers.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Usuarios activos</Text>
          {activeUsers.map((u) => {
            const client = u.clientId ? data.clients.find((c) => c.id === u.clientId) : undefined;
            const displayName = client?.firstName
              ? `${client.firstName} ${client.lastName}`.trim()
              : u.email;
            return (
              <Card key={u.id}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{displayName}</Text>
                    {client?.firstName ? <Text style={styles.meta}>{u.email}</Text> : null}
                  </View>
                  <Chip label={u.role === 'admin' ? 'Admin' : 'Cliente'} tone={u.role === 'admin' ? 'warning' : 'success'} />
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      {activating ? (
        <ActivateModal
          user={activating}
          onClose={() => setActivating(null)}
          onActivate={activateUser}
        />
      ) : null}
    </Screen>
  );
}

function ActivateModal({
  user,
  onClose,
  onActivate,
}: {
  user: User;
  onClose: () => void;
  onActivate: (input: { userId: string; role: Role }) => Promise<void>;
}) {
  const [role, setRole] = useState<Role>('client');
  const [loading, setLoading] = useState(false);
  const initial = useMemo(() => ({ email: user.email }), [user]);

  const submit = async () => {
    setLoading(true);
    try {
      await onActivate({ userId: user.id, role });
      Alert.alert('Cuenta activada', `Se activó la cuenta de ${initial.email} con rol "${role === 'admin' ? 'Administrador' : 'Cliente'}".`);
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo activar la cuenta.');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <Header
          eyebrow="Activar cuenta"
          title="Asignar rol"
          subtitle={`Activando la cuenta de:\n${initial.email}`}
        />
        <Text style={styles.roleLabel}>Selecciona el rol</Text>
        <View style={styles.segment}>
          {(['client', 'admin'] as Role[]).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === item }}
              onPress={() => setRole(item)}
              style={[styles.segmentItem, role === item && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>
                {item === 'client' ? 'Cliente' : 'Administrador'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <Text style={styles.roleDescription}>
            {role === 'client'
              ? '🛒 El usuario podrá consultar el catálogo, comprar productos y ver sus pedidos. Deberá completar sus datos personales al primer ingreso.'
              : '🛠 El usuario tendrá acceso completo a clientes, productos, ventas e historial.'}
          </Text>
        </Card>
        <Button title="Activar cuenta" onPress={submit} loading={loading} icon="checkmark-circle-outline" />
        <Button title="Cancelar" onPress={onClose} variant="ghost" />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.sm },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  email: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, marginTop: 3, fontSize: 13 },
  roleLabel: { color: colors.text, fontWeight: '700' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radii.md, backgroundColor: colors.primarySoft },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.primaryDark },
  roleDescription: { color: colors.muted, lineHeight: 22 },
});
