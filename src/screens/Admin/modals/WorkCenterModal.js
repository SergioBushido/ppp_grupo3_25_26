import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { styles } from '../AdminScreen.styles';

export default function WorkCenterModal({
  visible,
  onClose,
  isEditing,
  centerName,
  setCenterName,
  centerAddress,
  setCenterAddress,
  centerLatitude,
  setCenterLatitude,
  centerLongitude,
  setCenterLongitude,
  centerRadius,
  setCenterRadius,
  onSave,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Editar centro de trabajo' : 'Nuevo centro de trabajo'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Configura la ubicacion y el radio permitido para empleados con fichaje restringido.
            </Text>

            <Text style={styles.modalLabel}>Nombre del centro</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej. Oficina Central"
              value={centerName}
              onChangeText={setCenterName}
            />

            <Text style={styles.modalLabel}>Direccion o referencia</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Calle, planta o descripcion"
              value={centerAddress}
              onChangeText={setCenterAddress}
            />

            <Text style={styles.modalLabel}>Latitud</Text>
            <TextInput
              style={styles.formInput}
              placeholder="28.123456"
              value={centerLatitude}
              onChangeText={setCenterLatitude}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.modalLabel}>Longitud</Text>
            <TextInput
              style={styles.formInput}
              placeholder="-15.123456"
              value={centerLongitude}
              onChangeText={setCenterLongitude}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.modalLabel}>Radio permitido (metros)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="150"
              value={centerRadius}
              onChangeText={setCenterRadius}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={onSave}>
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
