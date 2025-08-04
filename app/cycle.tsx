import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const getCyclePhase = (startDate, dateStr) => {
  if (!startDate) return "Not Tracked";
  const msInDay = 86400000;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const daysSinceStart = Math.floor(
    (targetDate.getTime() - new Date(startDate).getTime()) / msInDay
  );
  if (daysSinceStart < 0) return "Future Date";
  if (daysSinceStart < 5) return "Menstruation";
  if (daysSinceStart < 14) return "Follicular Phase";
  if (daysSinceStart < 18) return "Ovulation (Fertile Window)";
  if (daysSinceStart < 28) return "Luteal Phase";
  return "Awaiting New Cycle";
};

const getPhaseColor = (phase, colors) => {
  switch (phase) {
    case "Menstruation":
      return colors.menstruation;
    case "Follicular Phase":
      return colors.follicular;
    case "Ovulation (Fertile Window)":
      return colors.ovulation;
    case "Luteal Phase":
      return colors.luteal;
    default:
      return "#e0e0e0";
  }
};

const getDotColor = (type, colors) => {
  return type === "symptoms" ? colors.symptomDot : colors.activityDot;
};

export default function CycleTracker() {
  const today = new Date().toISOString().split("T")[0];
  const [cycleStart, setCycleStart] = useState(null);
  const [cycleEnd, setCycleEnd] = useState(null);
  const [phase, setPhase] = useState("Not Tracked");
  const [symptoms, setSymptoms] = useState([]);
  const [activity, setActivity] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [logHistory, setLogHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [filterType, setFilterType] = useState("symptoms");

  const [colors, setColors] = useState({
    menstruation: "#ff4d6d", // Menstruation color
    follicular: "#ffb3c1", // Follicular color
    ovulation: "#00bcd4", // Ovulation color
    luteal: "#cdb4db", // Luteal color
    symptomDot: "#4287f5", // Symptoms dot color
    activityDot: "#e63946", // Activity dot color
  });

  const symptomOptions = ["Cramps", "Fatigue", "Headache"];
  const activityOptions = ["Protected", "Unprotected", "None"];

  useEffect(() => {
    loadCycleData();
    loadLogs();
  }, []);

  const loadCycleData = async () => {
    const start = await AsyncStorage.getItem("cycleDay");
    setCycleStart(start);
    setPhase(getCyclePhase(start, today));
    markCycle(start);
  };

  const toggleSelection = (item, list, setter) => {
    const updated = list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];
    setter(updated);
  };

  const saveLogs = async () => {
    await AsyncStorage.setItem(`symptoms-${selectedDate}`, JSON.stringify(symptoms));
    await AsyncStorage.setItem(`activity-${selectedDate}`, JSON.stringify(activity));
    loadLogs();
    markCycle(cycleStart);
  };

  const loadLogs = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const logKeys = keys.filter((key) => key.startsWith("symptoms-"));
    const logs = await Promise.all(
      logKeys.map(async (key) => {
        const date = key.split("symptoms-")[1];
        const symptoms = await AsyncStorage.getItem(key);
        const activity = await AsyncStorage.getItem(`activity-${date}`);
        return { date, symptoms: JSON.parse(symptoms), activity: JSON.parse(activity) };
      })
    );
    setLogHistory(logs);
  };

  const markCycle = async (startDate) => {
    if (!startDate) return;
    const markings = {};
    for (let i = 0; i < 28; i++) {
      const date = new Date(new Date(startDate).getTime() + i * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      const phase = getCyclePhase(startDate, dateStr);
      const daySymptoms = await AsyncStorage.getItem(`symptoms-${dateStr}`);
      const dayActivity = await AsyncStorage.getItem(`activity-${dateStr}`);

      markings[dateStr] = {
        selected: true,
        selectedColor: getPhaseColor(phase, colors),
        marked: true,
        dotColor: daySymptoms
          ? getDotColor("symptoms", colors)
          : dayActivity
          ? getDotColor("activity", colors)
          : undefined,
      };
    }
    setMarkedDates(markings);
  };

  const getGraphData = () => {
    const data = {};
    logHistory.forEach((log) => {
      const entries = log[filterType] || [];
      entries.forEach((entry) => {
        data[entry] = (data[entry] || 0) + 1;
      });
    });
    return {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data) }],
    };
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cycle Tracker</Text>

      <View style={[styles.phaseCard, { backgroundColor: getPhaseColor(phase, colors) }]}>
        <Text style={styles.phaseLabel}>Current Phase:</Text>
        <Text style={styles.phase}>{phase}</Text>
      </View>

      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
      />

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendItem}>
          <Text style={{ color: colors.symptomDot }}>●</Text> Symptoms
        </Text>
        <Text style={styles.legendItem}>
          <Text style={{ color: colors.activityDot }}>●</Text> Sexual Activity
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Symptoms</Text>
        <View style={styles.optionsContainer}>
          {symptomOptions.map((symptom) => (
            <TouchableOpacity
              key={symptom}
              style={[styles.option, symptoms.includes(symptom) && styles.optionSelected]}
              onPress={() => toggleSelection(symptom, symptoms, setSymptoms)}
            >
              <Text style={{ color: symptoms.includes(symptom) ? "#fff" : "#aaa" }}>{symptom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sexual Activity</Text>
        <View style={styles.optionsContainer}>
          {activityOptions.map((act) => (
            <TouchableOpacity
              key={act}
              style={[styles.option, activity.includes(act) && styles.optionSelected]}
              onPress={() => toggleSelection(act, activity, setActivity)}
            >
              <Text style={{ color: activity.includes(act) ? "#fff" : "#aaa" }}>{act}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={saveLogs} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Today's Log</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setAnalyticsVisible(true)}
        style={styles.analyticsButton}
      >
        <Text style={styles.saveButtonText}>View Analytics</Text>
      </TouchableOpacity>

      <Modal visible={analyticsVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.sectionTitle}>Filter</Text>
          <Picker
            selectedValue={filterType}
            onValueChange={(value) => setFilterType(value)}
            style={{ marginBottom: 20 }}
          >
            <Picker.Item label="Symptoms" value="symptoms" />
            <Picker.Item label="Activity" value="activity" />
          </Picker>

          <BarChart
            data={getGraphData()}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(107, 76, 165, ${opacity})`,
              labelColor: () => "#444",
            }}
            style={{ borderRadius: 10 }}
          />

          <TouchableOpacity
            onPress={() => setAnalyticsVisible(false)}
            style={[styles.saveButton, { marginTop: 20 }]}
          >
            <Text style={styles.saveButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Period Start and End Date Inputs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Period Start and End Date</Text>
        <TextInput
          style={styles.input}
          placeholder="Period Start (YYYY-MM-DD)"
          value={cycleStart}
          onChangeText={setCycleStart}
        />
        <TextInput
          style={styles.input}
          placeholder="Period End (YYYY-MM-DD)"
          value={cycleEnd}
          onChangeText={setCycleEnd}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0f5", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#d94d79" },
  phaseCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  phaseLabel: { fontSize: 16, color: "#444" },
  phase: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  saveButton: {
    backgroundColor: "#e07a9b", // lighter pink
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold" },
  optionsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    margin: 5,
    backgroundColor: "#eee",
  },
  optionSelected: {
    backgroundColor: "#b9a9db", // lighter purple
    borderColor: "#b9a9db",
  },
  analyticsButton: {
    backgroundColor: "#a98fcf", //
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  legendItem: {
    fontSize: 14,
    color: "#333",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 10,
  },
});
