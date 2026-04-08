import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
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
import { getShiftsForMonth, createShift, deleteShift } from '../database/shiftService';
import { getVacationsByEmployee, getAllVacations } from '../database/vacationService';
import { getAllEmployees } from '../database/employeeService';
import { ShiftBadge, getShiftConfig } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function CalendarScreen({ navigation }) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly' | 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(
    user.role === 'admin' ? 'all' : String(user.id)
  );

  // Assignment Modal
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState('morning');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [shiftsData, vacationsData, empsData] = await Promise.all([
        getShiftsForMonth(year, month),
        user.role === 'admin' ? getAllVacations() : getVacationsByEmployee(user.id),
        user.role === 'admin' ? getAllEmployees() : [],
      ]);
      setShifts(shiftsData);
      setVacations(vacationsData);
      if (user.role === 'admin') {
        // filter out admin users from assignment list
        setEmployees(empsData.filter(e => e.role === 'employee'));
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteShift = (shiftId) => {
    Alert.alert(
      'Eliminar turno',
      '¿Estás seguro de que deseas eliminar este turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShift(shiftId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleAssignShift = async () => {
    if (!selectedEmp || !selectedDay) return;
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      
      const empShifts = shifts.filter(s => s.date === dateStr && s.employee_id === selectedEmp.id);
      if (empShifts.length > 0) {
        Alert.alert('Error', 'El empleado ya tiene un turno este día.');
        return;
      }
      
      const empVacations = vacations.filter(v => 
        v.employee_id === selectedEmp.id && 
        v.status === 'approved' && 
        dateStr >= v.start_date && 
        dateStr <= v.end_date
      );
      if (empVacations.length > 0) {
        Alert.alert('Error', 'El empleado está de vacaciones este día.');
        return;
      }

      await createShift({
        employee_id: selectedEmp.id,
        date: dateStr,
        shift_type: selectedShiftType,
      });

      setAssignmentModalVisible(false);
      setSelectedEmp(null);
      await loadData();
      Alert.alert('Éxito', 'Turno asignado correctamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const getShiftsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const filtered = shifts.filter((s) => s.date === dateStr);
    if (selectedEmployeeFilter !== 'all') {
      return filtered.filter((s) => String(s.employee_id) === selectedEmployeeFilter);
    }
    return filtered;
  };

  const getVacationsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return vacations.filter(
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
    const dayVacations = getVacationsForDay(day);
    const hasVacation = dayVacations.length > 0;
    const isToday = isSameDay(day, new Date());
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const hasShift = dayShifts.length > 0;
    const isSunday = day.getDay() === 0;

    // A day is "Libre" if it's Sunday and has no shift/vacation, 
    // or if we defined a "free" shift (though usually it's just empty).
    const isLibre = !hasShift && !hasVacation && isSunday;

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
        <Text style={[
          styles.dayText,
          !isCurrentMonth && styles.dayTextOtherMonth,
          isToday && styles.dayTextToday,
        ]}>
          {format(day, 'd')}
        </Text>

        <View style={styles.dayContent}>
          {hasShift ? (
            dayShifts.slice(0, 1).map((s, i) => {
              const config = getShiftConfig(s.shift_type);
              return (
                <View key={i} style={[styles.shiftCircle, { backgroundColor: config.text }]}>
                  {config.short === 'M' ? (
                    <Text style={styles.shiftShort}>{config.short}</Text>
                  ) : (
                    <MaterialCommunityIcons name={config.icon} size={14} color={colors.white} />
                  )}
                </View>
              );
            })
          ) : hasVacation ? (
            <View style={styles.vacationBlock}>
              <Text style={styles.statusBlockText}>Vacaciones</Text>
            </View>
          ) : isLibre ? (
            <View style={styles.freeBlock}>
              <Text style={styles.statusBlockText}>Libre</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const selectedDayShifts = selectedDay ? getShiftsForDay(selectedDay) : [];
  const selectedDayVacations = selectedDay ? getVacationsForDay(selectedDay) : [];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleCenter}>Horario</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.viewToggleContainer}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'weekly' && styles.toggleBtnActive]}
            onPress={() => setViewMode('weekly')}
          >
            <Text style={[styles.toggleText, viewMode === 'weekly' && styles.toggleTextActive]}>Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.toggleText, viewMode === 'monthly' && styles.toggleTextActive]}>Mensual</Text>
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
                    <View style={styles.dayDetailInfo}>
                      <ShiftBadge shiftType={s.shift_type} />
                      {user.role === 'admin' && s.employee_name && (
                        <Text style={styles.empName}>{s.employee_name}</Text>
                      )}
                    </View>
                    {user.role === 'admin' && (
                      <TouchableOpacity 
                        onPress={() => handleDeleteShift(s.id)}
                        style={styles.deleteBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.rejected} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : null}
              {selectedDayShifts.length === 0 && selectedDayVacations.length === 0 && (
                <Text style={styles.noShiftText}>Nadie asignado este día</Text>
              )}
              {user.role === 'admin' && (
                <TouchableOpacity 
                  style={styles.addShiftBtn}
                  onPress={() => setAssignmentModalVisible(true)}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addShiftText}>Asignar Turno</Text>
                </TouchableOpacity>
              )}
              {selectedDayVacations.length > 0 && selectedDayVacations.map((v, i) => {
                const empName = v.employee_name || employees.find(e => e.id === v.employee_id)?.name;
                return (
                  <View key={`vac-${i}`} style={[styles.dayDetailRow, { marginTop: 8 }]}>
                    <View style={[styles.vacDot]} >
                      <MaterialCommunityIcons name="beach" size={14} color={colors.vacation} />
                      <Text style={styles.vacText}>Vacaciones</Text>
                    </View>
                    {user.role === 'admin' && (
                      <Text style={styles.empName}>{empName || 'Empleado'}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
      {/* Assignment Modal */}
      <Modal visible={assignmentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Turno</Text>
            <Text style={styles.modalSubtitle}>
              {selectedDay && format(selectedDay, "d 'de' MMMM", { locale: es })}
            </Text>

            <Text style={styles.modalLabel}>Empleado</Text>
            {employees.map(emp => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.empOption, selectedEmp?.id === emp.id && styles.empOptionSelected]}
                onPress={() => setSelectedEmp(emp)}
              >
                <Text style={[styles.empOptionText, selectedEmp?.id === emp.id && styles.empOptionTextSelected]}>
                  {emp.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Turno</Text>
            <View style={styles.shiftOptionsList}>
              {[
                { type: 'morning', label: 'Mañana', icon: 'weather-sunny' },
                { type: 'afternoon', label: 'Tarde', icon: 'wrench' },
                { type: 'night', label: 'Noche', icon: 'wrench' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.shiftOption, selectedShiftType === opt.type && styles.shiftOptionSelected]}
                  onPress={() => setSelectedShiftType(opt.type)}
                >
                  <MaterialCommunityIcons name={opt.icon} size={20} color={selectedShiftType === opt.type ? colors.white : colors.textSecondary} />
                  <Text style={[styles.shiftOptionText, selectedShiftType === opt.type && styles.shiftOptionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setAssignmentModalVisible(false); setSelectedEmp(null); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !selectedEmp && styles.modalConfirmBtnDisabled]}
                onPress={handleAssignShift}
                disabled={!selectedEmp}
              >
                <Text style={styles.modalConfirmText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  viewToggleContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primaryDark,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  toggleTextActive: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
  navBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    paddingBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.75, // Increased height ratio to avoid clipping
    padding: 2,
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
  },
  dayCellCompact: {
    aspectRatio: 0.75,
  },
  dayCellOtherMonth: {
    opacity: 0.2,
  },
  dayCellSelected: {
    backgroundColor: '#F8FAFC',
  },
  dayText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
    marginLeft: 2,
  },
  dayTextOtherMonth: {
    color: colors.textMuted,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Start from top to give more space
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  shiftCircle: {
    width: 24, // Slightly smaller to fit better
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  shiftShort: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  vacationBlock: {
    backgroundColor: colors.vacation,
    width: '100%',
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  freeBlock: {
    backgroundColor: colors.free,
    width: '100%',
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  statusBlockText: {
    color: colors.white,
    fontSize: 7,
    fontWeight: typography.weights.bold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
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
    marginBottom: 40,
  },
  dayDetailTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  dayDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  dayDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  addShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: 8,
    borderStyle: 'dashed',
  },
  addShiftText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  empName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  noShiftText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  modalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 8,
  },
  empOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  empOptionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  empOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  shiftOptionsList: {
    flexDirection: 'row',
    gap: 10,
  },
  shiftOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  shiftOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shiftOptionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  shiftOptionTextSelected: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: { opacity: 0.5 },
  modalConfirmText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
