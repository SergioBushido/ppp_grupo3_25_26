import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,

  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getTodayAttendance, registerAttendanceWithLocation } from '../database/attendanceService';
import { getTodayShiftForEmployee } from '../database/shiftService';
import { getShiftConfig } from '../components/ShiftBadge';
import { getCurrentAttendanceLocation } from '../lib/locationService';

const MenuButton = ({ title, icon, gradientColors, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.buttonContainer}>
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={36} color={colors.white} />
      </View>
      <Text style={styles.buttonText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState(null);
  const [todayShift, setTodayShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveLocationForAttendance = useCallback(async () => {
    if (user?.attendance_policy === 'manual_only') {
      throw new Error('Tu fichaje debe registrarse manualmente por administracion.');
    }

    if (user?.attendance_policy === 'assigned_center') {
      return getCurrentAttendanceLocation();
    }

    try {
      return await getCurrentAttendanceLocation();
    } catch (_error) {
      return null;
    }
  }, [user]);

  const loadHomeData = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [records, shift] = await Promise.all([
        getTodayAttendance(user.id),
        getTodayShiftForEmployee(user.id)
      ]);
      setAttendanceRecords(records);
      setTodayShift(shift);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const handleFichaje = async () => {
    if (!attendanceRecords || isLoading) return;

    const hasIn = attendanceRecords.some(r => r.type === 'in');
    const hasOut = attendanceRecords.some(r => r.type === 'out');

    if (hasIn && hasOut) {
      Alert.alert('Jornada Completada', 'Ya has registrado tu entrada y salida por hoy.');
      return;
    }

    const type = !hasIn ? 'in' : 'out';
    const actionName = type === 'in' ? 'Entrada' : 'Salida';

    Alert.alert(
      `Registrar ${actionName}`,
      `¿Confirmas registrar tu ${actionName.toLowerCase()} en este momento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setIsLoading(true);
              const location = await resolveLocationForAttendance();
              await registerAttendanceWithLocation({ employee: user, type, location });
              await loadHomeData();
              Alert.alert('Éxito', `${actionName} registrada correctamente.`);
            } catch (error) {
              if (__DEV__ && error?.message !== 'Tu fichaje debe registrarse manualmente por administracion.') {
                console.error(error);
              }
              Alert.alert('Error', error.message || 'Error al registrar el fichaje.');
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getFichajeState = () => {
    if (isLoading || !attendanceRecords) {
      return { title: 'Cargando...', icon: 'clock-outline', gradient: colors.uiGradients.action };
    }
    if (user?.attendance_policy === 'manual_only') {
      return { title: 'Fichaje Manual', icon: 'clipboard-account-outline', gradient: ['#64748B', '#475569'] };
    }
    const hasIn = attendanceRecords.some(r => r.type === 'in');
    const hasOut = attendanceRecords.some(r => r.type === 'out');

    if (!hasIn) return { title: 'Registrar Entrada', icon: 'login', gradient: colors.uiGradients.action }; // Verde
    if (hasIn && !hasOut) return { title: 'Registrar Salida', icon: 'logout', gradient: ['#F59E0B', '#D97706'] }; // Naranja
    return { title: 'Jornada Completada', icon: 'check-circle-outline', gradient: ['#9CA3AF', '#6B7280'] }; // Gris
  };

  const fichajeState = getFichajeState();

  const renderTodayShift = () => {
    if (isLoading) return <Text style={styles.todayShiftText}>Cargando turno...</Text>;
    if (!todayShift) return <Text style={styles.todayShiftText}>Hoy no tienes turno asignado.</Text>;

    const config = getShiftConfig(todayShift.shift_type);
    const timeText = (todayShift.start_time && todayShift.end_time)
      ? `(${todayShift.start_time.substring(0, 5)} - ${todayShift.end_time.substring(0, 5)})`
      : '';

    return (
      <View style={styles.todayShiftContainer}>
        <MaterialCommunityIcons name={config.icon} size={16} color={colors.white} />
        <Text style={styles.todayShiftText}>Hoy: {config.label} {timeText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.home}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.headerTitle}>Inicio</Text>
          {renderTodayShift()}
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MenuButton
          title="Horario Semanal"
          icon="calendar-week"
          gradientColors={colors.uiGradients.primary}
          onPress={() => navigation.navigate('Calendar')}
        />
        <MenuButton
          title="Solicitudes de Vacaciones"
          icon="beach"
          gradientColors={colors.uiGradients.primary}
          onPress={() => navigation.navigate('Vacations')}
        />
        <MenuButton
          title={fichajeState.title}
          icon={fichajeState.icon}
          gradientColors={fichajeState.gradient}
          onPress={handleFichaje}
        />
        {user?.role === 'admin' && (
          <MenuButton
            title="Panel de Administración"
            icon="cog-outline"
            gradientColors={colors.uiGradients.admin}
            onPress={() => navigation.navigate('Admin')}
          />
        )}
      </ScrollView>

    </View>

  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: 8,
    textAlign: "center"
  },
  todayShiftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayShiftText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  buttonContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  iconContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    flex: 1,
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginLeft: 10,
  },
});
