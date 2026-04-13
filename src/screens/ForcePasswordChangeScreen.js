import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../database/employeeService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function ForcePasswordChangeScreen() {
  const { user, refreshUser } = useAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('Error', 'Por favor rellena todos los campos.');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPass.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await changePassword(user.id, currentPass, newPass);
      Alert.alert('✅ Éxito', 'Contraseña actualizada correctamente.');
      await refreshUser(); // This will fetch the user again, requires_password_change should be false
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color={colors.primary} />
        </View>
        <Text style={styles.title}>Cambio de Contraseña Obligatorio</Text>
        <Text style={styles.subtitle}>
          Tu administrador ha restablecido tu contraseña. Por motivos de seguridad, debes establecer una nueva contraseña antes de continuar.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Contraseña Temporal</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPass}
            onChangeText={setCurrentPass}
            placeholder="Introduce la contraseña temporal"
          />

          <Text style={styles.label}>Nueva Contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Mínimo 6 caracteres"
          />

          <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Repite la nueva contraseña"
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Actualizar Contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
