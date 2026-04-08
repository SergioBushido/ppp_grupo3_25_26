import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getTodayShiftForEmployee, getShiftsByDate } from '../database/shiftService';
import { getUpcomingVacationsForEmployee, getAllPendingVacations } from '../database/vacationService';
import { getAllEmployees } from '../database/employeeService';
import { ShiftBadge } from '../components/ShiftBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>
          {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </Text>
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
                <Text style={styles.daysLabel}>días de vacaciones disponibles</Text>
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
  content: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.7)',
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'capitalize',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(131, 195, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(131, 195, 68, 0.3)',
  },
  adminBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.accentDark,
    fontWeight: typography.weights.bold,
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
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shiftNotes: {
    marginTop: 8,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  daysCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  daysNumber: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.extrabold,
    color: colors.white,
    lineHeight: 34,
  },
  daysLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 100,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  requestBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  upcomingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  adminDashboard: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 44,
    height: 44,
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
    fontSize: 10,
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
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  adminActionBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
});
