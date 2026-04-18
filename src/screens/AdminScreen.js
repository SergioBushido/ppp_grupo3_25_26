import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generarReportePDF } from '../lib/pdfService';
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
  Animated,
  Linking,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, differenceInCalendarDays, startOfWeek, endOfWeek, subWeeks, addWeeks, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native'

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';
import { getAllPendingVacations, approveVacation, rejectVacation, getAllVacations, requestVacation, cancelVacation, reactiveVacation, deleteVacation } from '../database/vacationService';
import { getAllEmployees, updateEmployee, deleteEmployee, createEmployee, resetEmployeePassword } from '../database/employeeService';
import { getShiftsByDate, createShift, deleteShiftsForEmployeeOnDate, getShiftsForMonth, getShiftsInRange, bulkCreateShifts, updateShift, getShiftsByEmployee } from '../database/shiftService';
import { getAllAttendancesByDate } from '../database/attendanceService';
import { createWorkCenter, deleteWorkCenter, getAllWorkCenters, updateWorkCenter } from '../database/workCenterService';
import { VacationCard } from '../components/VacationCard';
import { ShiftBadge } from '../components/ShiftBadge';
import UserAvatar from '../components/UserAvatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = [
  { key: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { key: 'shifts', label: 'Turnos', icon: 'calendar-edit' },
  { key: 'attendances', label: 'Fichajes', icon: 'clock-check-outline' },
  { key: 'employees', label: 'Empleados', icon: 'account-group' },
  { key: 'reports', label: 'Reportes', icon: 'chart-bar' },
];

const SHIFT_OPTIONS = [
  { type: 'morning', label: 'Mañana', icon: 'weather-sunny' },
  { type: 'afternoon', label: 'Tarde', icon: 'weather-sunset' },
  { type: 'night', label: 'Noche', icon: 'weather-night' },
];

const ATTENDANCE_POLICIES = [
  { value: 'anywhere', label: 'Libre', description: 'Puede fichar desde cualquier ubicacion.' },
  { value: 'assigned_center', label: 'Centro asignado', description: 'Debe estar dentro del radio del centro configurado.' },
  { value: 'manual_only', label: 'Solo manual', description: 'El fichaje no se registra desde la app.' },
];

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingVacations, setPendingVacations] = useState([]);
  const [allVacations, setAllVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const [selectedAttendanceLocation, setSelectedAttendanceLocation] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
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
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
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

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDays, setEditDays] = useState('');
  const [editAttendancePolicy, setEditAttendancePolicy] = useState('anywhere');
  const [editAssignedCenterId, setEditAssignedCenterId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

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
  // Estado para exportación PDF
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // Construye la matriz mensual para el PDF (usa estados locales)
  const construirMatrizPDF = () => {
    const year = reportMonth.getFullYear();
    const month = reportMonth.getMonth() + 1;
    const diasMes = new Date(year, month, 0).getDate();
    return employees.map(emp => {
      const turnos = [];
      const empShifts = reportData.find(e => e.id === emp.id)?.shifts || [];
      for (let d = 1; d <= diasMes; d++) {
        const turno = empShifts.find(t => Number(t.dia) === d);
        if (turno) {
          let tipo = '';
          if (turno.shift_type === 'morning') tipo = 'M';
          else if (turno.shift_type === 'afternoon') tipo = 'T';
          else if (turno.shift_type === 'night') tipo = 'N';
          turnos.push({ dia: d, tipo });
        }
      }
      const vacaciones = [];
      const empVac = reportData.find(e => e.id === emp.id)?.vacacionesDias || [];
      for (let d = 1; d <= diasMes; d++) {
        if (empVac.includes(d)) vacaciones.push({ dia: d });
      }
      return { nombre: emp.name, turnos, vacaciones };
    });
  };

  // Exportar PDF detallado
  const handleExportarPDF = async () => {
    setExportandoPDF(true);
    try {
      const year = reportMonth.getFullYear();
      const month = reportMonth.getMonth() + 1;
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
          const start = new Date(v.start_date);
          const end = new Date(v.end_date);
          for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
            const fecha = new Date(year, month - 1, d);
            if (fecha >= start && fecha <= end) {
              vacaciones.push({ dia: d });
            }
          }
        });
        return { nombre: emp.name, turnos, vacaciones };
      });
      await generarReportePDF(empleados, { mes: month, año: year, nombreEmpresa: 'TransferLog' });
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo generar el PDF');
    } finally {
      setExportandoPDF(false);
    }
  };

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

  const handleShowAttendanceLocation = useCallback((attendance) => {
    if (!hasAttendanceCoordinates(attendance)) {
      Alert.alert('Ubicacion no disponible', 'Este fichaje no tiene coordenadas guardadas.');
      return;
    }

    setSelectedAttendanceLocation(attendance);
    setLocationModalVisible(true);
  }, [hasAttendanceCoordinates]);

  const handleOpenAttendanceLocationInMaps = useCallback(async () => {
    if (!selectedAttendanceLocation || !hasAttendanceCoordinates(selectedAttendanceLocation)) {
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${selectedAttendanceLocation.latitude},${selectedAttendanceLocation.longitude}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('No disponible', 'No se pudo abrir la ubicacion en la aplicacion de mapas.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la ubicacion en mapas.');
    }
  }, [selectedAttendanceLocation, hasAttendanceCoordinates]);

  


  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, all, emps, centers] = await Promise.all([
        getAllPendingVacations(),
        getAllVacations(),
        getAllEmployees(),
        getAllWorkCenters(),
      ]);
      setPendingVacations(pending);
      setAllVacations(all);
      setEmployees(emps.filter((e) => e.role === 'employee'));
      setWorkCenters(centers);
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

  useEffect(() => {
    if (activeTab === 'shifts') {
      loadDayShifts();
    }
  }, [selectedDate, activeTab, loadDayShifts]);

  const loadDayShifts = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const s = await getShiftsByDate(dateStr);
    setDayShifts(s);
  }, [selectedDate]);

  const loadDayAttendances = useCallback(async () => {
    const dateStr = format(attendanceDate, 'yyyy-MM-dd');
    const records = await getAllAttendancesByDate(dateStr);
    
    // Identify active employees (who have an 'in' but no 'out' yet)
    const empStatus = {};
    records.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(r => {
      empStatus[r.employee_id] = r.type;
    });
    
    const enrichedRecords = records.map(r => ({
      ...r,
      isActive: empStatus[r.employee_id] === 'in' && format(new Date(), 'yyyy-MM-dd') === dateStr
    }));

    setDayAttendances(enrichedRecords);
  }, [attendanceDate]);

  useEffect(() => {
    if (activeTab === 'attendances') {
      loadDayAttendances();
    }
  }, [activeTab, loadDayAttendances]);

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

  const handleCancel = async (vacation) => {

    Alert.alert('Cancelar solicitud', '¿Seguro que quiere cancelar la solicitud?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: 'Confirmar', style: 'destructive',
        onPress: async () => {
          await cancelVacation(vacation);
          await loadAll();
        },
      },
    ]);
  };

  const handleReactive = async (vacationId) => {

    Alert.alert('Reactivar solicitud', '¿Seguro que quiere reactivar la solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reactivar', style: 'destructive',
        onPress: async () => {
          await reactiveVacation(vacationId);
          await loadAll();
        },
      },
    ]);
  };

  const handleDelete = async (idVacation) => {

    Alert.alert(
      '¿Seguro que quieres eliminar la solicitud?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteVacation(idVacation);
            await loadAll();
          },
        },
      ]
    );
  };

  const getDaysInRange = (start, end) => {
    let s = new Date(start); s.setHours(0, 0, 0, 0);
    let e = new Date(end); e.setHours(0, 0, 0, 0);
    if (e < s) { const t = s; s = e; e = t; }
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
            intervals.push({ start: curStart, end: curEnd });
            curStart = d;
            curEnd = d;
          }
        }
        intervals.push({ start: curStart, end: curEnd });

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
      setModifiedAssignmentDates(new Set());

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

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setEditShiftStart(shift.start_time || '');
    setEditShiftEnd(shift.end_time || '');
    setEditShiftModalVisible(true);
  };

  const handleSaveShift = async () => {
    if (!editingShift) return;
    try {
      setLoading(true);
      await updateShift(editingShift.id, {
        start_time: editShiftStart,
        end_time: editShiftEnd
      });
      await loadDayShifts();
      setEditShiftModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo actualizar el horario del turno.');
    } finally {
      setLoading(false);
    }
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


  const handleSelectEmployeeForAssignment = async (emp) => {
    setSelectedEmp(emp);
    setModifiedAssignmentDates(new Set());
    if (!emp) {
      setDailyAssignments({});
      return;
    }
    
    // Load pre-existing shifts visually
    try {
      const empShifts = await getShiftsByEmployee(emp.id);
      const assignments = {};
      empShifts.forEach(s => {
        assignments[s.date] = s.shift_type;
      });
      setDailyAssignments(assignments);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditDays(String(emp.available_days));
    setEditAttendancePolicy(emp.attendance_policy || 'anywhere');
    setEditAssignedCenterId(emp.assigned_work_center_id || null);
    setEditModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    const daysNum = parseInt(editDays, 10);
    if (isNaN(daysNum) || daysNum < 0) {
      Alert.alert('Error', 'Los días deben ser un número válido.');
      return;
    }

    if (editAttendancePolicy === 'assigned_center' && !editAssignedCenterId) {
      Alert.alert('Error', 'Debes asignar un centro de trabajo para esta politica de fichaje.');
      return;
    }

    try {
      await updateEmployee(editingEmployee.id, {
        name: editName,
        email: editEmail,
        available_days: daysNum,
        attendance_policy: editAttendancePolicy,
        assigned_work_center_id: editAttendancePolicy === 'assigned_center' ? editAssignedCenterId : null,
      });
      await loadAll();
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el empleado.');
    }
  };

  const resetWorkCenterForm = () => {
    setEditingWorkCenter(null);
    setCenterName('');
    setCenterAddress('');
    setCenterLatitude('');
    setCenterLongitude('');
    setCenterRadius('150');
  };

  const openCreateWorkCenterModal = () => {
    resetWorkCenterForm();
    setWorkCenterModalVisible(true);
  };

  const openEditWorkCenterModal = (center) => {
    setEditingWorkCenter(center);
    setCenterName(center.name || '');
    setCenterAddress(center.address || '');
    setCenterLatitude(String(center.latitude ?? ''));
    setCenterLongitude(String(center.longitude ?? ''));
    setCenterRadius(String(center.radius_meters ?? '150'));
    setWorkCenterModalVisible(true);
  };

  const handleSaveWorkCenter = async () => {
    const latitude = parseFloat(centerLatitude);
    const longitude = parseFloat(centerLongitude);
    const radius = parseFloat(centerRadius);

    if (!centerName.trim()) {
      Alert.alert('Error', 'Debes indicar un nombre para el centro.');
      return;
    }

    if ([latitude, longitude, radius].some((value) => Number.isNaN(value))) {
      Alert.alert('Error', 'Latitud, longitud y radio deben ser valores numericos validos.');
      return;
    }

    try {
      if (editingWorkCenter?.id) {
        await updateWorkCenter(editingWorkCenter.id, {
          name: centerName,
          address: centerAddress,
          latitude,
          longitude,
          radius_meters: radius,
        });
      } else {
        await createWorkCenter({
          name: centerName,
          address: centerAddress,
          latitude,
          longitude,
          radius_meters: radius,
        });
      }

      await loadAll();
      setWorkCenterModalVisible(false);
      resetWorkCenterForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar el centro de trabajo.');
    }
  };

  const handleDeleteWorkCenter = async (center) => {
    Alert.alert(
      'Eliminar centro',
      `¿Seguro que quieres eliminar "${center.name}"? Los empleados asignados perderan la referencia al centro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkCenter(center.id);
              await loadAll();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el centro.');
            }
          },
        },
      ]
    );
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

  const handleResetPassword = () => {
    Alert.alert(
      'Restablecer Contraseña',
      `Se enviará un correo de recuperación seguro a ${editingEmployee.name} y se marcará el cambio de contraseña como obligatorio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetEmployeePassword(editingEmployee.id, editingEmployee.email);
              
              Alert.alert(
                'Correo de recuperación enviado',
                `Se ha enviado un enlace de restablecimiento a ${editingEmployee.email}.`,
                [{ text: 'Entendido' }]
              );
              setEditModalVisible(false);
            } catch (e) {
              Alert.alert('Error', e.message || 'No se pudo iniciar la recuperación de contraseña.');
            }
          }
        }
      ]
    );
  };

  const handleCreateEmployee = async () => {
    if (!newName || !newEmail) {
      Alert.alert('Error', 'Por favor, rellena todos los campos.');
      return;
    }

    try {
      setLoading(true);
      const result = await createEmployee({
        name: newName,
        email: newEmail,
        available_days: parseInt(newInitialDays, 10) || 22
      });

      Alert.alert(
        '✅ Éxito',
        `Empleado ${newName} creado correctamente.\n\nContraseña temporal:\n${result.temporaryPassword}\n\nGuárdala y entrégasela al empleado. Se le pedirá cambiarla al iniciar sesión.`
      );
      setAddEmpModalVisible(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewInitialDays('22');

      await loadAll();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el empleado. Verifica si el email ya existe.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

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

      {loading || exportandoPDF ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (<>
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
                  onCancel={handleCancel}
                  onReactive={handleReactive}
                  onDelete={handleDelete}
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
                    <ShiftBadge shiftType={s.shift_type} startTime={s.start_time} endTime={s.end_time} />
                    <Text style={styles.shiftEmpName}>{s.employee_name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => openEditShift(s)} style={styles.deleteBtn}>
                        <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteShift(s)} style={styles.deleteBtn}>
                        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.rejected} />
                      </TouchableOpacity>
                    </View>
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

          {/* Attendances Tab */}
          {activeTab === 'attendances' && (
            <View style={styles.listContent}>
              <View style={styles.dateNav}>
                <TouchableOpacity style={styles.dateNavBtn} onPress={() => setAttendanceDate(addDays(attendanceDate, -1))}>
                  <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.dateNavText}>{format(attendanceDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</Text>
                <TouchableOpacity style={styles.dateNavBtn} onPress={() => setAttendanceDate(addDays(attendanceDate, 1))}>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                <TextInput
                  placeholder="Buscar empleado..."
                  value={attendanceFilter}
                  onChangeText={setAttendanceFilter}
                  style={[styles.formInput, { marginBottom: 8 }]}
                />
                <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Fichajes del día</Text>
                </Animated.View>
              </View>

              {filteredAttendances.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="clipboard-list" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No hay fichajes para esta fecha</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAttendances}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <View style={styles.shiftRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: typography.weights.bold }}>{item.employee_name}</Text>
                        <Text style={{ color: colors.textMuted }}>{format(parseISO(item.timestamp), "HH:mm:ss")}</Text>
                        {item.location_status && item.location_status !== 'not_required' && (
                          <Text style={styles.attendanceGeoText}>
                            {item.location_status === 'validated_center'
                              ? `Centro validado${item.location_note ? ` · ${item.location_note}` : ''}${item.location_distance_meters ? ` · ${Math.round(Number(item.location_distance_meters))} m` : ''}`
                              : item.location_status === 'optional_captured'
                                ? 'Ubicacion capturada'
                                : 'Ubicacion no disponible'}
                          </Text>
                        )}
                        {hasAttendanceCoordinates(item) && (
                          <TouchableOpacity
                            style={styles.locationLinkBtn}
                            onPress={() => handleShowAttendanceLocation(item)}
                          >
                            <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={colors.primary} />
                            <Text style={styles.locationLinkText}>Mostrar ubicacion</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: item.type === 'in' ? colors.morning : colors.night, fontWeight: 'bold' }}>{item.type === 'in' ? 'Entrada' : 'Salida'}</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}

          <Modal
            transparent
            visible={locationModalVisible}
            animationType="fade"
            onRequestClose={() => setLocationModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modal}>
                <Text style={styles.modalTitle}>Ubicacion del fichaje</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedAttendanceLocation?.employee_name || 'Empleado'} · {selectedAttendanceLocation?.type === 'in' ? 'Entrada' : 'Salida'}
                </Text>

                <View style={styles.locationInfoCard}>
                  <Text style={styles.locationInfoLabel}>Coordenadas</Text>
                  <Text style={styles.locationInfoValue}>
                    {selectedAttendanceLocation?.latitude != null && selectedAttendanceLocation?.longitude != null
                      ? `${Number(selectedAttendanceLocation.latitude).toFixed(6)}, ${Number(selectedAttendanceLocation.longitude).toFixed(6)}`
                      : 'No disponibles'}
                  </Text>
                </View>

                <View style={styles.locationInfoCard}>
                  <Text style={styles.locationInfoLabel}>Precision GPS</Text>
                  <Text style={styles.locationInfoValue}>
                    {selectedAttendanceLocation?.accuracy_meters != null
                      ? `${Math.round(Number(selectedAttendanceLocation.accuracy_meters))} m`
                      : 'No disponible'}
                  </Text>
                </View>

                <View style={styles.locationInfoCard}>
                  <Text style={styles.locationInfoLabel}>Estado</Text>
                  <Text style={styles.locationInfoValue}>
                    {selectedAttendanceLocation?.location_status === 'validated_center'
                      ? `Centro validado${selectedAttendanceLocation?.location_note ? ` · ${selectedAttendanceLocation.location_note}` : ''}`
                      : selectedAttendanceLocation?.location_status === 'optional_captured'
                        ? 'Ubicacion registrada en modo libre'
                        : 'Ubicacion no disponible'}
                  </Text>
                </View>

                {selectedAttendanceLocation?.location_distance_meters != null && (
                  <View style={styles.locationInfoCard}>
                    <Text style={styles.locationInfoLabel}>Distancia al centro</Text>
                    <Text style={styles.locationInfoValue}>
                      {Math.round(Number(selectedAttendanceLocation.location_distance_meters))} m
                    </Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setLocationModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleOpenAttendanceLocationInMaps}
                  >
                    <Text style={styles.modalConfirmText}>Abrir en Maps</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <View style={{ flex: 1 }}>
              <FlatList
                data={employees}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.empCard}>
                    <UserAvatar
                      name={item.name}
                      avatarUrl={item.avatar_url}
                      size={44}
                      shape="rounded"
                    />
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{item.name}</Text>
                      <Text style={styles.empEmail}>{item.email}</Text>
                      <Text style={styles.empMeta}>
                        {item.attendance_policy === 'assigned_center'
                          ? `Fichaje por centro${getWorkCenterName(item.assigned_work_center_id) ? ` · ${getWorkCenterName(item.assigned_work_center_id)}` : ''}`
                          : item.attendance_policy === 'manual_only'
                            ? 'Fichaje solo manual'
                            : 'Fichaje libre'}
                      </Text>
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
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      style={styles.addShiftBtn}
                      onPress={() => setAddEmpModalVisible(true)}
                    >
                      <MaterialCommunityIcons name="account-plus" size={18} color={colors.white} />
                      <Text style={styles.addShiftBtnText}>Añadir nuevo empleado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addShiftBtn, styles.secondaryActionBtn]}
                      onPress={openCreateWorkCenterModal}
                    >
                      <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.primary} />
                      <Text style={styles.secondaryActionBtnText}>Gestionar centros de trabajo</Text>
                    </TouchableOpacity>
                    {!!workCenters.length && (
                      <View style={styles.centerListCard}>
                        <Text style={styles.listHeader}>Centros configurados</Text>
                        {workCenters.map((center) => (
                          <View key={center.id} style={styles.centerRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.centerName}>{center.name}</Text>
                              <Text style={styles.centerMeta}>
                                Radio {Math.round(Number(center.radius_meters || 0))} m
                                {center.address ? ` · ${center.address}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity style={styles.iconActionBtn} onPress={() => openEditWorkCenterModal(center)}>
                              <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleDeleteWorkCenter(center)}>
                              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.rejected} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
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
            <ScrollView style={{ maxHeight: 120, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.empOption, selectedEmp?.id === emp.id && styles.empOptionSelected]}
                  onPress={() => handleSelectEmployeeForAssignment(emp)}
                >
                  <Text style={[styles.empOptionText, selectedEmp?.id === emp.id && styles.empOptionTextSelected]}>
                    {emp.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Pincel (Turno a asignar)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setActiveBrush('morning')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'morning' ? colors.morning : colors.white, borderWidth: 1, borderColor: colors.morning }}>
                <MaterialCommunityIcons name="weather-sunny" size={18} color={activeBrush === 'morning' ? colors.white : colors.morning} />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'morning' ? colors.white : colors.morning }}>M (08:00-16:00)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveBrush('afternoon')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'afternoon' ? colors.afternoon : colors.white, borderWidth: 1, borderColor: colors.afternoon }}>
                <MaterialCommunityIcons name="weather-sunset" size={18} color={activeBrush === 'afternoon' ? colors.white : colors.afternoon} />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'afternoon' ? colors.white : colors.afternoon }}>T (16:00-00:00)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveBrush('night')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'night' ? colors.night : colors.white, borderWidth: 1, borderColor: colors.night }}>
                <MaterialCommunityIcons name="weather-night" size={18} color={activeBrush === 'night' ? colors.white : colors.night} />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'night' ? colors.white : colors.night }}>N (00:00-08:00)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveBrush('vacation')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'vacation' ? colors.vacation : colors.white, borderWidth: 1, borderColor: colors.vacation }}>
                <MaterialCommunityIcons name="beach" size={18} color={activeBrush === 'vacation' ? colors.white : colors.vacation} />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'vacation' ? colors.white : colors.vacation }}>Vacaciones</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveBrush('none')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'none' ? colors.textSecondary : colors.white, borderWidth: 1, borderColor: colors.textSecondary }}>
                <MaterialCommunityIcons name="eraser" size={18} color={activeBrush === 'none' ? colors.white : colors.textMuted} />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'none' ? colors.white : colors.textMuted }}>Borrar</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              markingType={'custom'}
              markedDates={markedDatesForCalendar}
              onDayPress={(day) => {
                setModifiedAssignmentDates(prev => {
                  const next = new Set(prev);
                  next.add(day.dateString);
                  return next;
                });
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
              style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingBottom: 10 }}
            />

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShiftModalVisible(false); setSelectedEmp(null); setDailyAssignments({}); setModifiedAssignmentDates(new Set()); }}
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
          <View style={[styles.modal, styles.editEmployeeModal]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.editEmployeeModalContent}
            >
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

              <Text style={styles.modalLabel}>Politica de Fichaje</Text>
              <View style={styles.policyList}>
                {ATTENDANCE_POLICIES.map((policy) => (
                  <TouchableOpacity
                    key={policy.value}
                    style={[
                      styles.policyCard,
                      editAttendancePolicy === policy.value && styles.policyCardSelected,
                    ]}
                    onPress={() => setEditAttendancePolicy(policy.value)}
                  >
                    <Text
                      style={[
                        styles.policyTitle,
                        editAttendancePolicy === policy.value && styles.policyTitleSelected,
                      ]}
                    >
                      {policy.label}
                    </Text>
                    <Text
                      style={[
                        styles.policyDescription,
                        editAttendancePolicy === policy.value && styles.policyDescriptionSelected,
                      ]}
                    >
                      {policy.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editAttendancePolicy === 'assigned_center' && (
                <>
                  <Text style={styles.modalLabel}>Centro Asignado</Text>
                  {workCenters.length === 0 ? (
                    <View style={styles.inlineInfoCard}>
                      <Text style={styles.inlineInfoText}>
                        Antes de asignar esta politica, crea al menos un centro de trabajo con coordenadas y radio.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.policyList}>
                      {workCenters.map((center) => (
                        <TouchableOpacity
                          key={center.id}
                          style={[
                            styles.policyCard,
                            editAssignedCenterId === center.id && styles.policyCardSelected,
                          ]}
                          onPress={() => setEditAssignedCenterId(center.id)}
                        >
                          <Text
                            style={[
                              styles.policyTitle,
                              editAssignedCenterId === center.id && styles.policyTitleSelected,
                            ]}
                          >
                            {center.name}
                          </Text>
                          <Text
                            style={[
                              styles.policyDescription,
                              editAssignedCenterId === center.id && styles.policyDescriptionSelected,
                            ]}
                          >
                            {center.address || 'Sin direccion'} · Radio {Math.round(Number(center.radius_meters || 0))} m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.deleteLink, { marginTop: 16 }]}
                onPress={handleResetPassword}
              >
                <MaterialCommunityIcons name="lock-reset" size={16} color={colors.primary} />
                <Text style={[styles.deleteLinkText, { color: colors.primary }]}>Restablecer contraseña</Text>
              </TouchableOpacity>

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Employee Modal */}
      <Modal visible={addEmpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuevo Empleado</Text>
              <Text style={styles.modalSubtitle}>Crea el perfil del empleado. El acceso se gestiona desde Supabase Auth.</Text>

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

      <Modal visible={workCenterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingWorkCenter ? 'Editar centro de trabajo' : 'Nuevo centro de trabajo'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Configura la ubicacion y el radio permitido para empleados con fichaje restringido.
              </Text>

              <Text style={styles.modalLabel}>Nombre del centro</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej. Oficina Central"
                value={centerName}
                onChangeText={setCenterName}
              />

              <Text style={styles.modalLabel}>Direccion o referencia</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Calle, planta o descripcion"
                value={centerAddress}
                onChangeText={setCenterAddress}
              />

              <Text style={styles.modalLabel}>Latitud</Text>
              <TextInput
                style={styles.formInput}
                placeholder="28.123456"
                value={centerLatitude}
                onChangeText={setCenterLatitude}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.modalLabel}>Longitud</Text>
              <TextInput
                style={styles.formInput}
                placeholder="-15.123456"
                value={centerLongitude}
                onChangeText={setCenterLongitude}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.modalLabel}>Radio permitido (metros)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="150"
                value={centerRadius}
                onChangeText={setCenterRadius}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setWorkCenterModalVisible(false);
                    resetWorkCenterForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveWorkCenter}>
                  <Text style={styles.modalConfirmText}>Guardar</Text>
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

      {/* Edit Shift Time Modal */}
      <Modal visible={editShiftModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar Horas exactas</Text>
            <Text style={styles.modalSubtitle}>{editingShift?.employee_name} ({editingShift && format(parseISO(editingShift.date), 'dd/MM/yyyy')})</Text>

            <Text style={styles.modalLabel}>Hora de Entrada (HH:mm)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="08:00"
              value={editShiftStart}
              onChangeText={setEditShiftStart}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.modalLabel}>Hora de Salida (HH:mm)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="16:00"
              value={editShiftEnd}
              onChangeText={setEditShiftEnd}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditShiftModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveShift}>
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
  secondaryActionBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryActionBtnText: {
    color: colors.primary,
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
  empMeta: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    marginTop: 4,
    fontWeight: typography.weights.semibold,
  },
  attendanceGeoText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  locationLinkBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  locationLinkText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  centerListCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  centerName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  centerMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
    maxHeight: '90%',
  },
  editEmployeeModal: {
    paddingRight: 18,
    paddingLeft: 18,
  },
  editEmployeeModalContent: {
    paddingHorizontal: 6,
    paddingBottom: 8,
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
  policyList: {
    gap: 10,
    marginBottom: 16,
  },
  policyCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    backgroundColor: colors.white,
  },
  policyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  policyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  policyTitleSelected: {
    color: colors.primary,
  },
  policyDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  policyDescriptionSelected: {
    color: colors.primaryDark,
  },
  inlineInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  inlineInfoText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  locationInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  locationInfoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    fontWeight: typography.weights.semibold,
  },
  locationInfoValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    lineHeight: 20,
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
  attendanceContainer: {
    paddingLeft: 20,
    marginTop: 10,
  },
  timelineLine: {
    position: 'absolute',
    left: 42,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  attendanceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendanceAvatarText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  attendanceBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  activePulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    right: -2,
    top: -2,
    borderWidth: 2,
    borderColor: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 8,
    padding: 0,
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


