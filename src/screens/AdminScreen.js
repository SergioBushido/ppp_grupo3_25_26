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
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, differenceInCalendarDays, startOfWeek, endOfWeek, subWeeks, addWeeks, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';
import { getAllPendingVacations, approveVacation, rejectVacation, getAllVacations, requestVacation } from '../database/vacationService';
import { getAllEmployees, updateEmployee, deleteEmployee, createEmployee } from '../database/employeeService';
import { getShiftsByDate, createShift, deleteShiftsForEmployeeOnDate, getShiftsForMonth, getShiftsInRange, bulkCreateShifts } from '../database/shiftService';
import { VacationCard } from '../components/VacationCard';
import { ShiftBadge } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { key: 'shifts', label: 'Turnos', icon: 'calendar-edit' },
  { key: 'employees', label: 'Empleados', icon: 'account-group' },
  { key: 'reports', label: 'Reportes', icon: 'chart-bar' },
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
  const [dailyAssignments, setDailyAssignments] = useState({});
  const [assignEndDate, setAssignEndDate] = useState(new Date());
  const [activeBrush, setActiveBrush] = useState('morning');
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copySummary, setCopySummary] = useState({ shifts: [], conflicts: [], sourceRange: '', targetRange: '' });

  const getShiftColor = useCallback((type) => {
    switch (type) {
      case 'morning': return colors.morning;
      case 'afternoon': return colors.afternoon;
      case 'night': return colors.night;
      case 'vacation': return colors.vacation;
      default: return colors.background;
    }
  }, []);

  const markedDatesForCalendar = React.useMemo(() => {
    const dates = {};
    Object.keys(dailyAssignments).forEach(dateStr => {
      const type = dailyAssignments[dateStr];
      if (type && type !== 'none') {
        dates[dateStr] = {
           customStyles: {
             container: { backgroundColor: getShiftColor(type), borderRadius: 8 },
             text: { color: colors.white, fontWeight: 'bold' }
           }
        };
      }
    });
    return dates;
  }, [dailyAssignments, getShiftColor]);


  // Employee edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDays, setEditDays] = useState('');

  // Add employee modal
  const [addEmpModalVisible, setAddEmpModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newInitialDays, setNewInitialDays] = useState('22');

  // Reports
  const [reportMonth, setReportMonth] = useState(new Date());
  const [reportData, setReportData] = useState([]);

  const { useFocusEffect } = require('@react-navigation/native');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, all, emps] = await Promise.all([
        getAllPendingVacations(),
        getAllVacations(),
        getAllEmployees(),
      ]);
      setPendingVacations(pending);
      setAllVacations(all);
      setEmployees(emps.filter((e) => e.role === 'employee'));
    } catch (e) {
      console.error("Error loading Admin data:", e);
      Alert.alert("Error", "No se pudieron cargar los datos del panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      loadDayShifts();
    }, [loadAll, loadDayShifts])
  );

  const loadDayShifts = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const s = await getShiftsByDate(dateStr);
    setDayShifts(s);
  }, [selectedDate]);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const year = reportMonth.getFullYear();
      const month = reportMonth.getMonth() + 1;
      
      const allEmps = await getAllEmployees();
      const activeEmps = allEmps.filter(e => e.role === 'employee');
      
      const shiftsData = await getShiftsForMonth(year, month);
      const allVacationsData = await getAllVacations();
      
      const data = activeEmps.map(emp => {
        const empShifts = shiftsData.filter(s => s.employee_id === emp.id);
        const morning = empShifts.filter(s => s.shift_type === 'morning').length;
        const afternoon = empShifts.filter(s => s.shift_type === 'afternoon').length;
        const night = empShifts.filter(s => s.shift_type === 'night').length;
        
        let vacDays = 0;
        const mStart = startOfMonth(reportMonth);
        const mEnd = endOfMonth(reportMonth);

        allVacationsData.filter(v => v.employee_id === emp.id && v.status === 'approved').forEach(v => {
          const start = parseISO(v.start_date);
          const end = parseISO(v.end_date);
          
          let overlapStart = start > mStart ? start : mStart;
          let overlapEnd = end < mEnd ? end : mEnd;
          
          if (overlapStart <= overlapEnd) {
             vacDays += differenceInCalendarDays(overlapEnd, overlapStart) + 1;
          }
        });

        return {
          id: emp.id,
          name: emp.name,
          morning,
          afternoon,
          night,
          vacations: vacDays,
          totalShifts: empShifts.length
        };
      });
      
      setReportData(data);
    } finally {
      setLoading(false);
    }
  }, [reportMonth]);


  useEffect(() => {
    if (activeTab === 'reports') {
      loadReportData();
    }
  }, [activeTab, loadReportData]);

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

  const getDaysInRange = (start, end) => {
    let s = new Date(start); s.setHours(0,0,0,0);
    let e = new Date(end); e.setHours(0,0,0,0);
    if (e < s) { const t=s; s=e; e=t; }
    const days = [];
    let cur = new Date(s);
    while (cur <= e) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const handleFillAll = (type) => {
    // Deprecated with interactive calendar, but kept minimal to avoid breaks if referenced.
  };

  const handleAddShift = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    
    try {
      const days = getDaysInRange(selectedDate, assignEndDate);
      const shiftsToCreate = [];
      const datesToClear = [];
      const vacationDays = [];
      let omittedCount = 0;

      const empVacations = allVacations.filter(v => v.employee_id === selectedEmp.id && v.status === 'approved');

      for (const date of days) {
        const dStr = format(date, 'yyyy-MM-dd');
        
        const hasConflict = empVacations.some(v => 
          isWithinInterval(date, { start: parseISO(v.start_date), end: parseISO(v.end_date) })
        );

        if (hasConflict) {
          omittedCount++;
          continue;
        }

        datesToClear.push(dStr);
        
        const task = dailyAssignments[dStr] || 'none';
        if (task === 'morning' || task === 'afternoon' || task === 'night') {
           shiftsToCreate.push({ employee_id: selectedEmp.id, date: dStr, shift_type: task });
        } else if (task === 'vacation') {
           vacationDays.push(date);
        }
      }

      await Promise.all(datesToClear.map(dateStr => deleteShiftsForEmployeeOnDate(selectedEmp.id, dateStr)));
      
      if (shiftsToCreate.length > 0) {
        await bulkCreateShifts(shiftsToCreate);
      }

      if (vacationDays.length > 0) {
        const intervals = [];
        let curStart = vacationDays[0];
        let curEnd = vacationDays[0];

        for (let i = 1; i < vacationDays.length; i++) {
           const d = vacationDays[i];
           const diff = Math.round((d - curEnd) / (1000 * 60 * 60 * 24));
           if (diff === 1) {
              curEnd = d;
           } else {
              intervals.push({start: curStart, end: curEnd});
              curStart = d;
              curEnd = d;
           }
        }
        intervals.push({start: curStart, end: curEnd});

        for (const inter of intervals) {
          const reqId = await requestVacation({
            employee_id: selectedEmp.id,
            start_date: format(inter.start, 'yyyy-MM-dd'),
            end_date: format(inter.end, 'yyyy-MM-dd'),
            reason: 'Asignación automática desde panel'
          });
          await approveVacation(reqId);
        }
      }
      
      await loadDayShifts();
      await loadAll();
      
      setShiftModalVisible(false);
      setSelectedEmp(null);
      setDailyAssignments({});

      Alert.alert(
        '✅ Éxito',
        `Planificación guardada:\nTurnos asignados: ${shiftsToCreate.length}\nDías de vacación solicitados: ${vacationDays.length}${omittedCount > 0 ? `\n\n⚠️ Omitidos por vacaciones aprobadas: ${omittedCount}` : ''}`
      );
      
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Hubo un error al guardar los turnos.');
    } finally {
      setLoading(false);
    }
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

  const handlePrepareCopy = async () => {
    setLoading(true);
    try {
      const targetStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const targetEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const sourceStart = subWeeks(targetStart, 1);
      const sourceEnd = subWeeks(targetEnd, 1);

      const [sourceShifts, targetVacations, targetShifts] = await Promise.all([
        getShiftsInRange(format(sourceStart, 'yyyy-MM-dd'), format(sourceEnd, 'yyyy-MM-dd')),
        getAllVacations(),
        getShiftsInRange(format(targetStart, 'yyyy-MM-dd'), format(targetEnd, 'yyyy-MM-dd'))
      ]);

      const approvedVacations = targetVacations.filter(v => v.status === 'approved');
      
      const newShifts = [];
      const conflicts = [];

      sourceShifts.forEach(s => {
        const sDate = parseISO(s.date);
        const tDate = addWeeks(sDate, 1);
        const tDateStr = format(tDate, 'yyyy-MM-dd');

        const hasVacation = approvedVacations.find(v => 
          v.employee_id === s.employee_id && 
          isWithinInterval(tDate, { start: parseISO(v.start_date), end: parseISO(v.end_date) })
        );

        const alreadyHasShift = targetShifts.find(ts => 
          ts.employee_id === s.employee_id && ts.date === tDateStr
        );

        if (hasVacation) {
          conflicts.push({ ...s, reason: 'Vacaciones', targetDate: tDateStr });
        } else if (alreadyHasShift) {
          conflicts.push({ ...s, reason: 'Shift duplicado', targetDate: tDateStr });
        } else {
          newShifts.push({
            employee_id: s.employee_id,
            employee_name: s.employee_name,
            date: tDateStr,
            shift_type: s.shift_type
          });
        }
      });

      setCopySummary({
        shifts: newShifts,
        conflicts,
        sourceRange: `${format(sourceStart, 'd MMM')} - ${format(sourceEnd, 'd MMM')}`,
        targetRange: `${format(targetStart, 'd MMM')} - ${format(targetEnd, 'd MMM')}`
      });
      setCopyModalVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudieron recuperar los turnos de la semana anterior.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCopy = async () => {
    if (copySummary.shifts.length === 0) return;
    setLoading(true);
    try {
      await bulkCreateShifts(copySummary.shifts);
      Alert.alert('✅ Éxito', `Se han copiado ${copySummary.shifts.length} turnos correctamente.`);
      setCopyModalVisible(false);
      await loadDayShifts();
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar los turnos.');
    } finally {
      setLoading(false);
    }
  };


  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditDays(String(emp.available_days));
    setEditModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    const daysNum = parseInt(editDays, 10);
    if (isNaN(daysNum) || daysNum < 0) {
      Alert.alert('Error', 'Los días deben ser un número válido.');
      return;
    }
    
    try {
      await updateEmployee(editingEmployee.id, {
        name: editName,
        email: editEmail,
        available_days: daysNum
      });
      await loadAll();
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el empleado.');
    }
  };

  const handleDeleteEmployee = async () => {
    Alert.alert(
      'Eliminar Empleado',
      `¿Estás seguro de que deseas eliminar a ${editingEmployee.name}? Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteEmployee(editingEmployee.id);
              await loadAll();
              setEditModalVisible(false);
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar el empleado.');
            }
          }
        }
      ]
    );
  };

  const handleCreateEmployee = async () => {
    if (!newName || !newEmail || !newPass) {
      Alert.alert('Error', 'Por favor, rellena todos los campos.');
      return;
    }
    
    try {
      setLoading(true);
      await createEmployee({
        name: newName,
        email: newEmail,
        password: newPass,
        available_days: parseInt(newInitialDays, 10) || 22
      });
      
      Alert.alert('✅ Éxito', `Empleado ${newName} creado correctamente.`);
      setAddEmpModalVisible(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPass('');
      setNewInitialDays('22');
      
      await loadAll();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el empleado. Verifica si el email ya existe.');
    } finally {
      setLoading(false);
    }
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

              {/* Batch Actions */}
              <View style={styles.batchActions}>
                <TouchableOpacity 
                  style={styles.batchBtn}
                  onPress={handlePrepareCopy}
                >
                  <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
                  <Text style={styles.batchBtnText}>Copiar semana anterior</Text>
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
                onPress={() => { setAssignEndDate(selectedDate); setShiftModalVisible(true); }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.white} />
                <Text style={styles.addShiftBtnText}>Asignar turno</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <View style={{ flex: 1 }}>
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
                      onPress={() => handleEditEmployee(item)}
                    >
                      <Text style={styles.daysChipNumber}>{item.available_days}</Text>
                      <Text style={styles.daysChipLabel}>días</Text>
                      <MaterialCommunityIcons name="pencil" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.addShiftBtn}
                    onPress={() => setAddEmpModalVisible(true)}
                  >
                    <MaterialCommunityIcons name="account-plus" size={18} color={colors.white} />
                    <Text style={styles.addShiftBtnText}>Añadir nuevo empleado</Text>
                  </TouchableOpacity>
                }
              />
            </View>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <ScrollView contentContainerStyle={styles.listContent}>
              <View style={styles.dateNav}>
                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => setReportMonth(subMonths(reportMonth, 1))}
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dateNavText}>
                  {format(reportMonth, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                </Text>
                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => setReportMonth(addMonths(reportMonth, 1))}
                >
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {reportData.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Sin datos para este mes</Text>
                </View>
              ) : (
                reportData.map((emp) => (
                  <View key={emp.id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportEmpName}>{emp.name}</Text>
                      <View style={styles.reportTotalBadge}>
                        <Text style={styles.reportTotalText}>{emp.totalShifts} Turnos</Text>
                      </View>
                    </View>
                    
                    <View style={styles.reportStatsRow}>
                      <View style={styles.reportStat}>
                        <MaterialCommunityIcons name="weather-sunny" size={16} color={colors.morning} />
                        <Text style={styles.reportStatValue}>{emp.morning}</Text>
                      </View>
                      <View style={styles.reportStat}>
                        <MaterialCommunityIcons name="weather-sunset" size={16} color={colors.afternoon} />
                        <Text style={styles.reportStatValue}>{emp.afternoon}</Text>
                      </View>
                      <View style={styles.reportStat}>
                        <MaterialCommunityIcons name="weather-night" size={16} color={colors.night} />
                        <Text style={styles.reportStatValue}>{emp.night}</Text>
                      </View>
                      <View style={[styles.reportStat, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 8 }]}>
                        <MaterialCommunityIcons name="beach" size={16} color={colors.vacation} />
                        <Text style={[styles.reportStatValue, { color: colors.vacation }]}>{emp.vacations} d</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Shift Assignment Modal */}
      <Modal visible={shiftModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Asignación Múltiple</Text>
            <Text style={styles.modalSubtitle}>Selecciona el empleado y 'pinta' los turnos directamente en el calendario.</Text>

            <Text style={styles.modalLabel}>Empleado Seleccionado</Text>
            <ScrollView style={{maxHeight: 120, marginBottom: 12}} showsVerticalScrollIndicator={false}>
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
            </ScrollView>

            <Text style={styles.modalLabel}>Pincel (Turno a asignar)</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                <TouchableOpacity onPress={() => setActiveBrush('morning')} style={{padding:8, borderRadius:8, backgroundColor: activeBrush === 'morning' ? colors.morning : colors.white, borderWidth:1, borderColor: colors.morning}}>
                  <MaterialCommunityIcons name="weather-sunny" size={24} color={activeBrush === 'morning' ? colors.white : colors.morning} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveBrush('afternoon')} style={{padding:8, borderRadius:8, backgroundColor: activeBrush === 'afternoon' ? colors.afternoon : colors.white, borderWidth:1, borderColor: colors.afternoon}}>
                  <MaterialCommunityIcons name="weather-sunset" size={24} color={activeBrush === 'afternoon' ? colors.white : colors.afternoon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveBrush('night')} style={{padding:8, borderRadius:8, backgroundColor: activeBrush === 'night' ? colors.night : colors.white, borderWidth:1, borderColor: colors.night}}>
                  <MaterialCommunityIcons name="weather-night" size={24} color={activeBrush === 'night' ? colors.white : colors.night} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveBrush('vacation')} style={{padding:8, borderRadius:8, backgroundColor: activeBrush === 'vacation' ? colors.vacation : colors.white, borderWidth:1, borderColor: colors.vacation}}>
                  <MaterialCommunityIcons name="beach" size={24} color={activeBrush === 'vacation' ? colors.white : colors.vacation} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveBrush('none')} style={{padding:8, borderRadius:8, backgroundColor: activeBrush === 'none' ? colors.textSecondary : colors.white, borderWidth:1, borderColor: colors.textSecondary}}>
                  <MaterialCommunityIcons name="eraser" size={24} color={activeBrush === 'none' ? colors.white : colors.textMuted} />
                </TouchableOpacity>
            </View>

            <Calendar
              markingType={'custom'}
              markedDates={markedDatesForCalendar}
              onDayPress={(day) => {
                setDailyAssignments(prev => ({
                  ...prev,
                  [day.dateString]: activeBrush
                }));
              }}
              firstDay={1}
              theme={{
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
              }}
              style={{borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingBottom: 10}}
            />

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShiftModalVisible(false); setSelectedEmp(null); setDailyAssignments({}); }}
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

      {/* Edit Employee Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar Empleado</Text>
            <Text style={styles.modalSubtitle}>{editingEmployee?.name}</Text>
            
            <Text style={styles.modalLabel}>Nombre</Text>
            <TextInput
              style={styles.formInput}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.modalLabel}>Días de Vacaciones</Text>
            <TextInput
              style={styles.daysInput}
              value={editDays}
              onChangeText={setEditDays}
              keyboardType="numeric"
              maxLength={3}
            />

            <TouchableOpacity 
              style={styles.deleteLink} 
              onPress={handleDeleteEmployee}
            >
              <MaterialCommunityIcons name="account-remove" size={16} color={colors.rejected} />
              <Text style={styles.deleteLinkText}>Eliminar empleado</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveEmployee}>
                <Text style={styles.modalConfirmText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Employee Modal */}
      <Modal visible={addEmpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuevo Empleado</Text>
              <Text style={styles.modalSubtitle}>Crea un nuevo perfil de acceso</Text>

              <Text style={styles.modalLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej. Carlos Martínez"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.modalLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.formInput}
                placeholder="empleado@transferlog.com"
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.modalLabel}>Contraseña Inicial</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Mínimo 6 caracteres"
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry
              />

              <Text style={styles.modalLabel}>Días de Vacaciones (Anual)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="22"
                value={newInitialDays}
                onChangeText={setNewInitialDays}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn} 
                  onPress={() => setAddEmpModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalConfirmBtn} 
                  onPress={handleCreateEmployee}
                >
                  <Text style={styles.modalConfirmText}>Crear Perfil</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Copy Week Modal */}
      <Modal visible={copyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Copiar Semana</Text>
            <Text style={styles.modalSubtitle}>Réplica de planificación anterior</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Periodos</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Origen:</Text>
                <Text style={styles.summaryValue}>{copySummary.sourceRange}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Destino:</Text>
                <Text style={styles.summaryValue}>{copySummary.targetRange}</Text>
              </View>
            </View>

            <View style={{ marginVertical: 10 }}>
              <Text style={styles.summaryTitle}>Resultados</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Turnos a copiar:</Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{copySummary.shifts.length}</Text>
              </View>
              {copySummary.conflicts.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Conflictos (omitidos):</Text>
                  <Text style={[styles.summaryValue, { color: colors.rejected }]}>{copySummary.conflicts.length}</Text>
                </View>
              )}
            </View>

            {copySummary.conflicts.length > 0 && (
              <ScrollView style={{ maxHeight: 100, marginBottom: 10 }}>
                {copySummary.conflicts.map((c, i) => (
                  <View key={i} style={styles.conflictRow}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.rejected} />
                    <Text style={styles.conflictText}>
                      {c.employee_name}: {c.reason} ({format(parseISO(c.targetDate), 'dd/MM')})
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCopyModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, copySummary.shifts.length === 0 && styles.modalConfirmBtnDisabled]}
                onPress={handleExecuteCopy}
                disabled={copySummary.shifts.length === 0}
              >
                <Text style={styles.modalConfirmText}>Confirmar Copia</Text>
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
  formInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
  },
  deleteLinkText: {
    color: colors.rejected,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  reportCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: 12,
  },
  reportEmpName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  reportTotalBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportTotalText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  reportStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportStatValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  batchActions: {
    marginBottom: 16,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  batchBtnText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  summaryTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  conflictText: {
    fontSize: typography.sizes.xs,
    color: colors.rejected,
  },
});


