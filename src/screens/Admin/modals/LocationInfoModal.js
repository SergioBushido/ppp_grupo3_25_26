import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function LocationInfoModal({
  visible,
  onClose,
  attendance,
  onOpenInMaps,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Ubicacion del fichaje</Text>
          <Text style={styles.modalSubtitle}>
            {attendance?.employee_name || 'Empleado'} · {attendance?.type === 'in' ? 'Entrada' : 'Salida'}
          </Text>

          <View style={styles.locationInfoCard}>
            <Text style={styles.locationInfoLabel}>Coordenadas</Text>
            <Text style={styles.locationInfoValue}>
              {attendance?.latitude != null && attendance?.longitude != null
                ? `${Number(attendance.latitude).toFixed(6)}, ${Number(attendance.longitude).toFixed(6)}`
                : 'No disponibles'}
            </Text>
          </View>

          <View style={styles.locationInfoCard}>
            <Text style={styles.locationInfoLabel}>Precision GPS</Text>
            <Text style={styles.locationInfoValue}>
              {attendance?.accuracy_meters != null
                ? `${Math.round(Number(attendance.accuracy_meters))} m`
                : 'No disponible'}
            </Text>
          </View>

          <View style={styles.locationInfoCard}>
            <Text style={styles.locationInfoLabel}>Estado</Text>
            <Text style={styles.locationInfoValue}>
              {attendance?.location_status === 'validated_center'
                ? `Centro validado${attendance?.location_note ? ` · ${attendance.location_note}` : ''}`
                : attendance?.location_status === 'optional_captured'
                  ? 'Ubicacion registrada en modo libre'
                  : 'Ubicacion no disponible'}
            </Text>
          </View>

          {attendance?.location_distance_meters != null && (
            <View style={styles.locationInfoCard}>
              <Text style={styles.locationInfoLabel}>Distancia al centro</Text>
              <Text style={styles.locationInfoValue}>
                {Math.round(Number(attendance.location_distance_meters))} m
              </Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={onOpenInMaps}>
              <Text style={styles.modalConfirmText}>Abrir en Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
