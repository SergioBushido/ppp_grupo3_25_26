import React from 'react';
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
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inicio</Text>
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
          title="Fichar Entrada/Salida"
          icon="clock-check-outline"
          gradientColors={colors.uiGradients.action}
          onPress={() => Alert.alert('Próximamente', 'Funcionalidad de fichaje en desarrollo')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
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
