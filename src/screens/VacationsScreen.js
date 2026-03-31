import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getVacationsByEmployee, deleteVacation } from '../database/vacationService';
import { VacationCard } from '../components/VacationCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function VacationsScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVacations = useCallback(async () => {
    setLoading(true);
    const data = await getVacationsByEmployee(user.id);
    setVacations(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadVacations);
    return unsubscribe;
  }, [navigation, loadVacations]);

  const handleDelete = (vacationId) => {
    Alert.alert(
      'Cancelar solicitud',
      '¿Deseas cancelar esta solicitud de vacaciones?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancelar solicitud',
          style: 'destructive',
          onPress: async () => {
            await deleteVacation(vacationId);
            await loadVacations();
            await refreshUser();
          },
        },
      ]
    );
  };

  const pendingCount = vacations.filter((v) => v.status === 'pending').length;
  const approvedCount = vacations.filter((v) => v.status === 'approved').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Vacaciones</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.available_days}</Text>
            <Text style={styles.statLabel}>Días disponibles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{approvedCount}</Text>
            <Text style={styles.statLabel}>Aprobadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vacations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="beach" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin solicitudes</Text>
              <Text style={styles.emptyText}>Pulsa el botón para solicitar vacaciones</Text>
            </View>
          }
          renderItem={({ item }) => (
            <VacationCard
              vacation={item}
              isAdmin={false}
              onReject={item.status === 'pending' ? () => handleDelete(item.id) : undefined}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RequestVacation')}
      >
        <MaterialCommunityIcons name="plus" size={26} color={colors.white} />
      </TouchableOpacity>
    </View>
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.white,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
