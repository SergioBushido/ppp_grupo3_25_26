import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { editRequestVacation } from '../database/vacationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

function parseVacationDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? startOfDay(new Date(value)) : null;
  }

  if (typeof value !== 'string') return null;

  const parsedDate = parseISO(value);
  if (!isValid(parsedDate)) return null;

  return startOfDay(parsedDate);
}

function formatVacationDate(value) {
  return value ? format(value, 'yyyy-MM-dd') : null;
}

export default function AdminRequestVacationScreen({ navigation, route }) {
  const { refreshUser } = useAuth();
  const employeeVacation = route?.params;
  const originalStartDate = parseVacationDate(employeeVacation?.start_date);
  const originalEndDate = parseVacationDate(employeeVacation?.end_date);
  const originalStartDateKey = formatVacationDate(originalStartDate);
  const originalEndDateKey = formatVacationDate(originalEndDate);
  const originalAvailableDays = employeeVacation?.employees?.available_days ?? 0;

  const today = startOfDay(new Date());
  const minSelectableDate =
    originalStartDate && originalStartDate < today ? originalStartDate : today;

  const [startDate, setStartDate] = useState(originalStartDate);
  const [endDate, setEndDate] = useState(originalEndDate);

  const [loading, setLoading] = useState(false);

  // Consideramos las vacaciones desde startDate hasta endDate incluídos
  const effectiveEnd = endDate || startDate;
  const hasValidRange = Boolean(startDate && effectiveEnd && effectiveEnd >= startDate);
  const days = hasValidRange ? differenceInCalendarDays(effectiveEnd, startDate) + 1 : 0;
  const originalDays =
    originalStartDate && originalEndDate && originalEndDate >= originalStartDate
      ? differenceInCalendarDays(originalEndDate, originalStartDate) + 1
      : 0;
  const newAvailableDays = originalAvailableDays + originalDays;
  // Solo se puede tramitar si hay al menos un día válido seleccionado, y entra en el saldo.
  const canRequest =
    days > 0 &&
    hasValidRange &&
    days <= newAvailableDays &&
    startDate >= minSelectableDate;

  const canRequestIfDatesAreEqual =
    Boolean(startDate && effectiveEnd && originalStartDateKey && originalEndDateKey) &&
    formatVacationDate(startDate) === originalStartDateKey &&
    formatVacationDate(effectiveEnd) === originalEndDateKey;

  const onDayPress = (day) => {
    const date = parseVacationDate(day.dateString);
    if (!date) return;

    // Evitar peticiones en fechas del pasado
    if (date < minSelectableDate) return;

    if (!startDate || (startDate && endDate)) {
      // Si no hay nada, o si ya había un rango completo definido, reiniciamos el inicio
      setStartDate(date);
      setEndDate(null);
    } else {
      // Si ya tenemos fecha de inicio pero nos falta el fin
      if (date < startDate) {
        // Tocado antes del inicio, reinicia
        setStartDate(date);
        setEndDate(null);
      } else {
        // Tocado después (o el mismo día), cerramos el rango
        setEndDate(date);
      }
    }
  };

  const markedDatesForCalendar = React.useMemo(() => {
    const dates = {};
    if (startDate && !endDate) {
      const sStr = format(startDate, 'yyyy-MM-dd');
      dates[sStr] = { startingDay: true, endingDay: true, color: colors.vacation, textColor: 'white' };
    } else if (startDate && endDate) {
      const sStr = format(startDate, 'yyyy-MM-dd');
      const eStr = format(endDate, 'yyyy-MM-dd');

      if (sStr === eStr) {
        dates[sStr] = { startingDay: true, endingDay: true, color: colors.vacation, textColor: 'white' };
      } else {
        dates[sStr] = { startingDay: true, color: colors.vacation, textColor: 'white' };
        dates[eStr] = { endingDay: true, color: colors.vacation, textColor: 'white' };

        let cur = addDays(startDate, 1);
        while (cur < endDate) {
          dates[format(cur, 'yyyy-MM-dd')] = { color: colors.vacationLight, textColor: colors.primary };
          cur = addDays(cur, 1);
        }
      }
    }
    return dates;
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    if (!canRequest) return;
    setLoading(true);
    try {
      await editRequestVacation({
        vacation_id: employeeVacation?.id,
        start_date: formatVacationDate(startDate),
        end_date: formatVacationDate(effectiveEnd),
      });

      await refreshUser();

      Alert.alert(
        'Edición exitosa',
        'Las vacaciones se han editado correctamente',
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
      <View style={styles.summary}>
        <View style={styles.summaryDetails}>
          <MaterialCommunityIcons name="account" size={25} color={colors.textSecondary} />
          <Text style={styles.summaryText}>{employeeVacation?.employees?.name ?? 'Empleado'}</Text>
        </View>
        <View style={styles.summaryDetails}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
            {originalStartDate && originalEndDate ? (
              <>
                <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: typography.weights.bold }}>
                  {format(originalStartDate, "d MMM", { locale: es })}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: typography.weights.bold }}>
                  {format(originalEndDate, "d MMM yyyy", { locale: es })}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: typography.weights.bold }}>
                Fechas no disponibles
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{days}</Text>
          <Text style={styles.summaryLabel}>Días solicitados</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, days > (newAvailableDays ?? 0) && styles.summaryNumberDanger]}>
            {newAvailableDays - (canRequest ? days : 0)}
          </Text>
          <Text style={styles.summaryLabel}>Quedarían disponibles</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{newAvailableDays}</Text>
          <Text style={styles.summaryLabel}>Días disponibles</Text>
        </View>
      </View>

      {/* Date selectors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seleccionar Período</Text>
        <Text style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 8 }}>
          Toca en la cuadrícula el primer día y luego el último día de las vacaciones. Si tocas un solo día dos veces, será una solicitud de un día.
        </Text>
        <Calendar
          markingType={'period'}
          markedDates={markedDatesForCalendar}
          onDayPress={onDayPress}
          minDate={formatVacationDate(minSelectableDate)}
          firstDay={1}
          theme={{
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
            textDayFontWeight: 'bold',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold',
          }}
          style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingBottom: 10 }}
        />
        {(startDate || endDate) && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
            {startDate ? (
              <Text style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: typography.weights.bold }}>
                {format(startDate, "d MMM", { locale: es })}
              </Text>
            ) : null}
            {startDate && endDate && startDate.getTime() !== endDate.getTime() && (
              <>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textMuted} style={{ marginHorizontal: 12 }} />
                <Text style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: typography.weights.bold }}>
                  {format(endDate, "d MMM yyyy", { locale: es })}
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Warning if not enough days */}
      {days > newAvailableDays && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert" size={16} color={colors.rejected} />
          <Text style={styles.warningText}>
            No tienes suficientes días. Necesitas {days} pero tienes {newAvailableDays}.
          </Text>
        </View>
      )}

      {/* Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motivo</Text>
        <View style={styles.card}>
          <Text
            style={styles.reasonInput}
            placeholder="Ej: Vacaciones familiares, descanso..."
            placeholderTextColor={colors.textMuted}

            multiline
            numberOfLines={3}
            textAlignVertical="top"
          >
            {employeeVacation?.reason}
          </Text>
        </View>
      </View>


      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!canRequest || canRequestIfDatesAreEqual) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={((!canRequest || canRequestIfDatesAreEqual) || loading)}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={20} color={colors.white} />
            <Text style={styles.submitBtnText}>Editar vacaciones</Text>
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
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,

  },
  summaryText: {
    fontSize: typography.sizes.md
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
    paddingHorizontal: 2
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
