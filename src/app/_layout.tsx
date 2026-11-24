import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { Glass } from '../components/Glass';
import { Screen } from '../components/Screen';
import { ensureSession } from '../services/supabase';
import { colors, fonts, fontSizes, spacing, textStyles } from '../theme/tokens';

SplashScreen.preventAutoHideAsync();

type SessionState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
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
      <Screen style={styles.center}>
        <Glass style={styles.card}>
          <Text style={styles.heading} accessibilityRole="header">
            Can&apos;t reach your wardrobe
          </Text>
          <Text style={styles.message}>Could not connect. Check your internet and try again.</Text>
          {errorMessage && (
            <Text selectable style={styles.detail}>
              {errorMessage}
            </Text>
          )}
          <Button label="Try again" onPress={retry} />
        </Glass>
        <StatusBar style="dark" />
      </Screen>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heading: {
    ...textStyles.heading,
    textAlign: 'center',
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
});
