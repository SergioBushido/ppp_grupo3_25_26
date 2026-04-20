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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function ManualAttendanceModal({
  visible,
  onClose,
  attendanceDate,
  employees,
  selectedEmployeeId,
  setSelectedEmployeeId,
  attendanceType,
  setAttendanceType,
  time,
  setTime,
  note,
  setNote,
  loading,
  onSubmit,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, styles.editEmployeeModal]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.editEmployeeModalContent}
          >
            <Text style={styles.modalTitle}>Registrar fichaje manual</Text>
            <Text style={styles.modalSubtitle}>
              {format(attendanceDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </Text>

            <View style={styles.inlineInfoCard}>
              <Text style={styles.inlineInfoText}>
                Usa esta accion cuando el empleado no pueda fichar desde la app. La secuencia diaria se valida antes de guardar.
              </Text>
            </View>

            <Text style={styles.modalLabel}>Empleado</Text>
            <ScrollView style={styles.manualAttendanceEmployeeList} showsVerticalScrollIndicator={false}>
              {employees.map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={[
                    styles.empOption,
                    selectedEmployeeId === employee.id && styles.empOptionSelected,
                  ]}
                  onPress={() => setSelectedEmployeeId(employee.id)}
                >
                  <Text
                    style={[
                      styles.empOptionText,
                      selectedEmployeeId === employee.id && styles.empOptionTextSelected,
                    ]}
                  >
                    {employee.name}
                  </Text>
                  {employee.attendance_policy === 'manual_only' && (
                    <Text style={styles.manualOnlyHint}>Solo manual</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.shiftOptions}>
              <TouchableOpacity
                style={[styles.shiftOption, attendanceType === 'in' && styles.shiftOptionSelected]}
                onPress={() => setAttendanceType('in')}
              >
                <MaterialCommunityIcons
                  name="login"
                  size={18}
                  color={attendanceType === 'in' ? colors.white : colors.morning}
                />
                <Text style={[styles.shiftOptionText, attendanceType === 'in' && styles.shiftOptionTextSelected]}>
                  Entrada
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shiftOption, attendanceType === 'out' && styles.shiftOptionSelected]}
                onPress={() => setAttendanceType('out')}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={18}
                  color={attendanceType === 'out' ? colors.white : colors.night}
                />
                <Text style={[styles.shiftOptionText, attendanceType === 'out' && styles.shiftOptionTextSelected]}>
                  Salida
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Hora (HH:mm)</Text>
            <TextInput
              style={styles.formInput}
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.modalLabel}>Nota administrativa opcional</Text>
            <TextInput
              style={[styles.formInput, styles.attendanceReasonInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Ej. olvido de fichaje, incidencia operativa, ajuste validado..."
              multiline
              textAlignVertical="top"
              maxLength={180}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, loading && styles.modalConfirmBtnDisabled]}
                onPress={onSubmit}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
