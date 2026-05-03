import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.box, checked && styles.checked]}>
      {checked && <Feather name="check" size={14} color={Colors.paper} strokeWidth={2.5} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.line2,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
});
