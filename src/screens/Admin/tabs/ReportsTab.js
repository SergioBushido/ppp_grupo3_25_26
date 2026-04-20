import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function ReportsTab({
  reportMonth,
  setReportMonth,
  reportData,
  exportandoPDF,
  onExportarPDF,
}) {
  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.dateNav}>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={() => setReportMonth(subMonths(reportMonth, 1))}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.dateNavText}>
          {format(reportMonth, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </Text>
        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={() => setReportMonth(addMonths(reportMonth, 1))}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.batchBtn, styles.reportExportBtn, exportandoPDF && styles.modalConfirmBtnDisabled]}
        onPress={onExportarPDF}
        disabled={exportandoPDF}
      >
        <MaterialCommunityIcons
          name={exportandoPDF ? 'loading' : 'file-pdf-box'}
          size={18}
          color={colors.primary}
        />
        <Text style={styles.batchBtnText}>
          {exportandoPDF ? 'Generando PDF...' : 'Exportar PDF'}
        </Text>
      </TouchableOpacity>

      {reportData.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="text-box-search-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Sin datos para este mes</Text>
        </View>
      ) : (
        reportData.map((emp) => (
          <View key={emp.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportEmpName}>{emp.name}</Text>
              <View style={styles.reportTotalBadge}>
                <Text style={styles.reportTotalText}>{emp.totalShifts} Turnos</Text>
              </View>
            </View>

            <View style={styles.reportStatsRow}>
              <View style={styles.reportStat}>
                <MaterialCommunityIcons name="weather-sunny" size={16} color={colors.morning} />
                <Text style={styles.reportStatValue}>{emp.morning}</Text>
              </View>
              <View style={styles.reportStat}>
                <MaterialCommunityIcons name="weather-sunset" size={16} color={colors.afternoon} />
                <Text style={styles.reportStatValue}>{emp.afternoon}</Text>
              </View>
              <View style={styles.reportStat}>
                <MaterialCommunityIcons name="weather-night" size={16} color={colors.night} />
                <Text style={styles.reportStatValue}>{emp.night}</Text>
              </View>
              <View style={[styles.reportStat, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 8 }]}>
                <MaterialCommunityIcons name="beach" size={16} color={colors.vacation} />
                <Text style={[styles.reportStatValue, { color: colors.vacation }]}>{emp.vacations} d</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
