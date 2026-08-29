import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../constants';
import PlantCharacter from '../components/common/PlantCharacter';

export default function WelcomeScreen() {
  const handlePress = () => {
    router.replace('/onboarding/step1' as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handlePress}>
        <Text style={styles.title}>환영합니다</Text>

        <View style={styles.plantZone} pointerEvents="none">
          <PlantCharacter
            plantType="tomato"
            stage={1}
            expression="default"
            size="large"
          />
        </View>

        <Text style={styles.hint}>터치해서 계속</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'ahn2006-B',
    fontSize: 44,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  plantZone: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  hint: {
    fontFamily: 'ahn2006-M',
    fontSize: 18,
    color: COLORS.textTertiary,
    marginTop: 32,
  },
});
