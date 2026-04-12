import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: colors.pending, bg: colors.pendingLight, icon: 'clock-outline' },
  approved: { label: 'Aprobada', color: colors.approved, bg: colors.approvedLight, icon: 'check-circle-outline' },
  rejected: { label: 'Rechazada', color: colors.rejected, bg: colors.rejectedLight, icon: 'close-circle-outline' },
};

export function VacationCard({ vacation, isAdmin = false, onApprove, onReject }) {
  const status = STATUS_CONFIG[vacation.status] || STATUS_CONFIG.pending;
  const days = differenceInCalendarDays(parseISO(vacation.end_date), parseISO(vacation.start_date)) + 1;

  const startFormatted = format(parseISO(vacation.start_date), "d MMM yyyy", { locale: es });
  const endFormatted = format(parseISO(vacation.end_date), "d MMM yyyy", { locale: es });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dateRange}>
          <MaterialCommunityIcons name="calendar-range" size={16} color={colors.primary} />
          <Text style={styles.dateText}>{startFormatted} → {endFormatted}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="sun-clock" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{days} día{days !== 1 ? 's' : ''}</Text>
        </View>
        {vacation.reason ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="text" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{vacation.reason}</Text>
          </View>
        ) : null}
        {isAdmin && vacation.employee_name ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="account" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{vacation.employee_name}</Text>
          </View>
        ) : null}
      </View>

      {isAdmin && vacation.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove?.(vacation.id)}
          >
            <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject?.(vacation.id)}
          >
            <MaterialCommunityIcons name="close" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  meta: {
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveBtn: {
    backgroundColor: colors.primary,
  },
  rejectBtn: {
    backgroundColor: colors.rejected,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
