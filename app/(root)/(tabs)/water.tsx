import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
// CHANGE 1: We are now using 'MaterialCommunityIcons' for a better glass shape
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS ---
const todayKey = new Date().toISOString().split('T')[0];
const GLASS_AMOUNT = 8;
const GLASS_ICON_SIZE = 70;

// --- HELPER COMPONENT: WaterGlass ---
const WaterGlass = ({ filled, onPress, isNext }) => {
  useEffect(() => {
    // This adds the smooth fill animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [filled]);

  // This logic determines the color of the glass outline
  // - Blue if it's the next one to drink
  // - Grey for all others (filled or upcoming)
  const outlineColor = isNext && !filled ? "#3b82f6" : "#d1d5db";

  return (
    <TouchableOpacity
      style={styles.glassTouchable}
      onPress={onPress}
      disabled={!isNext}
    >
      <View style={styles.glassIconContainer}>
        {/* The water that fills up (the background icon) */}
        {/* We animate the height of this container to "reveal" the blue icon */}
        <View style={{ height: filled ? '100%' : '0%', overflow: 'hidden' }}>
          {/* CHANGE 2: Using the 'cup' icon for the water fill */}
          <Icon name="cup" size={GLASS_ICON_SIZE} color="#3b82f6" />
        </View>

        {/* The empty glass outline (the foreground icon) */}
        <View style={StyleSheet.absoluteFillObject}>
          {/* CHANGE 3: Using the 'cup-outline' icon for the glass itself */}
          <Icon name="cup-outline" size={GLASS_ICON_SIZE} color={outlineColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};


// --- MAIN COMPONENT: App / WaterLogScreen ---
// No changes are needed in this main component logic
export default function WaterLogScreen() {
  const [log, setLog] = useState({});
  const [target, setTarget] = useState(64);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [targetInput, setTargetInput] = useState("64");
  const [showGoalReached, setShowGoalReached] = useState(false);

  const todaysLog = useMemo(() => log[todayKey] || { total: 0, entries: [] }, [log]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleAddWater = () => {
    const newEntry = { amount: GLASS_AMOUNT, timestamp: Date.now() };
    
    const oldTotal = todaysLog.total;
    const newTotal = oldTotal + GLASS_AMOUNT;
    const goalReached = newTotal >= target && oldTotal < target;

    setLog(prevLog => ({
      ...prevLog,
      [todayKey]: {
        total: newTotal,
        entries: [...todaysLog.entries, newEntry]
      }
    }));

    if (goalReached) {
      setShowGoalReached(true);
      setTimeout(() => setShowGoalReached(false), 4000);
    }
  };

  const handleRemoveLast = () => {
    if (todaysLog.entries.length === 0) return;

    const lastEntry = todaysLog.entries[todaysLog.entries.length - 1];
    const newTotal = todaysLog.total - lastEntry.amount;
    const newEntries = todaysLog.entries.slice(0, -1);

    setLog(prevLog => ({
      ...prevLog,
      [todayKey]: {
        total: newTotal,
        entries: newEntries
      }
    }));
  };

  const handleSetTarget = () => {
    const newTarget = parseInt(targetInput, 10);
    if (!isNaN(newTarget) && newTarget > 0) {
      setTarget(newTarget);
      setModalVisible(false);
    } else {
      Alert.alert("Invalid Input", "Please enter a valid number for your goal.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your log...</Text>
      </View>
    );
  }

  const loggedGlasses = todaysLog.entries.length;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hydration Log</Text>
          <Text style={styles.headerSubtitle}>Tap a glass to drink {GLASS_AMOUNT}oz of water</Text>
        </View>

        <View style={styles.goalContainer}>
          <View style={styles.goalCircle}>
            <Text style={styles.goalTotal}>{todaysLog.total}</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.goalText}>/ {target} oz Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View>
          <Text style={styles.glassesHeader}>Today's Glasses</Text>
          <View style={styles.glassesContainer}>
              {Array.from({ length: loggedGlasses }).map((_, index) => (
                  <WaterGlass key={`filled-${index}`} filled={true} isNext={false} />
              ))}
              <WaterGlass filled={false} onPress={handleAddWater} isNext={true}/>
          </View>
          
          {todaysLog.entries.length > 0 && (
             <View style={styles.undoContainer}>
                <TouchableOpacity 
                  onPress={handleRemoveLast}
                  style={styles.undoButton}
                >
                    <Text style={styles.undoButtonText}>Undo Last Glass</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>
      </View>

      <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Set Daily Goal (oz)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={targetInput}
                  onChangeText={setTargetInput}
                  keyboardType="number-pad"
                  autoFocus={true}
                  placeholder="e.g., 64"
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalButton, styles.cancelButton]}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSetTarget} style={[styles.modalButton, styles.saveButton]}>
                    <Text style={styles.saveButtonText}>Save Goal</Text>
                  </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {showGoalReached && (
        <View style={styles.notification}>
            <Text style={styles.notificationText}>🎉 Goal Reached! Great job! 🎉</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- STYLESHEET (No changes needed here) ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  container: { paddingHorizontal: 24, flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6b7280' },
  header: { alignItems: 'center', marginVertical: 32 },
  headerTitle: { fontSize: 36, fontWeight: 'bold', color: '#1f2937' },
  headerSubtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  goalContainer: { justifyContent: 'center', alignItems: 'center', marginVertical: 40 },
  goalCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#3b82f6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  goalTotal: { fontSize: 60, fontWeight: 'bold', color: '#1f2937' },
  goalText: { fontSize: 18, color: '#3b82f6', fontWeight: '600' },
  glassesHeader: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#374151',
    marginBottom: 16,
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minHeight: 140,
  },
  glassTouchable: {
    padding: 8,
  },
  glassIconContainer: {
    width: GLASS_ICON_SIZE,
    height: GLASS_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  undoContainer: { alignItems: 'center', marginTop: 24 },
  undoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 9999,
  },
  undoButtonText: { color: '#dc2626', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 384,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelButton: { backgroundColor: '#e5e7eb' },
  cancelButtonText: { color: '#374151', fontWeight: '600' },
  saveButton: { backgroundColor: '#3b82f6' },
  saveButtonText: { color: 'white', fontWeight: '600' },
  notification: {
    position: 'absolute',
    bottom: 40,
    left: '10%',
    right: '10%',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
    alignItems: 'center',
  },
  notificationText: { color: 'white', fontWeight: '600' },
});