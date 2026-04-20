import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VacationCard } from '../../../components/VacationCard';
import { colors } from '../../../theme/colors';
import { styles } from '../AdminScreen.styles';

export default function RequestsTab({
  pendingVacations,
  allVacations,
  onApprove,
  onReject,
  onCancel,
  onReactive,
  onDelete,
}) {
  const data = [...pendingVacations, ...allVacations.filter((v) => v.status !== 'pending')];

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        pendingVacations.length > 0 ? (
          <Text style={styles.listHeader}>Pendientes ({pendingVacations.length})</Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <MaterialCommunityIcons name="inbox-check" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
        </View>
      }
      renderItem={({ item }) => (
        <VacationCard
          vacation={item}
          isAdmin
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
          onReactive={onReactive}
          onDelete={onDelete}
        />
      )}
    />
  );
}
