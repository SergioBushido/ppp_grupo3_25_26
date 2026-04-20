import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShiftBadge } from '../../../components/ShiftBadge';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function ShiftsTab({
  selectedDate,
  setSelectedDate,
  dayShifts,
  onPrepareCopy,
  onOpenEditShift,
  onDeleteShift,
  onOpenAssignModal,
}) {
  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateNavText}>
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </Text>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Batch Actions */}
      <View style={styles.batchActions}>
        <TouchableOpacity
          style={styles.batchBtn}
          onPress={onPrepareCopy}
        >
          <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
          <Text style={styles.batchBtnText}>Copiar semana anterior</Text>
        </TouchableOpacity>
      </View>

      {dayShifts.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="calendar-blank" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Sin turnos este día</Text>
        </View>
      ) : (
        dayShifts.map((s) => (
          <View key={s.id} style={styles.shiftRow}>
            <ShiftBadge shiftType={s.shift_type} startTime={s.start_time} endTime={s.end_time} />
            <Text style={styles.shiftEmpName}>{s.employee_name}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => onOpenEditShift(s)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteShift(s)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="delete-outline" size={18} color={colors.rejected} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        style={styles.addShiftBtn}
        onPress={onOpenAssignModal}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.white} />
        <Text style={styles.addShiftBtnText}>Asignar turno</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
