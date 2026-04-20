import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function AttendanceActionModal({
  visible,
  onClose,
  attendance,
  reason,
  setReason,
  loading,
  onConfirm,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Anular fichaje</Text>
          <Text style={styles.modalSubtitle}>
            {attendance?.employee_name || 'Empleado'} · {attendance?.type === 'in' ? 'Entrada' : 'Salida'}
          </Text>

          <View style={styles.inlineInfoCard}>
            <Text style={styles.inlineInfoText}>
              Esta accion no borra el registro fisicamente. Lo marca como anulado y deja trazabilidad de administracion.
            </Text>
          </View>

          <Text style={styles.modalLabel}>Motivo</Text>
          <TextInput
            style={[styles.formInput, styles.attendanceReasonInput]}
            value={reason}
            onChangeText={setReason}
            placeholder="Ej. fichaje duplicado, error operativo, correccion solicitada..."
            multiline
            textAlignVertical="top"
            maxLength={180}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                onClose();
              }}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, loading && styles.modalConfirmBtnDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.modalConfirmText}>
                {loading ? 'Anulando...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
