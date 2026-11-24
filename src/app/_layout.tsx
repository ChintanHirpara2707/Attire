import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ensureSession } from '../services/supabase';
import { colors, fonts, fontSizes, radius, spacing } from '../theme/tokens';

SplashScreen.preventAutoHideAsync();

type SessionState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [session, setSession] = useState<SessionState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connect = useCallback(() => {
    ensureSession()
      .then(() => setSession('ready'))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Startup sign-in failed:', msg);
        setErrorMessage(msg);
        setSession('error');
      });
  }, []);

  useEffect(connect, [connect]);

  const retry = () => {
    setSession('loading');
    connect();
  };

  const fontsDone = fontsLoaded || fontError !== null;
  const ready = fontsDone && session !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (session === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Could not connect. Check your internet and try again.</Text>
        {errorMessage && (
          <Text selectable style={styles.detail}>
            {errorMessage}
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="add-profile" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: {
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  detail: {
    color: colors.inkSoft,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
});
