import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const ListOptionsModal = ({
  visible, onClose, styles, COLORS, selectedOptionList, t,
  setEditingListId, setListNameInput, setListError, setListModalVisible,
  deleteCustomList, setListOptionsVisible
}) => {
  if (!selectedOptionList) return null;

  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.optionsModalBox} styles={styles}>
      <View style={styles.optionsHeader}>
        <Text style={styles.optionsTitle}>{selectedOptionList.name}</Text>
      </View>

      <View style={styles.optionsList}>
        <TouchableOpacity 
          style={styles.optionItem} 
          onPress={() => {
            setListOptionsVisible(false);
            setEditingListId(selectedOptionList.id);
            setListNameInput(selectedOptionList.name);
            setListError('');
            setListModalVisible(true);
          }}
        >
          <View style={[styles.optionIconBox, { backgroundColor: COLORS.primarySoft }]}>
            <MaterialIcons name="edit" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.optionText}>{t('renameList')}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionItem, { borderBottomWidth: 0 }]} 
          onPress={() => {
            setListOptionsVisible(false);
            deleteCustomList(selectedOptionList.id);
          }}
        >
          <View style={[styles.optionIconBox, { backgroundColor: COLORS.error + '20' }]}>
            <MaterialIcons name="delete-outline" size={22} color={COLORS.error} />
          </View>
          <Text style={[styles.optionText, { color: COLORS.error }]}>{t('deleteList')}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.optionsCancelBtn} onPress={onClose}>
        <Text style={styles.optionsCancelText}>{t('cancel')}</Text>
      </TouchableOpacity>
    </SwipeableModal>
  );
};
