import { Redirect, Stack } from 'expo-router';

import { useApp } from '@/context/AppContext';

export default function AuthLayout() {
  const { ready, user } = useApp();
  if (ready && user) return <Redirect href="/(app)/dashboard" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
