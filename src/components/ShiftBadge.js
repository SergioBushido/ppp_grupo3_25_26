import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const SHIFT_CONFIG = {
  morning: {
    label: 'Mañana',
    icon: 'weather-sunny',
    bg: colors.morningLight,
    text: colors.morning,
  },
  afternoon: {
    label: 'Tarde',
    icon: 'weather-sunset',
    bg: colors.afternoonLight,
    text: colors.afternoon,
  },
  night: {
    label: 'Noche',
    icon: 'weather-night',
    bg: colors.nightLight,
    text: colors.night,
  },
};

export function ShiftBadge({ shiftType, size = 'md', style }) {
  const config = SHIFT_CONFIG[shiftType] || SHIFT_CONFIG.morning;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSmall,
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={isSmall ? 12 : 16}
        color={config.text}
      />
      <Text style={[styles.label, { color: config.text }, isSmall && styles.labelSmall]}>
        {config.label}
      </Text>
    </View>
  );
}

export function getShiftConfig(shiftType) {
  return SHIFT_CONFIG[shiftType] || SHIFT_CONFIG.morning;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  labelSmall: {
    fontSize: typography.sizes.xs,
  },
});
