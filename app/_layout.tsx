import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../db/database';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    Caveat_600SemiBold,
  });

  useEffect(() => {
    console.log('[Scorecard] fontsLoaded:', fontsLoaded, 'fontError:', fontError);
  }, [fontsLoaded, fontError]);

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="scorecard.db" onInit={initDatabase}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.paper },
            animation: 'slide_from_right',
          }}
        />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
