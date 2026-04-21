import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generarReportePDF } from '../lib/pdfService';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, differenceInCalendarDays, startOfWeek, endOfWeek, subWeeks, addWeeks, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Services
import { getAllPendingVacations, approveVacation, rejectVacation, getAllVacations, requestVacation, cancelVacation, reactiveVacation, deleteVacation } from '../database/vacationService';
import { getAllEmployees, updateEmployee, deleteEmployee, createEmployee, resetEmployeePassword } from '../database/employeeService';
import { getShiftsByDate, createShift, deleteShift, deleteShiftsForEmployeeOnDate, getShiftsForMonth, getShiftsInRange, bulkCreateShifts, updateShift, getShiftsByEmployee } from '../database/shiftService';
import { createManualAttendanceByAdmin, getAllAttendancesByDate, invalidateAttendanceByAdmin } from '../database/attendanceService';
import { createWorkCenter, deleteWorkCenter, getAllWorkCenters, updateWorkCenter } from '../database/workCenterService';

// Local module
import { TABS } from './Admin/constants';
import { styles } from './Admin/AdminScreen.styles';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tabs
import RequestsTab from './Admin/tabs/RequestsTab';
import ShiftsTab from './Admin/tabs/ShiftsTab';
import AttendancesTab from './Admin/tabs/AttendancesTab';
import EmployeesTab from './Admin/tabs/EmployeesTab';
import ReportsTab from './Admin/tabs/ReportsTab';

// Modals
import LocationInfoModal from './Admin/modals/LocationInfoModal';
import ManualAttendanceModal from './Admin/modals/ManualAttendanceModal';
import AttendanceActionModal from './Admin/modals/AttendanceActionModal';
import ShiftAssignmentModal from './Admin/modals/ShiftAssignmentModal';
import EditEmployeeModal from './Admin/modals/EditEmployeeModal';
import AddEmployeeModal from './Admin/modals/AddEmployeeModal';
import WorkCenterModal from './Admin/modals/WorkCenterModal';
import CopyWeekModal from './Admin/modals/CopyWeekModal';
import EditShiftTimeModal from './Admin/modals/EditShiftTimeModal';

export default function AdminScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingVacations, setPendingVacations] = useState([]);
  const [allVacations, setAllVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  
  // Modular loading states
  const [baseDataLoading, setBaseDataLoading] = useState(false);
  const [baseDataLoaded, setBaseDataLoaded] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [attendancesLoading, setAttendancesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Helper to determine if the active tab is loading
  const isActiveTabLoading = () => {
    if (exportandoPDF) return true;
    switch (activeTab) {
      case 'requests': return requestsLoading;
      case 'shifts': return shiftsLoading || baseDataLoading;
      case 'attendances': return attendancesLoading || baseDataLoading;
      case 'employees': return baseDataLoading;
      case 'reports': return reportsLoading || baseDataLoading;
      default: return false;
    }
  };

  // Shifts management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayShifts, setDayShifts] = useState([]);
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [dailyAssignments, setDailyAssignments] = useState({});
  const [modifiedAssignmentDates, setModifiedAssignmentDates] = useState(new Set());
  const [assignEndDate, setAssignEndDate] = useState(new Date());

  // Attendances monitoring
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [dayAttendances, setDayAttendances] = useState([]);
  const [attendanceUsesRecentFallback, setAttendanceUsesRecentFallback] = useState(false);
  const [selectedAttendanceLocation, setSelectedAttendanceLocation] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualAttendanceModalVisible, setManualAttendanceModalVisible] = useState(false);
  const [manualAttendanceEmployeeId, setManualAttendanceEmployeeId] = useState(null);
  const [manualAttendanceType, setManualAttendanceType] = useState('in');
  const [manualAttendanceTime, setManualAttendanceTime] = useState('');
  const [manualAttendanceNote, setManualAttendanceNote] = useState('');
  const [manualAttendanceLoading, setManualAttendanceLoading] = useState(false);
  const [attendanceActionModalVisible, setAttendanceActionModalVisible] = useState(false);
  const [selectedAttendanceAction, setSelectedAttendanceAction] = useState(null);
  const [attendanceActionReason, setAttendanceActionReason] = useState('');
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [activeBrush, setActiveBrush] = useState('morning');
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copySummary, setCopySummary] = useState({ shifts: [], conflicts: [], sourceRange: '', targetRange: '' });

  // Specific shift editing
  const [editShiftModalVisible, setEditShiftModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editShiftStart, setEditShiftStart] = useState('');
  const [editShiftEnd, setEditShiftEnd] = useState('');

  // Attendance filter & animation
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeTab === 'attendances') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeTab, pulseAnim]);

  const markedDatesForCalendar = React.useMemo(() => {
    const dates = {};
    Object.keys(dailyAssignments || {}).forEach(dateStr => {
      const type = dailyAssignments[dateStr];
      if (!type || type === 'none') return;
      let bg = colors.background;
      if (type === 'morning') bg = colors.morning;
      else if (type === 'afternoon') bg = colors.afternoon;
      else if (type === 'night') bg = colors.night;
      else if (type === 'vacation') bg = colors.vacation;
      dates[dateStr] = {
        customStyles: {
          container: { backgroundColor: bg, borderRadius: 8 },
          text: { color: colors.white, fontWeight: 'bold' }
        }
      };
    });
    return dates;
  }, [dailyAssignments]);

  // Employee editing
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDays, setEditDays] = useState('');
  const [editAttendancePolicy, setEditAttendancePolicy] = useState('anywhere');
  const [editAssignedCenterId, setEditAssignedCenterId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Work center form
  const [workCenterModalVisible, setWorkCenterModalVisible] = useState(false);
  const [editingWorkCenter, setEditingWorkCenter] = useState(null);
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerLatitude, setCenterLatitude] = useState('');
  const [centerLongitude, setCenterLongitude] = useState('');
  const [centerRadius, setCenterRadius] = useState('150');

  // Add employee modal
  const [addEmpModalVisible, setAddEmpModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newInitialDays, setNewInitialDays] = useState('22');

  // Reports
  const [reportMonth, setReportMonth] = useState(new Date());
  const [reportData, setReportData] = useState([]);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // ────────────────────────────────────────────
  // Modular Data Loading
  // ────────────────────────────────────────────

  const loadBaseData = useCallback(async () => {
    if (baseDataLoaded) return;
    setBaseDataLoading(true);
    try {
      const [emps, centers] = await Promise.all([
        getAllEmployees(),
        getAllWorkCenters(),
      ]);
      setEmployees(emps.filter((e) => e.role === 'employee'));
      setWorkCenters(centers);
      setBaseDataLoaded(true);
    } catch (e) {
      console.error("Error loading base data:", e);
      Alert.alert("Error", "No se pudieron cargar los datos base (empleados/centros).");
    } finally {
      setBaseDataLoading(false);
    }
  }, [baseDataLoaded]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const [pending, all] = await Promise.all([
        getAllPendingVacations(),
        getAllVacations(),
      ]);
      setPendingVacations(pending);
      setAllVacations(all);
    } catch (e) {
      console.error("Error loading requests:", e);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadDayShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const s = await getShiftsByDate(dateStr);
      setDayShifts(s);
    } catch (e) {
      console.error("Error loading day shifts:", e);
    } finally {
      setShiftsLoading(false);
    }
  }, [selectedDate]);

  // Main UI coordination useEffect
  useEffect(() => {
    const fetchTabData = async () => {
      try {
        if (activeTab === 'requests') {
          await loadRequests();
        } else if (activeTab === 'shifts') {
          await Promise.all([loadBaseData(), loadDayShifts()]);
        } else if (activeTab === 'attendances') {
          await Promise.all([loadBaseData(), loadDayAttendances()]);
        } else if (activeTab === 'employees') {
          await loadBaseData();
        } else if (activeTab === 'reports') {
          await Promise.all([loadBaseData(), loadReportData()]);
        }
      } catch (e) {
        console.error("Error dispatching tab data:", e);
      }
    };
    fetchTabData();
  }, [activeTab, selectedDate, attendanceDate, reportMonth, loadBaseData, loadRequests, loadDayShifts]);

  const loadDayAttendances = useCallback(async () => {
    setAttendancesLoading(true);
    try {
      const dateStr = format(attendanceDate, 'yyyy-MM-dd');
      let records = [];
      let usedRecentFallback = false;

      try {
        records = await getAllAttendancesByDate(attendanceDate);
      } catch (e) {
        console.error('Error loading day attendances:', e);
      }

      const activeRecords = [...records]
        .filter((record) => record.record_status !== 'voided')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const empStatus = {};
      const latestActiveByEmployee = {};
      activeRecords.forEach(r => {
        empStatus[r.employee_id] = r.type;
        latestActiveByEmployee[r.employee_id] = r.id;
      });

      const enrichedRecords = records.map(r => ({
        ...r,
        employee_name: employees.find((employee) => employee.id === r.employee_id)?.name || `Empleado #${r.employee_id}`,
        isActive: r.record_status !== 'voided' && empStatus[r.employee_id] === 'in' && format(new Date(), 'yyyy-MM-dd') === dateStr,
        canInvalidate: r.record_status !== 'voided' && latestActiveByEmployee[r.employee_id] === r.id,
      }));

      setDayAttendances(enrichedRecords);
      setAttendanceUsesRecentFallback(usedRecentFallback);
    } catch (e) {
      console.error('Outer error loading day attendances:', e);
    } finally {
      setAttendancesLoading(false);
    }
  }, [attendanceDate, employees]);

  const loadReportData = useCallback(async () => {
    setReportsLoading(true);
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
        return { id: emp.id, name: emp.name, morning, afternoon, night, vacations: vacDays, totalShifts: empShifts.length };
      });
      setReportData(data);
    } finally {
      setReportsLoading(false);
    }
  }, [reportMonth]);

  // ────────────────────────────────────────────
  // Memos
  // ────────────────────────────────────────────

  const filteredAttendances = React.useMemo(() => {
    return dayAttendances.filter(r => {
      if (!attendanceFilter) return true;
      const name = (r.employee_name || r.employees?.name || '').toString();
      return name.toLowerCase().includes(attendanceFilter.toLowerCase());
    });
  }, [dayAttendances, attendanceFilter]);

  const getWorkCenterName = useCallback((centerId) => {
    if (!centerId) return null;
    return workCenters.find((center) => center.id === centerId)?.name || null;
  }, [workCenters]);

  const hasAttendanceCoordinates = useCallback((attendance) => (
    attendance?.latitude != null && attendance?.longitude != null
  ), []);

  // ────────────────────────────────────────────
  // Vacation handlers
  // ────────────────────────────────────────────

  const handleApprove = async (id) => {
    try { await approveVacation(id); await loadAll(); Alert.alert('✅ Aprobada', 'La solicitud ha sido aprobada.'); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleReject = async (id) => {
    Alert.alert('Rechazar solicitud', '¿Confirmas el rechazo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: async () => { await rejectVacation(id); await loadAll(); } },
    ]);
  };

  const handleCancel = async (vacation) => {
    Alert.alert('Cancelar solicitud', '¿Seguro que quiere cancelar la solicitud?', [
      { text: 'Atrás', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: async () => { await cancelVacation(vacation); await loadAll(); } },
    ]);
  };

  const handleReactive = async (vacationId) => {
    Alert.alert('Reactivar solicitud', '¿Seguro que quiere reactivar la solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reactivar', style: 'destructive', onPress: async () => { await reactiveVacation(vacationId); await loadAll(); } },
    ]);
  };

  const handleDelete = async (idVacation) => {
    Alert.alert('¿Seguro que quieres eliminar la solicitud?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteVacation(idVacation); await loadAll(); } },
    ]);
  };

  // ────────────────────────────────────────────
  // Shift handlers
  // ────────────────────────────────────────────

  const handleSelectEmployeeForAssignment = async (emp) => {
    setSelectedEmp(emp);
    setModifiedAssignmentDates(new Set());
    if (!emp) { setDailyAssignments({}); return; }
    try {
      const empShifts = await getShiftsByEmployee(emp.id);
      const assignments = {};
      empShifts.forEach(s => { assignments[s.date] = s.shift_type; });
      setDailyAssignments(assignments);
    } catch (e) { console.error(e); }
  };

  const handleAddShift = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try {
      const datesToProcess = Array.from(modifiedAssignmentDates);
      const shiftsToCreate = [];
      const datesToClear = [];
      const vacationDays = [];
      let omittedCount = 0;
      const empVacations = allVacations.filter(v => v.employee_id === selectedEmp.id && v.status === 'approved');

      for (const dStr of datesToProcess) {
        const date = parseISO(dStr);
        const hasConflict = empVacations.some(v =>
          isWithinInterval(date, { start: parseISO(v.start_date), end: parseISO(v.end_date) })
        );
        if (hasConflict) { omittedCount++; continue; }
        datesToClear.push(dStr);
        const task = dailyAssignments[dStr] || 'none';
        if (task === 'morning' || task === 'afternoon' || task === 'night') {
          shiftsToCreate.push({ employee_id: selectedEmp.id, date: dStr, shift_type: task });
        } else if (task === 'vacation') {
          vacationDays.push(date);
        }
      }

      await Promise.all(datesToClear.map(dateStr => deleteShiftsForEmployeeOnDate(selectedEmp.id, dateStr)));
      if (shiftsToCreate.length > 0) await bulkCreateShifts(shiftsToCreate);

      if (vacationDays.length > 0) {
        const intervals = [];
        let curStart = vacationDays[0]; let curEnd = vacationDays[0];
        for (let i = 1; i < vacationDays.length; i++) {
          const d = vacationDays[i];
          const diff = Math.round((d - curEnd) / (1000 * 60 * 60 * 24));
          if (diff === 1) { curEnd = d; } else { intervals.push({ start: curStart, end: curEnd }); curStart = d; curEnd = d; }
        }
        intervals.push({ start: curStart, end: curEnd });
        for (const inter of intervals) {
          const reqId = await requestVacation({ employee_id: selectedEmp.id, start_date: format(inter.start, 'yyyy-MM-dd'), end_date: format(inter.end, 'yyyy-MM-dd'), reason: 'Asignación automática desde panel' });
          await approveVacation(reqId);
        }
      }

      await loadDayShifts(); await loadAll();
      setShiftModalVisible(false); setSelectedEmp(null); setDailyAssignments({}); setModifiedAssignmentDates(new Set());
      Alert.alert('✅ Éxito', `Planificación guardada:\nTurnos asignados: ${shiftsToCreate.length}\nDías de vacación solicitados: ${vacationDays.length}${omittedCount > 0 ? `\n\n⚠️ Omitidos por vacaciones aprobadas: ${omittedCount}` : ''}`);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Hubo un error al guardar los turnos.');
    } finally { setLoading(false); }
  };

  const handleDeleteShift = async (shift) => {
    Alert.alert('Eliminar turno', `¿Eliminar turno de ${shift.employee_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteShift(shift.id); await loadDayShifts(); } },
    ]);
  };

  const openEditShift = (shift) => {
    setEditingShift(shift); setEditShiftStart(shift.start_time || ''); setEditShiftEnd(shift.end_time || ''); setEditShiftModalVisible(true);
  };

  const handleSaveShift = async () => {
    if (!editingShift) return;
    try {
      setLoading(true);
      await updateShift(editingShift.id, { start_time: editShiftStart, end_time: editShiftEnd });
      await loadDayShifts(); setEditShiftModalVisible(false);
    } catch (e) { console.error(e); Alert.alert('Error', 'No se pudo actualizar el horario del turno.'); }
    finally { setLoading(false); }
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
      const newShifts = []; const conflicts = [];
      sourceShifts.forEach(s => {
        const sDate = parseISO(s.date); const tDate = addWeeks(sDate, 1); const tDateStr = format(tDate, 'yyyy-MM-dd');
        const hasVacation = approvedVacations.find(v => v.employee_id === s.employee_id && isWithinInterval(tDate, { start: parseISO(v.start_date), end: parseISO(v.end_date) }));
        const alreadyHasShift = targetShifts.find(ts => ts.employee_id === s.employee_id && ts.date === tDateStr);
        if (hasVacation) { conflicts.push({ ...s, reason: 'Vacaciones', targetDate: tDateStr }); }
        else if (alreadyHasShift) { conflicts.push({ ...s, reason: 'Shift duplicado', targetDate: tDateStr }); }
        else { newShifts.push({ employee_id: s.employee_id, employee_name: s.employee_name, date: tDateStr, shift_type: s.shift_type }); }
      });
      setCopySummary({ shifts: newShifts, conflicts, sourceRange: `${format(sourceStart, 'd MMM')} - ${format(sourceEnd, 'd MMM')}`, targetRange: `${format(targetStart, 'd MMM')} - ${format(targetEnd, 'd MMM')}` });
      setCopyModalVisible(true);
    } catch (e) { console.error(e); Alert.alert('Error', 'No se pudieron recuperar los turnos de la semana anterior.'); }
    finally { setLoading(false); }
  };

  const handleExecuteCopy = async () => {
    if (copySummary.shifts.length === 0) return;
    setLoading(true);
    try {
      await bulkCreateShifts(copySummary.shifts);
      Alert.alert('✅ Éxito', `Se han copiado ${copySummary.shifts.length} turnos correctamente.`);
      setCopyModalVisible(false); await loadDayShifts();
    } catch (e) { Alert.alert('Error', 'No se pudieron guardar los turnos.'); }
    finally { setLoading(false); }
  };

  // ────────────────────────────────────────────
  // Attendance handlers
  // ────────────────────────────────────────────

  const handleShowAttendanceLocation = useCallback((attendance) => {
    if (!hasAttendanceCoordinates(attendance)) {
      Alert.alert('Ubicacion no disponible', 'Este fichaje no tiene coordenadas guardadas.'); return;
    }
    setSelectedAttendanceLocation(attendance); setLocationModalVisible(true);
  }, [hasAttendanceCoordinates]);

  const handleOpenAttendanceAction = useCallback((attendance) => {
    setSelectedAttendanceAction(attendance); setAttendanceActionReason(''); setAttendanceActionModalVisible(true);
  }, []);

  const getDefaultManualAttendanceTime = useCallback(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, []);

  const handleOpenManualAttendanceModal = useCallback(() => {
    setManualAttendanceEmployeeId(null); setManualAttendanceType('in');
    setManualAttendanceTime(getDefaultManualAttendanceTime()); setManualAttendanceNote('');
    setManualAttendanceModalVisible(true);
  }, [getDefaultManualAttendanceTime]);

  const buildManualAttendanceTimestamp = useCallback((date, timeText) => {
    const trimmed = timeText.trim();
    if (!/^\d{2}:\d{2}$/.test(trimmed)) throw new Error('La hora debe tener formato HH:mm.');
    const [hours, minutes] = trimmed.split(':').map(Number);
    if (hours > 23 || minutes > 59) throw new Error('La hora manual indicada no es valida.');
    const nextTimestamp = new Date(date); nextTimestamp.setHours(hours, minutes, 0, 0);
    return nextTimestamp;
  }, []);

  const handleOpenAttendanceLocationInMaps = useCallback(async () => {
    if (!selectedAttendanceLocation || !hasAttendanceCoordinates(selectedAttendanceLocation)) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${selectedAttendanceLocation.latitude},${selectedAttendanceLocation.longitude}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) { Alert.alert('No disponible', 'No se pudo abrir la ubicacion en la aplicacion de mapas.'); return; }
      await Linking.openURL(url);
    } catch (error) { Alert.alert('Error', 'No se pudo abrir la ubicacion en mapas.'); }
  }, [selectedAttendanceLocation, hasAttendanceCoordinates]);

  const handleInvalidateAttendance = useCallback(async () => {
    const trimmedReason = attendanceActionReason.trim();
    if (!selectedAttendanceAction?.id) { Alert.alert('Error', 'No se ha seleccionado ningun fichaje.'); return; }
    if (!trimmedReason) { Alert.alert('Error', 'Debes indicar un motivo para anular el fichaje.'); return; }
    if (!user?.id) { Alert.alert('Error', 'No se ha identificado al administrador actual.'); return; }
    try {
      setAttendanceActionLoading(true);
      await invalidateAttendanceByAdmin(selectedAttendanceAction.id, { adminEmployeeId: user.id, reason: trimmedReason });
      await loadDayAttendances();
      setAttendanceActionModalVisible(false); setSelectedAttendanceAction(null); setAttendanceActionReason('');
      Alert.alert('Fichaje anulado', 'El fichaje ha quedado anulado con trazabilidad de administracion.');
    } catch (error) { Alert.alert('Error', error.message || 'No se pudo anular el fichaje.'); }
    finally { setAttendanceActionLoading(false); }
  }, [attendanceActionReason, loadDayAttendances, selectedAttendanceAction, user]);

  const handleCreateManualAttendance = useCallback(async () => {
    if (!user?.id) { Alert.alert('Error', 'No se ha identificado al administrador actual.'); return; }
    if (!manualAttendanceEmployeeId) { Alert.alert('Error', 'Debes seleccionar un empleado.'); return; }
    try {
      setManualAttendanceLoading(true);
      const timestamp = buildManualAttendanceTimestamp(attendanceDate, manualAttendanceTime);
      await createManualAttendanceByAdmin({ adminEmployeeId: user.id, employeeId: manualAttendanceEmployeeId, type: manualAttendanceType, timestamp, note: manualAttendanceNote });
      await loadDayAttendances();
      setManualAttendanceModalVisible(false); setManualAttendanceEmployeeId(null); setManualAttendanceType('in');
      setManualAttendanceTime(getDefaultManualAttendanceTime()); setManualAttendanceNote('');
      Alert.alert('Fichaje creado', 'El fichaje manual se ha registrado correctamente.');
    } catch (error) { Alert.alert('Error', error.message || 'No se pudo registrar el fichaje manual.'); }
    finally { setManualAttendanceLoading(false); }
  }, [attendanceDate, buildManualAttendanceTimestamp, getDefaultManualAttendanceTime, loadDayAttendances, manualAttendanceEmployeeId, manualAttendanceNote, manualAttendanceTime, manualAttendanceType, user]);

  // ────────────────────────────────────────────
  // Employee handlers
  // ────────────────────────────────────────────

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp); setEditName(emp.name); setEditEmail(emp.email);
    setEditDays(String(emp.available_days)); setEditAttendancePolicy(emp.attendance_policy || 'anywhere');
    setEditAssignedCenterId(emp.assigned_work_center_id || null); setEditModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    const daysNum = parseInt(editDays, 10);
    if (isNaN(daysNum) || daysNum < 0) { Alert.alert('Error', 'Los días deben ser un número válido.'); return; }
    if (editAttendancePolicy === 'assigned_center' && !editAssignedCenterId) {
      Alert.alert('Error', 'Debes asignar un centro de trabajo para esta politica de fichaje.'); return;
    }
    try {
      await updateEmployee(editingEmployee.id, {
        name: editName, email: editEmail, available_days: daysNum,
        attendance_policy: editAttendancePolicy,
        assigned_work_center_id: editAttendancePolicy === 'assigned_center' ? editAssignedCenterId : null,
      });
      await loadAll(); setEditModalVisible(false);
    } catch (e) { Alert.alert('Error', 'No se pudo actualizar el empleado.'); }
  };

  const handleDeleteEmployee = async () => {
    Alert.alert('Eliminar Empleado', `¿Estás seguro de que deseas eliminar a ${editingEmployee.name}? Esta acción es irreversible.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteEmployee(editingEmployee.id, editingEmployee.auth_user_id); await loadAll(); setEditModalVisible(false); Alert.alert('✅ Eliminado', 'El empleado y su cuenta de acceso han sido eliminados.'); }
        catch (e) { Alert.alert('Error', e.message || 'No se pudo eliminar el empleado.'); }
      }},
    ]);
  };

  const handleResetPassword = () => {
    Alert.alert('Restablecer Contraseña', `Se enviará un correo de recuperación seguro a ${editingEmployee.name} y se marcará el cambio de contraseña como obligatorio.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restablecer', style: 'destructive', onPress: async () => {
        try {
          await resetEmployeePassword(editingEmployee.id, editingEmployee.email);
          Alert.alert('Correo de recuperación enviado', `Se ha enviado un enlace de restablecimiento a ${editingEmployee.email}.`, [{ text: 'Entendido' }]);
          setEditModalVisible(false);
        } catch (e) { Alert.alert('Error', e.message || 'No se pudo iniciar la recuperación de contraseña.'); }
      }},
    ]);
  };

  const handleCreateEmployee = async () => {
    if (!newName || !newEmail) { Alert.alert('Error', 'Por favor, rellena todos los campos.'); return; }
    try {
      setLoading(true);
      const result = await createEmployee({ name: newName, email: newEmail, available_days: parseInt(newInitialDays, 10) || 22 });
      Alert.alert('✅ Éxito', `Empleado ${newName} creado correctamente.\n\nContraseña temporal:\n${result.temporaryPassword}\n\nGuárdala y entrégasela al empleado. Se le pedirá cambiarla al iniciar sesión.`);
      setAddEmpModalVisible(false); setNewName(''); setNewEmail(''); setNewInitialDays('22'); await loadAll();
    } catch (e) { Alert.alert('Error', 'No se pudo crear el empleado. Verifica si el email ya existe.'); }
    finally { setLoading(false); }
  };

  // ────────────────────────────────────────────
  // Work center handlers
  // ────────────────────────────────────────────

  const resetWorkCenterForm = () => {
    setEditingWorkCenter(null); setCenterName(''); setCenterAddress(''); setCenterLatitude(''); setCenterLongitude(''); setCenterRadius('150');
  };

  const openCreateWorkCenterModal = () => { resetWorkCenterForm(); setWorkCenterModalVisible(true); };

  const openEditWorkCenterModal = (center) => {
    setEditingWorkCenter(center); setCenterName(center.name || ''); setCenterAddress(center.address || '');
    setCenterLatitude(String(center.latitude ?? '')); setCenterLongitude(String(center.longitude ?? ''));
    setCenterRadius(String(center.radius_meters ?? '150')); setWorkCenterModalVisible(true);
  };

  const handleSaveWorkCenter = async () => {
    const latitude = parseFloat(centerLatitude); const longitude = parseFloat(centerLongitude); const radius = parseFloat(centerRadius);
    if (!centerName.trim()) { Alert.alert('Error', 'Debes indicar un nombre para el centro.'); return; }
    if ([latitude, longitude, radius].some((value) => Number.isNaN(value))) {
      Alert.alert('Error', 'Latitud, longitud y radio deben ser valores numericos validos.'); return;
    }
    try {
      if (editingWorkCenter?.id) {
        await updateWorkCenter(editingWorkCenter.id, { name: centerName, address: centerAddress, latitude, longitude, radius_meters: radius });
      } else {
        await createWorkCenter({ name: centerName, address: centerAddress, latitude, longitude, radius_meters: radius });
      }
      await loadAll(); setWorkCenterModalVisible(false); resetWorkCenterForm();
    } catch (error) { Alert.alert('Error', error.message || 'No se pudo guardar el centro de trabajo.'); }
  };

  const handleDeleteWorkCenter = async (center) => {
    Alert.alert('Eliminar centro', `¿Seguro que quieres eliminar "${center.name}"? Los empleados asignados perderan la referencia al centro.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteWorkCenter(center.id); await loadAll(); }
        catch (error) { Alert.alert('Error', error.message || 'No se pudo eliminar el centro.'); }
      }},
    ]);
  };

  // ────────────────────────────────────────────
  // PDF Export
  // ────────────────────────────────────────────

  const handleExportarPDF = async () => {
    setExportandoPDF(true);
    try {
      const year = reportMonth.getFullYear(); const month = reportMonth.getMonth() + 1;
      const shiftsData = await getShiftsForMonth(year, month);
      const allVacationsData = await getAllVacations();
      const empleados = employees.map(emp => {
        const turnos = [];
        for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
          const fecha = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const turno = shiftsData.find(s => s.employee_id === emp.id && s.date === fecha);
          if (turno) {
            let tipo = '';
            if (turno.shift_type === 'morning') tipo = 'M';
            else if (turno.shift_type === 'afternoon') tipo = 'T';
            else if (turno.shift_type === 'night') tipo = 'N';
            turnos.push({ dia: d, tipo });
          }
        }
        const vacaciones = [];
        allVacationsData.filter(v => v.employee_id === emp.id && v.status === 'approved').forEach(v => {
          const start = new Date(v.start_date); const end = new Date(v.end_date);
          for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
            const fecha = new Date(year, month - 1, d);
            if (fecha >= start && fecha <= end) vacaciones.push({ dia: d });
          }
        });
        return { nombre: emp.name, turnos, vacaciones };
      });
      await generarReportePDF(empleados, { mes: month, año: year, nombreEmpresa: 'TransferLog' });
    } catch (e) { Alert.alert('Error', e.message || 'No se pudo generar el PDF'); }
    finally { setExportandoPDF(false); }
  };

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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

      {isActiveTabLoading() ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (<>
        {activeTab === 'requests' && (
          <RequestsTab
            pendingVacations={pendingVacations}
            allVacations={allVacations}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={handleCancel}
            onReactive={handleReactive}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftsTab
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dayShifts={dayShifts}
            onPrepareCopy={handlePrepareCopy}
            onOpenEditShift={openEditShift}
            onDeleteShift={handleDeleteShift}
            onOpenAssignModal={() => { setAssignEndDate(selectedDate); setShiftModalVisible(true); }}
          />
        )}

        {activeTab === 'attendances' && (
          <AttendancesTab
            attendanceDate={attendanceDate}
            setAttendanceDate={setAttendanceDate}
            attendanceFilter={attendanceFilter}
            setAttendanceFilter={setAttendanceFilter}
            attendanceUsesRecentFallback={attendanceUsesRecentFallback}
            filteredAttendances={filteredAttendances}
            pulseAnim={pulseAnim}
            hasAttendanceCoordinates={hasAttendanceCoordinates}
            onShowAttendanceLocation={handleShowAttendanceLocation}
            onOpenAttendanceAction={handleOpenAttendanceAction}
            onOpenManualAttendanceModal={handleOpenManualAttendanceModal}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesTab
            employees={employees}
            workCenters={workCenters}
            getWorkCenterName={getWorkCenterName}
            onEditEmployee={handleEditEmployee}
            onAddEmployee={() => setAddEmpModalVisible(true)}
            onOpenCreateWorkCenter={openCreateWorkCenterModal}
            onEditWorkCenter={openEditWorkCenterModal}
            onDeleteWorkCenter={handleDeleteWorkCenter}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            reportData={reportData}
            exportandoPDF={exportandoPDF}
            onExportarPDF={handleExportarPDF}
          />
        )}
      </>)}

      {/* ── Modals ── */}

      <LocationInfoModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        attendance={selectedAttendanceLocation}
        onOpenInMaps={handleOpenAttendanceLocationInMaps}
      />

      <ManualAttendanceModal
        visible={manualAttendanceModalVisible}
        onClose={() => setManualAttendanceModalVisible(false)}
        attendanceDate={attendanceDate}
        employees={employees}
        selectedEmployeeId={manualAttendanceEmployeeId}
        setSelectedEmployeeId={setManualAttendanceEmployeeId}
        attendanceType={manualAttendanceType}
        setAttendanceType={setManualAttendanceType}
        time={manualAttendanceTime}
        setTime={setManualAttendanceTime}
        note={manualAttendanceNote}
        setNote={setManualAttendanceNote}
        loading={manualAttendanceLoading}
        onSubmit={handleCreateManualAttendance}
      />

      <AttendanceActionModal
        visible={attendanceActionModalVisible}
        onClose={() => { setAttendanceActionModalVisible(false); setSelectedAttendanceAction(null); setAttendanceActionReason(''); }}
        attendance={selectedAttendanceAction}
        reason={attendanceActionReason}
        setReason={setAttendanceActionReason}
        loading={attendanceActionLoading}
        onConfirm={handleInvalidateAttendance}
      />

      <ShiftAssignmentModal
        visible={shiftModalVisible}
        onClose={() => { setShiftModalVisible(false); setSelectedEmp(null); setDailyAssignments({}); setModifiedAssignmentDates(new Set()); }}
        employees={employees}
        selectedEmp={selectedEmp}
        onSelectEmployee={handleSelectEmployeeForAssignment}
        activeBrush={activeBrush}
        setActiveBrush={setActiveBrush}
        markedDatesForCalendar={markedDatesForCalendar}
        onDayPress={(day) => {
          setModifiedAssignmentDates(prev => { const next = new Set(prev); next.add(day.dateString); return next; });
          setDailyAssignments(prev => ({ ...prev, [day.dateString]: activeBrush }));
        }}
        onSubmit={handleAddShift}
      />

      <EditEmployeeModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        employee={editingEmployee}
        editName={editName}
        setEditName={setEditName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editDays={editDays}
        setEditDays={setEditDays}
        editAttendancePolicy={editAttendancePolicy}
        setEditAttendancePolicy={setEditAttendancePolicy}
        editAssignedCenterId={editAssignedCenterId}
        setEditAssignedCenterId={setEditAssignedCenterId}
        workCenters={workCenters}
        onSave={handleSaveEmployee}
        onDelete={handleDeleteEmployee}
        onResetPassword={handleResetPassword}
      />

      <AddEmployeeModal
        visible={addEmpModalVisible}
        onClose={() => setAddEmpModalVisible(false)}
        newName={newName}
        setNewName={setNewName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newInitialDays={newInitialDays}
        setNewInitialDays={setNewInitialDays}
        onSubmit={handleCreateEmployee}
      />

      <WorkCenterModal
        visible={workCenterModalVisible}
        onClose={() => { setWorkCenterModalVisible(false); resetWorkCenterForm(); }}
        isEditing={!!editingWorkCenter}
        centerName={centerName}
        setCenterName={setCenterName}
        centerAddress={centerAddress}
        setCenterAddress={setCenterAddress}
        centerLatitude={centerLatitude}
        setCenterLatitude={setCenterLatitude}
        centerLongitude={centerLongitude}
        setCenterLongitude={setCenterLongitude}
        centerRadius={centerRadius}
        setCenterRadius={setCenterRadius}
        onSave={handleSaveWorkCenter}
      />

      <CopyWeekModal
        visible={copyModalVisible}
        onClose={() => setCopyModalVisible(false)}
        copySummary={copySummary}
        onConfirm={handleExecuteCopy}
      />

      <EditShiftTimeModal
        visible={editShiftModalVisible}
        onClose={() => setEditShiftModalVisible(false)}
        editingShift={editingShift}
        editShiftStart={editShiftStart}
        setEditShiftStart={setEditShiftStart}
        editShiftEnd={editShiftEnd}
        setEditShiftEnd={setEditShiftEnd}
        onSave={handleSaveShift}
      />
    </View>
  );
}
