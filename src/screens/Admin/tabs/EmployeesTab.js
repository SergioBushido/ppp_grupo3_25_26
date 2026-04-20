import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserAvatar from '../../../components/UserAvatar';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function EmployeesTab({
  employees,
  workCenters,
  getWorkCenterName,
  onEditEmployee,
  onAddEmployee,
  onOpenCreateWorkCenter,
  onEditWorkCenter,
  onDeleteWorkCenter,
}) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.empCard}>
            <UserAvatar
              name={item.name}
              avatarUrl={item.avatar_url}
              size={44}
              shape="rounded"
            />
            <View style={styles.empInfo}>
              <Text style={styles.empName}>{item.name}</Text>
              <Text style={styles.empEmail}>{item.email}</Text>
              <Text style={styles.empMeta}>
                {item.attendance_policy === 'assigned_center'
                  ? `Fichaje por centro${getWorkCenterName(item.assigned_work_center_id) ? ` · ${getWorkCenterName(item.assigned_work_center_id)}` : ''}`
                  : item.attendance_policy === 'manual_only'
                    ? 'Fichaje solo manual'
                    : 'Fichaje libre'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.daysChip}
              onPress={() => onEditEmployee(item)}
            >
              <Text style={styles.daysChipNumber}>{item.available_days}</Text>
              <Text style={styles.daysChipLabel}>días</Text>
              <MaterialCommunityIcons name="pencil" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={styles.addShiftBtn}
              onPress={onAddEmployee}
            >
              <MaterialCommunityIcons name="account-plus" size={18} color={colors.white} />
              <Text style={styles.addShiftBtnText}>Añadir nuevo empleado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addShiftBtn, styles.secondaryActionBtn]}
              onPress={onOpenCreateWorkCenter}
            >
              <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryActionBtnText}>Gestionar centros de trabajo</Text>
            </TouchableOpacity>
            {!!workCenters.length && (
              <View style={styles.centerListCard}>
                <Text style={styles.listHeader}>Centros configurados</Text>
                {workCenters.map((center) => (
                  <View key={center.id} style={styles.centerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.centerName}>{center.name}</Text>
                      <Text style={styles.centerMeta}>
                        Radio {Math.round(Number(center.radius_meters || 0))} m
                        {center.address ? ` · ${center.address}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.iconActionBtn} onPress={() => onEditWorkCenter(center)}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconActionBtn} onPress={() => onDeleteWorkCenter(center)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.rejected} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}
