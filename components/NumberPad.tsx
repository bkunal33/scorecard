import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { Colors, Fonts } from '../constants/Colors';

interface NumberPadProps {
  isOpen: boolean;
  playerName: string;
  colorIndex: number;
  roundNumber: number;
  initialValue?: number | null;
  isInitiallySkipped?: boolean;
  onClose: () => void;
  onSave: (value: number | null, isSkipped: boolean) => void;
  onPrev: () => void;
}

const PAD_HEIGHT = 390;

export default function NumberPad({
  isOpen,
  playerName,
  colorIndex,
  roundNumber,
  initialValue,
  isInitiallySkipped,
  onClose,
  onSave,
  onPrev,
}: NumberPadProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(PAD_HEIGHT)).current;
  const [value, setValue] = useState('');
  const [skipped, setSkipped] = useState(false);
  const caretAnim = useRef(new Animated.Value(1)).current;

  // Sync to open/close animation
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOpen ? 0 : PAD_HEIGHT,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  // Reset input when the target cell changes
  useEffect(() => {
    if (isInitiallySkipped) {
      setSkipped(true);
      setValue('');
    } else {
      setSkipped(false);
      setValue(initialValue !== null && initialValue !== undefined ? String(initialValue) : '');
    }
  }, [playerName, roundNumber, initialValue, isInitiallySkipped]);

  // Blinking caret
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caretAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(caretAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const press = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSkipped(false);
    switch (key) {
      case 'del':
        setValue(v => (v.length <= 1 ? '' : v.slice(0, -1)));
        break;
      case '+/-':
        setValue(v => (v.startsWith('-') ? v.slice(1) : v ? '-' + v : ''));
        break;
      case '.':
        setValue(v => (v.includes('.') ? v : (v || '0') + '.'));
        break;
      case 'skip':
        setSkipped(true);
        setValue('');
        break;
      default:
        setValue(v => (v === '0' ? key : v + key));
    }
  };

  const handleSaveWithHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleSave();
  };

  const handlePrevWithHaptic = () => {
    Haptics.selectionAsync();
    onPrev();
  };

  const handleSave = () => {
    if (skipped) {
      onSave(null, true);
    } else {
      const parsed = parseFloat(value);
      onSave(isNaN(parsed) ? null : parsed, false);
    }
  };

  const displayValue = skipped ? '—' : value;
  const isNegative = value.startsWith('-') && !skipped;

  const keys: Array<{ label: string | React.ReactNode; key: string; variant?: 'fn' | 'accent' | 'danger' }> = [
    { label: '1', key: '1' },
    { label: '2', key: '2' },
    { label: '3', key: '3' },
    { label: '⌫', key: 'del', variant: 'danger' },
    { label: '4', key: '4' },
    { label: '5', key: '5' },
    { label: '6', key: '6' },
    { label: '+/−', key: '+/-', variant: 'fn' },
    { label: '7', key: '7' },
    { label: '8', key: '8' },
    { label: '9', key: '9' },
    { label: '.', key: '.', variant: 'fn' },
    { label: 'skip', key: 'skip', variant: 'fn' },
    { label: '0', key: '0' },
    { label: '‹ prev', key: 'prev', variant: 'fn' },
    { label: 'save ↵', key: 'save', variant: 'accent' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Pressable style={styles.backdrop} onPress={onClose} />
      )}

      <Animated.View
        style={[
          styles.pad,
          { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, 14) + 16 },
        ]}
      >
        {/* Display row */}
        <View style={styles.display}>
          <View style={styles.displayWho}>
            <Avatar name={playerName} colorIndex={colorIndex} size="sm" />
            <View>
              <Text style={styles.displayName}>{playerName}</Text>
              <Text style={styles.displayRound}>Round {roundNumber}</Text>
            </View>
          </View>
          <View style={styles.displayValue}>
            <Text style={[styles.valueText, isNegative && styles.negativeText, skipped && styles.skipText]}>
              {displayValue || <Text style={styles.valuePlaceholder}>0</Text>}
            </Text>
            <Animated.View style={[styles.caret, { opacity: caretAnim }]} />
          </View>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {keys.map(({ label, key, variant }, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.key,
                variant === 'fn' && styles.keyFn,
                variant === 'accent' && styles.keyAccent,
                pressed && styles.keyPressed,
              ]}
              onPress={() => key === 'save' ? handleSaveWithHaptic() : key === 'prev' ? handlePrevWithHaptic() : press(key)}
            >
              {typeof label === 'string' ? (
                <Text style={[
                  styles.keyLabel,
                  variant === 'fn' && styles.keyLabelFn,
                  variant === 'accent' && styles.keyLabelAccent,
                  variant === 'danger' && styles.keyLabelDanger,
                ]}>
                  {label}
                </Text>
              ) : label}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,23,20,0.18)',
    zIndex: 9,
  },
  pad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 14,
    zIndex: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    marginBottom: 12,
  },
  displayWho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  displayRound: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.ink3,
  },
  displayValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 28,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  valuePlaceholder: {
    color: Colors.ink4,
  },
  negativeText: {
    color: Colors.negative,
  },
  skipText: {
    color: Colors.ink4,
    fontFamily: Fonts.regular,
  },
  caret: {
    width: 2,
    height: 24,
    backgroundColor: Colors.accent,
    marginLeft: 2,
    borderRadius: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    width: '22%',
    flexGrow: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFn: {
    backgroundColor: Colors.paper,
  },
  keyAccent: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  keyPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  keyLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 19,
    color: Colors.ink,
  },
  keyLabelFn: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.ink2,
  },
  keyLabelAccent: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.paper,
  },
  keyLabelDanger: {
    fontFamily: Fonts.medium,
    fontSize: 22,
    color: Colors.negative,
  },
});
