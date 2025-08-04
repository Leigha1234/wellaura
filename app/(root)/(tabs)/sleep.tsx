import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

// NOTE: This version has NO AsyncStorage. Data will not persist.
// It will not cause the 'AsyncStorage doesn't exist' error.

// Define a more robust interface
interface SleepEntry {
  id: string; // Using date as a unique ID: 'YYYY-MM-DD'
  date: string; // For display: 'M/D/YYYY'
  hours: number;
  quality: "Excellent" | "Good" | "Okay" | "Poor";
}

// Define quality options for consistent data and UI
const QUALITY_OPTIONS: {
  label: "Excellent" | "Good" | "Okay" | "Poor";
  emoji: string;
}[] = [
  { label: "Excellent", emoji: "🥰" },
  { label: "Good", emoji: "😊" },
  { label: "Okay", emoji: "😐" },
  { label: "Poor", emoji: "😴" },
];

// Define a color palette for easy theme changes
const COLORS = {
  background: "#F0F4F8",
  card: "#FFFFFF",
  text: "#102A43",
  textSecondary: "#627D98",
  primary: "#4C66E0",
  primaryLight: "#A3B3F3",
  accent: "#36D399",
  danger: "#F87272",
  chartLine: "rgba(76, 102, 224, 1)",
  chartLabel: "rgba(16, 42, 67, 0.7)",
};

export default function SleepTracker() {
  // State is now ephemeral and will reset when the app closes.
  const [sleepData, setSleepData] = useState<SleepEntry[]>([]);
  const [hours, setHours] = useState<string>("");
  const [selectedQuality, setSelectedQuality] =
    useState<SleepEntry["quality"]>("Good");
  const [sleepGoal, setSleepGoal] = useState<number>(8);
  const [sleepGoalInput, setSleepGoalInput] = useState<string>("8");

  const handleSaveData = () => {
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      Alert.alert("Invalid Input", "Please enter a valid number of hours.");
      return;
    }

    const entryId = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

    if (sleepData.some((entry) => entry.id === entryId)) {
      Alert.alert(
        "Entry Exists",
        "You've already logged your sleep for today."
      );
      return;
    }

    const newEntry: SleepEntry = {
      id: entryId,
      date: new Date().toLocaleDateString(),
      hours: hoursNum,
      quality: selectedQuality,
    };

    const updatedData = [...sleepData, newEntry].sort(
      (a, b) => new Date(a.id).getTime() - new Date(b.id).getTime()
    );

    setSleepData(updatedData);

    setHours("");
    setSelectedQuality("Good");
  };

  const handleSetGoal = () => {
    const val = parseFloat(sleepGoalInput);
    if (!isNaN(val) && val > 0 && val <= 24) {
      setSleepGoal(val);
      Alert.alert("Success", `Sleep goal updated to ${val} hours.`);
    } else {
      Alert.alert("Invalid Goal", "Please enter a number between 1 and 24.");
      setSleepGoalInput(String(sleepGoal));
    }
  };

  const averageSleep = useMemo(() => {
    if (sleepData.length === 0) return "0.0";
    const totalHours = sleepData.reduce((sum, entry) => sum + entry.hours, 0);
    return (totalHours / sleepData.length).toFixed(1);
  }, [sleepData]);

  const recentEntries = useMemo(
    () => [...sleepData].reverse().slice(0, 7),
    [sleepData]
  );

  const chartData = useMemo(() => {
    const last7Entries = sleepData.slice(-7);
    return {
      labels: last7Entries.map((e) => e.date.substring(0, e.date.lastIndexOf('/'))),
      datasets: [
        {
          data: last7Entries.map((e) => e.hours),
          color: (opacity = 1) => COLORS.chartLine,
          strokeWidth: 3,
        },
      ],
      legend: ["Hours Slept"],
    };
  }, [sleepData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Sleep Tracker</Text>

      {/* --- STATS & GOAL --- */}
      <View style={styles.statsGrid}>
        <View style={[styles.card, styles.statCard]}>
          <Text style={styles.statLabel}>Avg Sleep</Text>
          <Text style={styles.statValue}>{averageSleep}h</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <Text style={styles.statLabel}>Sleep Goal</Text>
          <View style={styles.goalInputContainer}>
            <TextInput
              keyboardType="numeric"
              value={sleepGoalInput}
              onChangeText={setSleepGoalInput}
              onEndEditing={handleSetGoal}
              style={styles.goalInput}
            />
            <Text style={styles.statValue}>h</Text>
          </View>
        </View>
      </View>

      {/* --- LOG SLEEP --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log Tonight's Sleep</Text>
        <TextInput
          style={styles.input}
          placeholder="How many hours did you sleep?"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numeric"
          value={hours}
          onChangeText={setHours}
        />
        <Text style={styles.inputLabel}>Sleep Quality</Text>
        <View style={styles.qualitySelector}>
          {QUALITY_OPTIONS.map(({ label, emoji }) => (
            <Pressable
              key={label}
              style={[
                styles.qualityOption,
                selectedQuality === label && styles.qualityOptionSelected,
              ]}
              onPress={() => setSelectedQuality(label)}
            >
              <Text style={styles.qualityEmoji}>{emoji}</Text>
              <Text style={styles.qualityLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSaveData}>
          <Text style={styles.buttonText}>Log Sleep</Text>
        </TouchableOpacity>
      </View>

      {/* --- CHART --- */}
      {sleepData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 60}
            height={220}
            yAxisSuffix="h"
            withHorizontalLines={true}
            withVerticalLines={false}
            chartConfig={{
              backgroundColor: COLORS.card,
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(76, 102, 224, ${opacity})`,
              labelColor: (opacity = 1) => COLORS.chartLabel,
              propsForDots: { r: "5", strokeWidth: "2", stroke: COLORS.primaryLight },
              propsForBackgroundLines: { stroke: "#E2E8F0" },
            }}
            style={styles.chart}
            bezier
          />
        </View>
      )}

      {/* --- HISTORY --- */}
      <View style={styles.historySection}>
        <Text style={styles.cardTitle}>Recent History</Text>
        {recentEntries.length > 0 ? (
          recentEntries.map((entry) => (
            <View key={entry.id} style={styles.historyEntry}>
              <View>
                <Text style={styles.historyDate}>{entry.date}</Text>
                <Text style={styles.historyQuality}>Quality: {entry.quality}</Text>
              </View>
              <View style={styles.historyHoursContainer}>
                <Text style={styles.historyHours}>{entry.hours.toFixed(1)}h</Text>
                <Text
                  style={[
                    styles.goalStatus,
                    entry.hours >= sleepGoal ? styles.goalMet : styles.goalMissed,
                  ]}
                >
                  {entry.hours >= sleepGoal ? "✓ Goal Met" : "✗ Goal Missed"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyStateText}>
              No sleep data yet. Log your first night to get started! 🌙
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#95A1B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  goalInputContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  goalInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    padding: 0,
    margin: 0,
  },
  input: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 10,
  },
  qualitySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  qualityOption: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  qualityOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(76, 102, 224, 0.1)",
  },
  qualityEmoji: {
    fontSize: 24,
  },
  qualityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  chart: {
    borderRadius: 16,
    alignSelf: 'center',
  },
  historySection: {
    marginTop: 0,
  },
  historyEntry: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyQuality: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyHoursContainer: {
    alignItems: "flex-end",
  },
  historyHours: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  goalStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  goalMet: {
    color: COLORS.accent,
  },
  goalMissed: {
    color: COLORS.danger,
  },
  emptyStateText: {
    textAlign: "center",
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
});