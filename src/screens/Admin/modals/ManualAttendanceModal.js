import React, { useMemo } from 'react';
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
import { typography } from '../../../theme/typography';

const TIME_REGEX = /^\d{2}:\d{2}$/;

function isValidTime(timeStr) {
  if (!TIME_REGEX.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

const QUICK_TIMES = ['08:00', '09:00', '14:00', '17:00', '18:00', '22:00'];

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
  const timeIsValid = useMemo(() => isValidTime(time), [time]);
  const timeInputError = time.length === 5 && !timeIsValid;

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, styles.editEmployeeModal]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.editEmployeeModalContent}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: colors.primaryLight,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Fichaje manual</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {format(attendanceDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </Text>

            {/* Info card */}
            <View style={styles.inlineInfoCard}>
              <Text style={styles.inlineInfoText}>
                Usa esta acción cuando el empleado no pueda fichar desde la app. La secuencia diaria se valida antes de guardar.
              </Text>
            </View>

            {/* Employee selector */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                      style={[
                        styles.empOptionText,
                        selectedEmployeeId === employee.id && styles.empOptionTextSelected,
                      ]}
                    >
                      {employee.name}
                    </Text>
                    {selectedEmployeeId === employee.id && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                    )}
                  </View>
                  {employee.attendance_policy === 'manual_only' && (
                    <Text style={styles.manualOnlyHint}>Solo manual</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Attendance type */}
            <Text style={styles.modalLabel}>Tipo de fichaje</Text>
            <View style={styles.shiftOptions}>
              <TouchableOpacity
                style={[styles.shiftOption, attendanceType === 'in' && styles.shiftOptionSelected]}
                onPress={() => setAttendanceType('in')}
              >
                <MaterialCommunityIcons
                  name="login"
                  size={20}
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
                  size={20}
                  color={attendanceType === 'out' ? colors.white : colors.night}
                />
                <Text style={[styles.shiftOptionText, attendanceType === 'out' && styles.shiftOptionTextSelected]}>
                  Salida
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time input */}
            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Hora (HH:mm)</Text>
            <TextInput
              style={[
                styles.formInput,
                timeInputError && { borderColor: colors.rejected, borderWidth: 2 },
              ]}
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            {timeInputError && (
              <Text style={{ color: colors.rejected, fontSize: typography.sizes.xs, marginTop: -12, marginBottom: 12 }}>
                Formato inválido. Introduce la hora como HH:mm (ej. 09:00)
              </Text>
            )}

            {/* Quick time selector */}
            <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Accesos rápidos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {QUICK_TIMES.map((qt) => (
                <TouchableOpacity
                  key={qt}
                  onPress={() => setTime(qt)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: time === qt ? colors.primary : colors.border,
                    backgroundColor: time === qt ? colors.primaryLight : colors.white,
                  }}
                >
                  <Text style={{
                    fontSize: typography.sizes.sm,
                    fontWeight: typography.weights.bold,
                    color: time === qt ? colors.primary : colors.textSecondary,
                  }}>
                    {qt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Admin note */}
            <Text style={styles.modalLabel}>Nota administrativa (opcional)</Text>
            <TextInput
              style={[styles.formInput, styles.attendanceReasonInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Ej. olvido de fichaje, incidencia operativa, ajuste validado..."
              multiline
              textAlignVertical="top"
              maxLength={180}
            />
            <Text style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -12, marginBottom: 16 }}>
              {note.length}/180 caracteres
            </Text>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (loading || !selectedEmployeeId || !timeIsValid) && styles.modalConfirmBtnDisabled,
                ]}
                onPress={onSubmit}
                disabled={loading || !selectedEmployeeId || !timeIsValid}
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
