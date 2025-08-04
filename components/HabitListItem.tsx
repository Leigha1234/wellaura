import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { ActionSheetIOS, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SleepInputModal } from './SleepInputModal';

export const HabitListItem = ({ habit, onProgressUpdate, onDelete, onEdit, colors, drag, isDragging }) => {
  const { id, name, icon, type, goal, progress } = habit;
  
  const [isSleepModalVisible, setSleepModalVisible] = useState(false);
  const confettiRef = useRef(null);

  const isCompleted = (type === 'boolean' && progress.completedCount >= 1) ||
                      (type === 'counter' && progress.completedCount >= goal) ||
                      (type === 'sleep' && (progress.sleepHours * 60 + progress.sleepMinutes) >= goal * 60);

  const handlePress = () => {
    const wasCompleted = isCompleted;
    let newProgress;

    if (type === 'boolean') {
      newProgress = { completedCount: isCompleted ? 0 : 1 };
    } else if (type === 'counter' && progress.completedCount < goal) {
      newProgress = { completedCount: progress.completedCount + 1 };
    } else if (type === 'sleep') {
      setSleepModalVisible(true);
      return;
    } else {
      return;
    }

    onProgressUpdate(newProgress);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isNowCompleted = (type === 'boolean' && newProgress.completedCount === 1) ||
                           (type === 'counter' && newProgress.completedCount >= goal);

    if (isNowCompleted && !wasCompleted && confettiRef.current) {
      confettiRef.current.start();
    }
  };
  
  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options = ['Edit', 'Delete', 'Cancel'];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    // A simple Alert for Android, as ActionSheet is iOS-only without a library
    if (Platform.OS === 'android') {
      Alert.alert(name, "What would you like to do?", [
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions({
        options, cancelButtonIndex, destructiveButtonIndex,
        title: name,
      }, (buttonIndex) => {
        if (buttonIndex === 0) onEdit();
        else if (buttonIndex === destructiveButtonIndex) onDelete();
      }
    );
  };

  const handleSleepSave = (hours, minutes) => {
    onProgressUpdate({ sleepHours: hours, sleepMinutes: minutes });
    setSleepModalVisible(false);
  };

  const getProgressText = () => {
    if (type === 'counter') return `${progress.completedCount || 0} / ${goal} times`;
    if (type === 'sleep') {
        const hours = progress.sleepHours || 0;
        const minutes = progress.sleepMinutes || 0;
        if (hours > 0 || minutes > 0) return `${hours}h ${minutes}m logged`;
        return `Goal: ${goal} hours`;
    }
    return null;
  };

  return (
    <>
      <ConfettiCannon
        ref={confettiRef}
        count={50}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={3000}
        colors={[colors.primary, colors.accent, '#FFC107']} // Blue, Green, Yellow
      />
      {type === 'sleep' && ( <SleepInputModal visible={isSleepModalVisible} onClose={() => setSleepModalVisible(false)} onSave={handleSleepSave} colors={colors} /> )}

      <TouchableOpacity 
        onLongPress={handleLongPress} 
        onPress={handlePress} 
        onPressIn={drag}
        disabled={isDragging}
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: isDragging ? colors.placeholder : colors.surface, shadowColor: colors.black }]}
      >
        {/* Fill to Complete Button for Boolean */}
        {type === 'boolean' && (
          <View style={[styles.checkCircle, { borderColor: isCompleted ? colors.accent : colors.placeholder }, isCompleted && { backgroundColor: colors.accent }]}>
            <Icon name={icon || 'star-outline'} size={28} color={isCompleted ? colors.white : colors.icon} />
          </View>
        )}
        {/* Icons for other types */}
        {(type === 'counter' || type === 'sleep') && (
            <View style={[styles.checkCircle, { borderColor: colors.placeholder }]}>
                <Icon name={icon || 'star-outline'} size={28} color={colors.icon} />
            </View>
        )}

        <View style={styles.textContainer}>
          <Text style={[styles.habitName, { color: colors.text }]}>{name}</Text>
          {getProgressText() && ( <Text style={[styles.progressText, { color: colors.textSecondary }]}>{getProgressText()}</Text> )}
        </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 16, marginBottom: 12,
        elevation: 2, shadowOpacity: 0.05,
        shadowRadius: 5, shadowOffset: { height: 2, width: 0 }
    },
    checkCircle: {
      width: 54, height: 54, borderRadius: 27, borderWidth: 2,
      justifyContent: 'center', alignItems: 'center', marginRight: 15,
    },
    textContainer: { flex: 1 },
    habitName: { fontSize: 17, fontWeight: '600' },
    progressText: { fontSize: 14, marginTop: 4, },
});