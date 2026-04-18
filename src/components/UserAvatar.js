import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const AVATAR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F06292',
  '#AED581',
  '#FFD54F',
  '#4DB6AC',
  '#7986CB',
];

function getInitials(name) {
  if (!name) return '?';

  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = 48,
  shape = 'circle',
  iconName = 'account',
  textSize,
}) {
  const borderRadius = shape === 'rounded' ? Math.round(size * 0.32) : Math.round(size / 2);
  const fallbackColor = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: fallbackColor,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      ) : name ? (
        <Text style={[styles.initials, { fontSize: textSize || Math.max(14, Math.round(size * 0.34)) }]}>
          {initials}
        </Text>
      ) : (
        <MaterialCommunityIcons name={iconName} size={Math.round(size * 0.48)} color={colors.white} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
});
