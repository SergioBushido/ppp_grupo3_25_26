import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function CopyWeekModal({
  visible,
  onClose,
  copySummary,
  onConfirm,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Copiar Semana</Text>
          <Text style={styles.modalSubtitle}>Réplica de planificación anterior</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Periodos</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Origen:</Text>
              <Text style={styles.summaryValue}>{copySummary.sourceRange}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Destino:</Text>
              <Text style={styles.summaryValue}>{copySummary.targetRange}</Text>
            </View>
          </View>

          <View style={{ marginVertical: 10 }}>
            <Text style={styles.summaryTitle}>Resultados</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Turnos a copiar:</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{copySummary.shifts.length}</Text>
            </View>
            {copySummary.conflicts.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Conflictos (omitidos):</Text>
                <Text style={[styles.summaryValue, { color: colors.rejected }]}>{copySummary.conflicts.length}</Text>
              </View>
            )}
          </View>

          {copySummary.conflicts.length > 0 && (
            <ScrollView style={{ maxHeight: 100, marginBottom: 10 }}>
              {copySummary.conflicts.map((c, i) => (
                <View key={i} style={styles.conflictRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.rejected} />
                  <Text style={styles.conflictText}>
                    {c.employee_name}: {c.reason} ({format(parseISO(c.targetDate), 'dd/MM')})
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, copySummary.shifts.length === 0 && styles.modalConfirmBtnDisabled]}
              onPress={onConfirm}
              disabled={copySummary.shifts.length === 0}
            >
              <Text style={styles.modalConfirmText}>Confirmar Copia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
