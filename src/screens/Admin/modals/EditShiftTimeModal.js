import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { format, parseISO } from 'date-fns';
import { styles } from '../AdminScreen.styles';

export default function EditShiftTimeModal({
  visible,
  onClose,
  editingShift,
  editShiftStart,
  setEditShiftStart,
  editShiftEnd,
  setEditShiftEnd,
  onSave,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Editar Horas exactas</Text>
          <Text style={styles.modalSubtitle}>
            {editingShift?.employee_name} ({editingShift && format(parseISO(editingShift.date), 'dd/MM/yyyy')})
          </Text>

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
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={onSave}>
              <Text style={styles.modalConfirmText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
