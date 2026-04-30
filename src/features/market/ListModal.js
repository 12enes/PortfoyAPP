import React from 'react';
import { Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const ListModal = ({
  visible, onClose, styles, COLORS, editingListId, t,
  shakeAnim, listError, listNameInput, setListNameInput,
  setListError, createOrUpdateList
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.modalBox} styles={styles}>
      <Text style={[styles.modalTitle, {textAlign: 'center'}]}>{editingListId ? t('renameList') : t('createList')}</Text>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput 
           style={[styles.input, listError ? {borderColor: COLORS.error} : {}]} 
           placeholder={t('listName')} 
           placeholderTextColor={COLORS.textSub} 
           value={listNameInput} 
           onChangeText={(val) => {setListNameInput(val); setListError('');}} 
           autoFocus={true} 
        />
      </Animated.View>
      {listError ? <Text style={{color: COLORS.error, fontSize: 12, marginBottom: 15, marginTop: -10, marginLeft: 5}}>{listError}</Text> : null}
      <TouchableOpacity style={[styles.megaSaveBtn, {marginTop: 10}]} onPress={createOrUpdateList}>
         <Text style={styles.megaSaveBtnText}>{editingListId ? t('save') : t('createBtn')}</Text>
      </TouchableOpacity>
    </SwipeableModal>
  );
};
