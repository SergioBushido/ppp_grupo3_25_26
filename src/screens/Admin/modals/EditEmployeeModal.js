import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ATTENDANCE_POLICIES } from '../constants';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function EditEmployeeModal({
  visible,
  onClose,
  employee,
  editName,
  setEditName,
  editEmail,
  setEditEmail,
  editDays,
  setEditDays,
  editAttendancePolicy,
  setEditAttendancePolicy,
  editAssignedCenterId,
  setEditAssignedCenterId,
  workCenters,
  onSave,
  onDelete,
  onResetPassword,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, styles.editEmployeeModal]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.editEmployeeModalContent}
          >
            <Text style={styles.modalTitle}>Editar Empleado</Text>
            <Text style={styles.modalSubtitle}>{employee?.name}</Text>

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
              onPress={onResetPassword}
            >
              <MaterialCommunityIcons name="lock-reset" size={16} color={colors.primary} />
              <Text style={[styles.deleteLinkText, { color: colors.primary }]}>Restablecer contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteLink}
              onPress={onDelete}
            >
              <MaterialCommunityIcons name="account-remove" size={16} color={colors.rejected} />
              <Text style={styles.deleteLinkText}>Eliminar empleado</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={onSave}>
                <Text style={styles.modalConfirmText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
