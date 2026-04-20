import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function ShiftAssignmentModal({
  visible,
  onClose,
  employees,
  selectedEmp,
  onSelectEmployee,
  activeBrush,
  setActiveBrush,
  markedDatesForCalendar,
  onDayPress,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Asignación Múltiple</Text>
          <Text style={styles.modalSubtitle}>Selecciona el empleado y 'pinta' los turnos directamente en el calendario.</Text>

          <Text style={styles.modalLabel}>Empleado Seleccionado</Text>
          <ScrollView style={{ maxHeight: 120, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
            {employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.empOption, selectedEmp?.id === emp.id && styles.empOptionSelected]}
                onPress={() => onSelectEmployee(emp)}
              >
                <Text style={[styles.empOptionText, selectedEmp?.id === emp.id && styles.empOptionTextSelected]}>
                  {emp.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Pincel (Turno a asignar)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setActiveBrush('morning')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'morning' ? colors.morning : colors.white, borderWidth: 1, borderColor: colors.morning }}>
              <MaterialCommunityIcons name="weather-sunny" size={18} color={activeBrush === 'morning' ? colors.white : colors.morning} />
              <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'morning' ? colors.white : colors.morning }}>M (08:00-16:00)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveBrush('afternoon')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'afternoon' ? colors.afternoon : colors.white, borderWidth: 1, borderColor: colors.afternoon }}>
              <MaterialCommunityIcons name="weather-sunset" size={18} color={activeBrush === 'afternoon' ? colors.white : colors.afternoon} />
              <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'afternoon' ? colors.white : colors.afternoon }}>T (16:00-00:00)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveBrush('night')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'night' ? colors.night : colors.white, borderWidth: 1, borderColor: colors.night }}>
              <MaterialCommunityIcons name="weather-night" size={18} color={activeBrush === 'night' ? colors.white : colors.night} />
              <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'night' ? colors.white : colors.night }}>N (00:00-08:00)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveBrush('vacation')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'vacation' ? colors.vacation : colors.white, borderWidth: 1, borderColor: colors.vacation }}>
              <MaterialCommunityIcons name="beach" size={18} color={activeBrush === 'vacation' ? colors.white : colors.vacation} />
              <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'vacation' ? colors.white : colors.vacation }}>Vacaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveBrush('none')} style={{ flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, backgroundColor: activeBrush === 'none' ? colors.textSecondary : colors.white, borderWidth: 1, borderColor: colors.textSecondary }}>
              <MaterialCommunityIcons name="eraser" size={18} color={activeBrush === 'none' ? colors.white : colors.textMuted} />
              <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: 'bold', color: activeBrush === 'none' ? colors.white : colors.textMuted }}>Borrar</Text>
            </TouchableOpacity>
          </View>

          <Calendar
            markingType={'custom'}
            markedDates={markedDatesForCalendar}
            onDayPress={onDayPress}
            firstDay={1}
            theme={{
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontWeight: 'bold',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
            }}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingBottom: 10 }}
          />

          <View style={[styles.modalActions, { marginTop: 16 }]}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, !selectedEmp && styles.modalConfirmBtnDisabled]}
              onPress={onSubmit}
              disabled={!selectedEmp}
            >
              <Text style={styles.modalConfirmText}>Asignar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
