import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getShiftsForMonth } from '../database/shiftService';
import { getVacationsByEmployee, getAllVacations } from '../database/vacationService';
import { ShiftBadge, getShiftConfig } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly' | 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(
    user.role === 'admin' ? 'all' : String(user.id)
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [shiftsData, vacationsData] = await Promise.all([
        getShiftsForMonth(year, month),
        user.role === 'admin' ? getAllVacations() : getVacationsByEmployee(user.id),
      ]);
      setShifts(shiftsData);
      setVacations(vacationsData);
    } finally {
      setLoading(false);
    }
  }, [currentDate, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const getShiftsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const filtered = shifts.filter((s) => s.date === dateStr);
    if (selectedEmployeeFilter !== 'all') {
      return filtered.filter((s) => String(s.employee_id) === selectedEmployeeFilter);
    }
    return filtered;
  };

  const hasVacationOnDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return vacations.some(
      (v) => v.status === 'approved' && dateStr >= v.start_date && dateStr <= v.end_date &&
        (selectedEmployeeFilter === 'all' || String(v.employee_id) === selectedEmployeeFilter)
    );
  };

  // Calendar grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const renderDayCell = (day, compact = false) => {
    const dayShifts = getShiftsForDay(day);
    const hasVacation = hasVacationOnDay(day);
    const isToday = isSameDay(day, new Date());
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const hasShift = dayShifts.length > 0;

    return (
      <TouchableOpacity
        key={day.toISOString()}
        style={[
          styles.dayCell,
          compact && styles.dayCellCompact,
          !isCurrentMonth && styles.dayCellOtherMonth,
          isSelected && styles.dayCellSelected,
        ]}
        onPress={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
      >
        <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
          <Text style={[
            styles.dayText,
            !isCurrentMonth && styles.dayTextOtherMonth,
            isToday && styles.dayTextToday,
          ]}>
            {format(day, 'd')}
          </Text>
        </View>
        <View style={styles.dayIndicators}>
          {hasShift && dayShifts.slice(0, 2).map((s, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: getShiftConfig(s.shift_type).text }]}
            />
          ))}
          {hasVacation && <View style={[styles.dot, { backgroundColor: colors.vacation }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  const selectedDayShifts = selectedDay ? getShiftsForDay(selectedDay) : [];
  const selectedDayVacation = selectedDay ? hasVacationOnDay(selectedDay) : false;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendario</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'weekly' && styles.toggleBtnActive]}
            onPress={() => setViewMode('weekly')}
          >
            <Text style={[styles.toggleText, viewMode === 'weekly' && styles.toggleTextActive]}>Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.toggleText, viewMode === 'monthly' && styles.toggleTextActive]}>Mes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setCurrentDate(subMonths(currentDate, 1))}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setCurrentDate(addMonths(currentDate, 1))}
        >
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calGrid}>
            {(viewMode === 'monthly' ? calDays : weekDays).map((day) =>
              renderDayCell(day, viewMode === 'monthly')
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { label: 'Mañana', color: colors.morning },
              { label: 'Tarde', color: colors.afternoon },
              { label: 'Noche', color: colors.night },
              { label: 'Vacaciones', color: colors.vacation },
            ].map(({ label, color }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Selected day detail */}
          {selectedDay && (
            <View style={styles.dayDetail}>
              <Text style={styles.dayDetailTitle}>
                {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
              </Text>
              {selectedDayShifts.length > 0 ? (
                selectedDayShifts.map((s, i) => (
                  <View key={i} style={styles.dayDetailRow}>
                    <ShiftBadge shiftType={s.shift_type} />
                    {s.employee_name && user.role === 'admin' && (
                      <Text style={styles.empName}>{s.employee_name}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noShiftText}>Sin turnos asignados</Text>
              )}
              {selectedDayVacation && (
                <View style={styles.dayDetailRow}>
                  <View style={[styles.vacDot]} >
                    <MaterialCommunityIcons name="beach" size={14} color={colors.vacation} />
                    <Text style={styles.vacText}>Vacaciones aprobadas</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: typography.weights.medium,
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    paddingBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellCompact: {
    aspectRatio: 0.9,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberToday: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  dayTextOtherMonth: {
    color: colors.textMuted,
  },
  dayTextToday: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  dayIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  dayDetail: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dayDetailTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 14,
    textTransform: 'capitalize',
  },
  dayDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  empName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  noShiftText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  vacDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.vacationLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  vacText: {
    fontSize: typography.sizes.sm,
    color: colors.vacation,
    fontWeight: typography.weights.medium,
  },
});
