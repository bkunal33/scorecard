import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';

interface AvatarProps {
  name: string;
  colorIndex?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function getAvatarColor(name: string, colorIndex?: number): [string, string] {
  const idx = colorIndex !== undefined
    ? colorIndex
    : ((name.charCodeAt(0) - 65) % 8 + 8) % 8;
  return Colors.avatarTones[Math.max(0, Math.min(7, idx))];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, colorIndex, size = 'md' }: AvatarProps) {
  const [bg, fg] = getAvatarColor(name, colorIndex);
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 14;

  return (
    <View style={[styles.base, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg, fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  text: {
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
});
