import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { requestVacation } from '../database/vacationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

function DateSelector({ label, value, onIncrease, onDecrease, minDate }) {
  return (
    <View style={styles.dateSel}>
      <Text style={styles.dateSelLabel}>{label}</Text>
      <View style={styles.dateSelRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={onDecrease}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateValue}>
          {format(value, "d MMM yyyy", { locale: es })}
        </Text>
        <TouchableOpacity style={styles.dateBtn} onPress={onIncrease}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RequestVacationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState(addDays(today, 1));
  const [endDate, setEndDate] = useState(addDays(today, 3));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const days = differenceInCalendarDays(endDate, startDate) + 1;
  const canRequest = days > 0 && endDate >= startDate && days <= (user?.available_days ?? 0);

  const handleStartDecrease = () => {
    const d = addDays(startDate, -1);
    if (d > today) setStartDate(d);
  };
  const handleStartIncrease = () => {
    const d = addDays(startDate, 1);
    setStartDate(d);
    if (d > endDate) setEndDate(addDays(d, 1));
  };
  const handleEndDecrease = () => {
    const d = addDays(endDate, -1);
    if (d >= startDate) setEndDate(d);
  };
  const handleEndIncrease = () => setEndDate(addDays(endDate, 1));

  const handleSubmit = async () => {
    if (!canRequest) return;
    setLoading(true);
    try {
      await requestVacation({
        employee_id: user.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        reason: reason.trim() || null,
      });
      await refreshUser();
      Alert.alert(
        '✅ Solicitud enviada',
        'Tu solicitud ha sido enviada al administrador para su revisión.',
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{days}</Text>
          <Text style={styles.summaryLabel}>Días solicitados</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, days > (user?.available_days ?? 0) && styles.summaryNumberDanger]}>
            {(user?.available_days ?? 0) - (canRequest ? days : 0)}
          </Text>
          <Text style={styles.summaryLabel}>Quedarían disponibles</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{user?.available_days ?? 0}</Text>
          <Text style={styles.summaryLabel}>Días disponibles</Text>
        </View>
      </View>

      {/* Date selectors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Período de vacaciones</Text>
        <View style={styles.card}>
          <DateSelector
            label="Fecha de inicio"
            value={startDate}
            onIncrease={handleStartIncrease}
            onDecrease={handleStartDecrease}
          />
          <View style={styles.separator} />
          <DateSelector
            label="Fecha de fin"
            value={endDate}
            onIncrease={handleEndIncrease}
            onDecrease={handleEndDecrease}
          />
        </View>
      </View>

      {/* Warning if not enough days */}
      {days > (user?.available_days ?? 0) && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert" size={16} color={colors.rejected} />
          <Text style={styles.warningText}>
            No tienes suficientes días. Necesitas {days} pero tienes {user?.available_days ?? 0}.
          </Text>
        </View>
      )}

      {/* Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motivo (opcional)</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.reasonInput}
            placeholder="Ej: Vacaciones familiares, descanso..."
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, !canRequest && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!canRequest || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={20} color={colors.white} />
            <Text style={styles.submitBtnText}>Enviar solicitud</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.white,
  },
  summaryNumberDanger: {
    color: '#FF8A8A',
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dateSel: {
    gap: 8,
  },
  dateSelLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  dateSelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.rejectedLight,
    padding: 14,
    borderRadius: 12,
  },
  warningText: {
    fontSize: typography.sizes.sm,
    color: colors.rejected,
    flex: 1,
  },
  reasonInput: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    minHeight: 80,
    padding: 0,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
});
