import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { changePassword, MAX_AVATAR_BYTES, removeMyAvatar, uploadMyAvatar } from '../database/employeeService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserAvatar from '../components/UserAvatar';

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  
  // Settings modal
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  const maxAvatarSizeMb = Math.round(MAX_AVATAR_BYTES / (1024 * 1024));

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      await changePassword(user.id, newPassword);
      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada');
      setPassModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria para seleccionar una foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        mediaTypes: ['images'],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
        Alert.alert('Imagen demasiado grande', `Selecciona una imagen de hasta ${maxAvatarSizeMb} MB.`);
        return;
      }

      setIsAvatarLoading(true);
      await uploadMyAvatar({
        authUserId: user?.auth_user_id,
        asset,
        currentAvatarPath: user?.avatar_storage_path,
      });
      await refreshUser();
      Alert.alert('Foto actualizada', 'Tu foto de perfil se ha actualizado correctamente.');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la foto de perfil.');
    } finally {
      setIsAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Eliminar foto',
      'Tu perfil volvera a mostrar las iniciales como avatar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsAvatarLoading(true);
              await removeMyAvatar(user?.avatar_storage_path);
              await refreshUser();
              Alert.alert('Foto eliminada', 'Tu perfil vuelve a mostrar el avatar por defecto.');
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la foto de perfil.');
            } finally {
              setIsAvatarLoading(false);
            }
          },
        },
      ]
    );
  };

  const isAdmin = user?.role === 'admin';
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes de Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <UserAvatar
              name={user?.name}
              avatarUrl={user?.avatar_url}
              size={96}
              iconName={isAdmin ? 'shield-account' : 'account'}
            />
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={handlePickAvatar}
              disabled={isAvatarLoading}
            >
              {isAvatarLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons name="camera-outline" size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Sin correo'}</Text>
          <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.employeeBadge]}>
            <Text style={styles.roleText}>{isAdmin ? 'Administrador' : 'Empleado'}</Text>
          </View>
          <Text style={styles.avatarHint}>JPG, PNG o WEBP. Tamano maximo: {maxAvatarSizeMb} MB.</Text>
          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, isAvatarLoading && styles.secondaryBtnDisabled]}
              onPress={handlePickAvatar}
              disabled={isAvatarLoading}
            >
              <MaterialCommunityIcons name="image-edit-outline" size={18} color={colors.white} />
              <Text style={styles.secondaryBtnText}>{user?.avatar_url ? 'Cambiar foto' : 'Subir foto'}</Text>
            </TouchableOpacity>
            {!!user?.avatar_storage_path && (
              <TouchableOpacity
                style={[styles.removeAvatarBtn, isAvatarLoading && styles.secondaryBtnDisabled]}
                onPress={handleRemoveAvatar}
                disabled={isAvatarLoading}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.rejected} />
                <Text style={styles.removeAvatarText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Metrics for Employees */}
        {!isAdmin && (
          <View style={styles.daysCard}>
            <View style={styles.daysInfo}>
              <MaterialCommunityIcons name="umbrella-beach" size={28} color={colors.vacation} />
              <View>
                <Text style={styles.daysNumber}>{user?.available_days ?? 0}</Text>
                <Text style={styles.daysLabel}>vacaciones disponibles</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta y Seguridad</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setPassModalVisible(true)}
          >
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="lock-reset" size={20} color={colors.white} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Cambiar contraseña</Text>
              <Text style={styles.actionSub}>Actualiza tu clave de acceso</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.border} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.white} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={passModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEditButton: {
    position: 'absolute',
    right: -6,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: colors.accentLight,
  },
  employeeBadge: {
    backgroundColor: colors.primaryLight,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  avatarHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 14,
    textAlign: 'center',
  },
  avatarActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  secondaryBtnDisabled: {
    opacity: 0.6,
  },
  secondaryBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  removeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FDECEC',
    borderRadius: 14,
  },
  removeAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.rejected,
  },
  daysCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'flex-start',
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: typography.weights.medium,
    lineHeight: 14,
  },
  section: {
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  actionRow: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  actionSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: colors.rejected,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
    shadowColor: colors.rejected,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  // Modal styles (reutilizados)
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
