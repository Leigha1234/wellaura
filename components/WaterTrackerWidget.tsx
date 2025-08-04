// components/WaterTrackerWidget.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const todayKey = new Date().toISOString().split('T')[0];
const GLASS_AMOUNT = 8;
const GLASS_ICON_SIZE = 55;

const WaterGlass = ({ filled, onPress, isNext }) => {
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [filled]);
  const outlineColor = isNext && !filled ? '#3b82f6' : '#d1d5db';
  return (
    <TouchableOpacity style={styles.glassTouchable} onPress={onPress} disabled={!isNext}>
      <View style={styles.glassIconContainer}>
        <View style={{ height: filled ? '100%' : '0%', overflow: 'hidden' }}>
          <Icon name="cup" size={GLASS_ICON_SIZE} color="#3b82f6" />
        </View>
        <View style={StyleSheet.absoluteFillObject}>
          <Icon name="cup-outline" size={GLASS_ICON_SIZE} color={outlineColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const WaterTrackerWidget = () => {
  const [log, setLog] = useState({});
  const [target] = useState(64); // Goal is fixed at 64oz for this example

  const todaysLog = useMemo(() => log[todayKey] || { total: 0, entries: [] }, [log]);

  const handleAddWater = () => {
    const newEntry = { amount: GLASS_AMOUNT, timestamp: Date.now() };
    const newTotal = todaysLog.total + GLASS_AMOUNT;
    setLog(prevLog => ({
      ...prevLog,
      [todayKey]: {
        total: newTotal,
        entries: [...todaysLog.entries, newEntry],
      },
    }));
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
        entries: newEntries,
      },
    }));
  };

  const loggedGlasses = todaysLog.entries.length;

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.widgetHeader}>
        <View style={styles.habitInfo}>
          <Icon name="water" size={24} color="#1f2937" />
          <Text style={styles.widgetTitle}>Hydration</Text>
        </View>
        <Text style={styles.progressText}>{todaysLog.total} / {target} oz</Text>
      </View>
      <View style={styles.glassesContainer}>
        {Array.from({ length: loggedGlasses }).map((_, index) => (
          <WaterGlass key={`filled-${index}`} filled={true} isNext={false} />
        ))}
        <WaterGlass filled={false} onPress={handleAddWater} isNext={true} />
      </View>
      {todaysLog.entries.length > 0 && (
        <TouchableOpacity onPress={handleRemoveLast} style={styles.undoButton}>
          <Text style={styles.undoButtonText}>Undo Last</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 10,
  },
  glassTouchable: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  glassIconContainer: {
    width: GLASS_ICON_SIZE,
    height: GLASS_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  undoButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 999,
  },
  undoButtonText: {
    color: '#dc2626',
    fontWeight: '500',
    fontSize: 12,
  },
});