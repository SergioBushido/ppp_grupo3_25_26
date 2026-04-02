import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllPendingVacations, approveVacation, rejectVacation, getAllVacations } from '../database/vacationService';
import { getAllEmployees, updateAvailableDays } from '../database/employeeService';
import { getShiftsByDate, createShift, deleteShiftsForEmployeeOnDate } from '../database/shiftService';
import { VacationCard } from '../components/VacationCard';
import { ShiftBadge } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { key: 'shifts', label: 'Turnos', icon: 'calendar-edit' },
  { key: 'employees', label: 'Empleados', icon: 'account-group' },
];

const SHIFT_OPTIONS = [
  { type: 'morning', label: 'Mañana', icon: 'weather-sunny' },
  { type: 'afternoon', label: 'Tarde', icon: 'weather-sunset' },
  { type: 'night', label: 'Noche', icon: 'weather-night' },
];

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingVacations, setPendingVacations] = useState([]);
  const [allVacations, setAllVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shifts management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayShifts, setDayShifts] = useState([]);
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState('morning');

  // Employee days modal
  const [daysModalVisible, setDaysModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newDays, setNewDays] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pending, all, emps] = await Promise.all([
      getAllPendingVacations(),
      getAllVacations(),
      getAllEmployees(),
    ]);
    setPendingVacations(pending);
    setAllVacations(all);
    setEmployees(emps.filter((e) => e.role === 'employee'));
    setLoading(false);
  }, []);

  const loadDayShifts = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const s = await getShiftsByDate(dateStr);
    setDayShifts(s);
  }, [selectedDate]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadDayShifts(); }, [loadDayShifts]);

  const handleApprove = async (id) => {
    try {
      await approveVacation(id);
      await loadAll();
      Alert.alert('✅ Aprobada', 'La solicitud ha sido aprobada.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReject = async (id) => {
    Alert.alert('Rechazar solicitud', '¿Confirmas el rechazo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive',
        onPress: async () => {
          await rejectVacation(id);
          await loadAll();
        },
      },
    ]);
  };

  const handleAddShift = async () => {
    if (!selectedEmp) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await deleteShiftsForEmployeeOnDate(selectedEmp.id, dateStr);
    await createShift({ employee_id: selectedEmp.id, date: dateStr, shift_type: selectedShiftType });
    await loadDayShifts();
    setShiftModalVisible(false);
    setSelectedEmp(null);
  };

  const handleDeleteShift = async (shift) => {
    Alert.alert('Eliminar turno', `¿Eliminar turno de ${shift.employee_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const { deleteShift } = await import('../database/shiftService');
          await deleteShift(shift.id);
          await loadDayShifts();
        }
      },
    ]);
  };

  const handleEditDays = (emp) => {
    setEditingEmployee(emp);
    setNewDays(String(emp.available_days));
    setDaysModalVisible(true);
  };

  const handleSaveDays = async () => {
    const d = parseInt(newDays, 10);
    if (isNaN(d) || d < 0) return;
    await updateAvailableDays(editingEmployee.id, d);
    await loadAll();
    setDaysModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={{flexDirection: "row", alignItems: "center", gap: 10}}>
            <MaterialCommunityIcons name="shield-crown" size={22} color={colors.accent} />
            <Text style={styles.headerTitle}>Panel de Administración</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === 'requests' && pendingVacations.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingVacations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <FlatList
              data={[...pendingVacations, ...allVacations.filter((v) => v.status !== 'pending')]}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                pendingVacations.length > 0 ? (
                  <Text style={styles.listHeader}>Pendientes ({pendingVacations.length})</Text>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="inbox-check" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
                </View>
              }
              renderItem={({ item }) => (
                <VacationCard
                  vacation={item}
                  isAdmin
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )}
            />
          )}

          {/* Shifts Tab */}
          {activeTab === 'shifts' && (
            <ScrollView contentContainerStyle={styles.listContent}>
              {/* Date navigation */}
              <View style={styles.dateNav}>
                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => setSelectedDate(addDays(selectedDate, -1))}
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dateNavText}>
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                </Text>
                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => setSelectedDate(addDays(selectedDate, 1))}
                >
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {dayShifts.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="calendar-blank" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Sin turnos este día</Text>
                </View>
              ) : (
                dayShifts.map((s) => (
                  <View key={s.id} style={styles.shiftRow}>
                    <ShiftBadge shiftType={s.shift_type} />
                    <Text style={styles.shiftEmpName}>{s.employee_name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteShift(s)} style={styles.deleteBtn}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={colors.rejected} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={styles.addShiftBtn}
                onPress={() => setShiftModalVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.white} />
                <Text style={styles.addShiftBtnText}>Asignar turno</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <FlatList
              data={employees}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.empCard}>
                  <View style={styles.empAvatar}>
                    <Text style={styles.empAvatarText}>{item.name[0]}</Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.daysChip}
                    onPress={() => handleEditDays(item)}
                  >
                    <Text style={styles.daysChipNumber}>{item.available_days}</Text>
                    <Text style={styles.daysChipLabel}>días</Text>
                    <MaterialCommunityIcons name="pencil" size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Shift Assignment Modal */}
      <Modal visible={shiftModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Asignar turno</Text>
            <Text style={styles.modalSubtitle}>Selecciona empleado y turno</Text>

            <Text style={styles.modalLabel}>Empleado</Text>
            {employees.map((emp) => (
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
            <View style={styles.shiftOptions}>
              {SHIFT_OPTIONS.map((opt) => (
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
                onPress={() => { setShiftModalVisible(false); setSelectedEmp(null); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !selectedEmp && styles.modalConfirmBtnDisabled]}
                onPress={handleAddShift}
                disabled={!selectedEmp}
              >
                <Text style={styles.modalConfirmText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Days Modal */}
      <Modal visible={daysModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Días disponibles</Text>
            <Text style={styles.modalSubtitle}>{editingEmployee?.name}</Text>
            <TextInput
              style={styles.daysInput}
              value={newDays}
              onChangeText={setNewDays}
              keyboardType="numeric"
              maxLength={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDaysModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveDays}>
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 13,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  badge: {
    backgroundColor: colors.rejected,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: colors.white, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 40 },
  listHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  empty: { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textMuted },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  shiftEmpName: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  deleteBtn: {
    padding: 4,
  },
  addShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  addShiftBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAvatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  empInfo: { flex: 1 },
  empName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  empEmail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysChip: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 4,
  },
  daysChipNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  daysChipLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
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
  shiftOptions: {
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
  daysInput: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    marginBottom: 8,
  },
});
