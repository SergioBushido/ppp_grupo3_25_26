import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getTodayShiftForEmployee, getShiftsByDate } from '../database/shiftService';
import { getUpcomingVacationsForEmployee, getAllPendingVacations } from '../database/vacationService';
import { getAllEmployees, changePassword } from '../database/employeeService';
import { ShiftBadge } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [todayShift, setTodayShift] = useState(null);
  const [upcomingVacations, setUpcomingVacations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [adminStats, setAdminStats] = useState({
    employeesCount: 0,
    pendingRequests: 0,
    todayShifts: 0,
  });

  // Change Password Modal
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Debes introducir tu contraseña actual');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      await changePassword(user.id, currentPassword, newPassword);
      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada');
      setPassModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
    }
  };

  const today = new Date();
  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const loadData = useCallback(async () => {
    if (!user) return;
    
    if (user.role === 'admin') {
      try {
        const todayStr = format(today, 'yyyy-MM-dd');
        const [emps, pending, shifts] = await Promise.all([
          getAllEmployees(),
          getAllPendingVacations(),
          getShiftsByDate(todayStr),
        ]);
        setAdminStats({
          employeesCount: emps.filter(e => e.role === 'employee').length,
          pendingRequests: pending.length,
          todayShifts: shifts.length,
        });
      } catch (error) {
        console.error("Error loading admin stats:", error);
      }
    } else {
      const [shift, vacations] = await Promise.all([
        getTodayShiftForEmployee(user.id),
        getUpcomingVacationsForEmployee(user.id),
      ]);
      setTodayShift(shift);
      setUpcomingVacations(vacations);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUser()]);
    setRefreshing(false);
  }, [loadData, refreshUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = user?.name?.split(' ')[0] || 'Usuario';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{firstName} 👋</Text>
              <Text style={styles.dateText}>
                {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {user?.role === 'admin' && (
          <View style={styles.adminBadge}>
            <MaterialCommunityIcons name="shield-crown" size={13} color={colors.accent} />
            <Text style={styles.adminBadgeText}>Administrador</Text>
          </View>
        )}
      </View>

      {user?.role === 'admin' ? (
        <View style={styles.adminDashboard}>
          <Text style={styles.sectionTitle}>Estado de la Empresa</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="account-group" size={24} color={colors.white} />
              </View>
              <Text style={styles.statNumber}>{adminStats.employeesCount}</Text>
              <Text style={styles.statLabel}>Empleados</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.vacation }]}>
                <MaterialCommunityIcons name="inbox-arrow-down" size={24} color={colors.white} />
              </View>
              <Text style={styles.statNumber}>{adminStats.pendingRequests}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.white} />
              </View>
              <Text style={styles.statNumber}>{adminStats.todayShifts}</Text>
              <Text style={styles.statLabel}>Turnos Hoy</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.adminActionBtn}
            onPress={() => navigation.navigate('Admin')}
          >
            <MaterialCommunityIcons name="shield-crown" size={20} color={colors.white} />
            <Text style={styles.adminActionBtnText}>Ir al Panel de Control</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Today Shift */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turno de hoy</Text>
            {todayShift ? (
              <View style={styles.shiftCard}>
                <ShiftBadge shiftType={todayShift.shift_type} />
                {todayShift.notes ? (
                  <Text style={styles.shiftNotes}>{todayShift.notes}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="calendar-remove" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>Sin turno asignado hoy</Text>
              </View>
            )}
          </View>

          {/* Available Days */}
          <View style={styles.daysCard}>
            <View style={styles.daysInfo}>
              <MaterialCommunityIcons name="umbrella-beach" size={28} color={colors.vacation} />
              <View>
                <Text style={styles.daysNumber}>{user?.available_days ?? 0}</Text>
                <Text style={styles.daysLabel}>vacaciones disponibles</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.requestBtn}
              onPress={() => navigation.navigate('RequestVacation')}
            >
              <MaterialCommunityIcons name="plus" size={16} color={colors.white} />
              <Text style={styles.requestBtnText}>Solicitar</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming vacations */}
          {upcomingVacations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximas vacaciones</Text>
              {upcomingVacations.map((v) => (
                <View key={v.id} style={styles.upcomingCard}>
                  <MaterialCommunityIcons name="calendar-check" size={18} color={colors.vacation} />
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingDates}>
                      {format(parseISO(v.start_date), "d MMM", { locale: es })} →{' '}
                      {format(parseISO(v.end_date), "d MMM yyyy", { locale: es })}
                    </Text>
                    {v.reason ? <Text style={styles.upcomingReason}>{v.reason}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acceso rápido</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Calendar')}
              >
                <View style={[styles.quickIcon, { backgroundColor: colors.morningLight }]}>
                  <MaterialCommunityIcons name="calendar-month" size={24} color={colors.morning} />
                </View>
                <Text style={styles.quickLabel}>Calendario</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Vacations')}
              >
                <View style={[styles.quickIcon, { backgroundColor: colors.vacationLight }]}>
                  <MaterialCommunityIcons name="beach" size={24} color={colors.vacation} />
                </View>
                <Text style={styles.quickLabel}>Vacaciones</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
            <TouchableOpacity
              style={styles.profileActionRow}
              onPress={() => setPassModalVisible(true)}
            >
              <View style={styles.profileActionIcon}>
                <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
              </View>
              <View style={styles.profileActionInfo}>
                <Text style={styles.profileActionTitle}>Cambiar contraseña</Text>
                <Text style={styles.profileActionSub}>Actualiza tu clave de acceso</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Change Password Modal */}
      <Modal visible={passModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            
            <Text style={styles.modalLabel}>Contraseña Actual</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Tu contraseña actual"
            />
            
            <Text style={styles.modalLabel}>Nueva Contraseña</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mínimo 6 caracteres"
            />
            
            <Text style={styles.modalLabel}>Confirmar Contraseña</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repetir nueva contraseña"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setPassModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handlePasswordChange}>
                <Text style={styles.modalConfirmText}>Guardar</Text>
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
  content: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginVertical: 2,
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shiftNotes: {
    marginTop: 12,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  daysCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  daysNumber: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.extrabold,
    color: colors.white,
    lineHeight: 34,
  },
  daysLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: typography.weights.medium,
    lineHeight: 14,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  requestBtnText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  upcomingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingDates: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  upcomingReason: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  adminDashboard: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  adminActionBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  profileActionRow: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  profileActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileActionInfo: {
    flex: 1,
  },
  profileActionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  profileActionSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
