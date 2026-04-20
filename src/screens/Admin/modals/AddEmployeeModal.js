import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { styles } from '../AdminScreen.styles';

export default function AddEmployeeModal({
  visible,
  onClose,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  newInitialDays,
  setNewInitialDays,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Nuevo Empleado</Text>
            <Text style={styles.modalSubtitle}>Crea el perfil del empleado. El acceso se gestiona desde Supabase Auth.</Text>

            <Text style={styles.modalLabel}>Nombre Completo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej. Carlos Martínez"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.modalLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.formInput}
              placeholder="empleado@transferlog.com"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.modalLabel}>Días de Vacaciones (Anual)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="22"
              value={newInitialDays}
              onChangeText={setNewInitialDays}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={onSubmit}>
                <Text style={styles.modalConfirmText}>Crear Perfil</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
