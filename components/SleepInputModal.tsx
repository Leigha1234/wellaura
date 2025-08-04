// /components/SleepInputModal.tsx

import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export const SleepInputModal = ({ visible, onClose, onSave, colors }) => {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const handleSave = () => {
    const totalHours = parseInt(hours) || 0;
    const totalMinutes = parseInt(minutes) || 0;
    onSave(totalHours, totalMinutes);
    setHours('');
    setMinutes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Log Your Sleep</Text>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.placeholder, backgroundColor: colors.background }]}
                        placeholder="Hours"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="number-pad"
                        value={hours}
                        onChangeText={setHours}
                    />
                    <Text style={[styles.separator, { color: colors.text }]}>:</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.placeholder, backgroundColor: colors.background }]}
                        placeholder="Mins"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="number-pad"
                        value={minutes}
                        onChangeText={setMinutes}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSave} style={[styles.button, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.buttonText, { color: colors.white }]}>Save</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContainer: {
        width: '90%',
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        fontSize: 18,
        textAlign: 'center',
        width: '40%',
    },
    separator: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});