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
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { requestVacation } from '../database/vacationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function RequestVacationScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Consideramos las vacaciones desde startDate hasta endDate incluídos
  const effectiveEnd = endDate || startDate;
  const days = startDate ? differenceInCalendarDays(effectiveEnd, startDate) + 1 : 0;
  // Solo se puede tramitar si hay al menos un día válido seleccionado, y entra en el saldo.
  const canRequest = days > 0 && effectiveEnd >= startDate && days <= (user?.available_days ?? 0) && startDate >= today;

  const onDayPress = (day) => {
    const date = parseISO(day.dateString);
    date.setHours(0, 0, 0, 0);

    // Evitar peticiones en fechas del pasado
    if (date < today) return;

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
      await requestVacation({
        employee_id: user.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(effectiveEnd, 'yyyy-MM-dd'),
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
        <Text style={styles.sectionTitle}>Seleccionar Período</Text>
        <Text style={{fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 8}}>
          Toca en la cuadrícula el primer día y luego el último día de tus vacaciones. Si tocas un solo día dos veces, será de un día. Solo se permiten fechas futuras.
        </Text>
        <Calendar
          markingType={'period'}
          markedDates={markedDatesForCalendar}
          onDayPress={onDayPress}
          minDate={format(today, 'yyyy-MM-dd')}
          firstDay={1}
          theme={{
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
            textDayFontWeight: 'bold',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold',
          }}
          style={{borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingBottom: 10}}
        />
        {(startDate || endDate) && (
          <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 12, backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border}}>
            <Text style={{fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: typography.weights.bold}}>
              {format(startDate, "d MMM", { locale: es })}
            </Text>
            {startDate && endDate && startDate !== endDate && (
              <>
               <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textMuted} style={{marginHorizontal: 12}} />
               <Text style={{fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: typography.weights.bold}}>
                 {format(endDate, "d MMM yyyy", { locale: es })}
               </Text>
              </>
            )}
          </View>
        )}
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
