import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { styles } from '../AdminScreen.styles';

export default function AttendancesTab({
  attendanceDate,
  setAttendanceDate,
  attendanceFilter,
  setAttendanceFilter,
  attendanceUsesRecentFallback,
  filteredAttendances,
  pulseAnim,
  hasAttendanceCoordinates,
  onShowAttendanceLocation,
  onOpenAttendanceAction,
  onOpenManualAttendanceModal,
}) {
  return (
    <View style={styles.listContent}>
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => setAttendanceDate(addDays(attendanceDate, -1))}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateNavText}>{format(attendanceDate, "EEEE, d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</Text>
        <TouchableOpacity style={styles.dateNavBtn} onPress={() => setAttendanceDate(addDays(attendanceDate, 1))}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 12 }}>
        <TextInput
          placeholder="Buscar empleado..."
          value={attendanceFilter}
          onChangeText={setAttendanceFilter}
          style={[styles.formInput, { marginBottom: 8 }]}
        />
        <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {attendanceUsesRecentFallback ? 'Mostrando ultimos fichajes registrados' : 'Fichajes del día'}
          </Text>
        </Animated.View>
      </View>

      <TouchableOpacity
        style={[styles.batchBtn, styles.manualAttendanceBtn]}
        onPress={onOpenManualAttendanceModal}
      >
        <MaterialCommunityIcons name="clipboard-plus-outline" size={16} color={colors.primary} />
        <Text style={styles.batchBtnText}>Registrar fichaje manual</Text>
      </TouchableOpacity>

      {filteredAttendances.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-list" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>No hay fichajes para esta fecha</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAttendances}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={[styles.shiftRow, item.record_status === 'voided' && styles.voidedAttendanceRow]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: typography.weights.bold }}>{item.employee_name}</Text>
                <Text style={{ color: colors.textMuted }}>{format(parseISO(item.timestamp), "HH:mm:ss")}</Text>
                {item.entry_mode === 'admin_manual' && (
                  <View style={styles.manualAttendanceBadge}>
                    <MaterialCommunityIcons name="account-hard-hat-outline" size={14} color={colors.primary} />
                    <Text style={styles.manualAttendanceBadgeText}>Creado por administracion</Text>
                  </View>
                )}
                {item.record_status === 'voided' && (
                  <View style={styles.voidedBadge}>
                    <MaterialCommunityIcons name="shield-remove-outline" size={14} color={colors.rejected} />
                    <Text style={styles.voidedBadgeText}>Anulado por administracion</Text>
                  </View>
                )}
                {item.location_status && item.location_status !== 'not_required' && (
                  <Text style={styles.attendanceGeoText}>
                    {item.location_status === 'validated_center'
                      ? `Centro validado${item.location_note ? ` · ${item.location_note}` : ''}${item.location_distance_meters ? ` · ${Math.round(Number(item.location_distance_meters))} m` : ''}`
                      : item.location_status === 'optional_captured'
                        ? 'Ubicacion capturada'
                        : 'Ubicacion no disponible'}
                  </Text>
                )}
                {item.record_status === 'voided' && item.void_reason && (
                  <Text style={styles.voidedReasonText}>Motivo: {item.void_reason}</Text>
                )}
                {item.entry_mode === 'admin_manual' && item.admin_note && (
                  <Text style={styles.manualAttendanceNoteText}>Nota admin: {item.admin_note}</Text>
                )}
                {hasAttendanceCoordinates(item) && (
                  <TouchableOpacity
                    style={styles.locationLinkBtn}
                    onPress={() => onShowAttendanceLocation(item)}
                  >
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={colors.primary} />
                    <Text style={styles.locationLinkText}>Mostrar ubicacion</Text>
                  </TouchableOpacity>
                )}
                {item.canInvalidate && (
                  <TouchableOpacity
                    style={styles.invalidateAttendanceBtn}
                    onPress={() => onOpenAttendanceAction(item)}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.rejected} />
                    <Text style={styles.invalidateAttendanceBtnText}>Anular fichaje</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: item.type === 'in' ? colors.morning : colors.night, fontWeight: 'bold' }}>{item.type === 'in' ? 'Entrada' : 'Salida'}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
