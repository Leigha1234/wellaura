import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

interface SleepEntry {
  date: string;
  hours: number;
  quality: string;
}

export default function Sleep() {
  const [sleepData, setSleepData] = useState<SleepEntry[]>([]);
  const [hours, setHours] = useState<string>("");
  const [quality, setQuality] = useState<string>("");
  const [sleepGoal, setSleepGoal] = useState<number>(8); // Default goal
  const [sleepGoalInput, setSleepGoalInput] = useState<string>("8");

  useEffect(() => {
    loadSleepData();
  }, []);

  const loadSleepData = async () => {
    const data = await AsyncStorage.getItem("sleepData");
    if (data) setSleepData(JSON.parse(data));
  };

  const saveSleepData = async () => {
    const newEntry: SleepEntry = {
      date: new Date().toLocaleDateString(),
      hours: parseFloat(hours),
      quality,
    };
    const updatedData = [...sleepData, newEntry];
    setSleepData(updatedData);
    await AsyncStorage.setItem("sleepData", JSON.stringify(updatedData));
    setHours("");
    setQuality("");
  };

  const averageSleep = (
    sleepData.reduce((sum, entry) => sum + entry.hours, 0) / sleepData.length || 0
  ).toFixed(2);

  const sleepChartData = sleepData.slice(-7).map((entry) => entry.hours);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sleep Tracker</Text>

      {/* Sleep Goal Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Set Your Sleep Goal (hrs):</Text>
        <TextInput
          keyboardType="numeric"
          value={sleepGoalInput}
          onChangeText={setSleepGoalInput}
          onBlur={() => {
            const val = parseFloat(sleepGoalInput);
            if (!isNaN(val) && val > 0) {
              setSleepGoal(val);
            } else {
              setSleepGoalInput(String(sleepGoal)); // reset to previous
            }
          }}
          style={styles.input}
        />
      </View>

      <Text style={styles.info}>Average Sleep: {averageSleep} hours</Text>

      {/* Log Sleep */}
      <View style={styles.inputGroup}>
        <TextInput
          keyboardType="numeric"
          placeholder="Hours slept last night"
          value={hours}
          onChangeText={setHours}
          style={styles.input}
        />
        <TextInput
          placeholder="How did you feel? (Rested, Tired, etc)"
          value={quality}
          onChangeText={setQuality}
          style={styles.input}
        />
        <TouchableOpacity onPress={saveSleepData} style={styles.button}>
          <Text style={styles.buttonText}>Log Sleep</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Past 7 Days</Text>
      {sleepData.slice(-7).map((entry, index) => (
        <View key={index} style={styles.sleepEntry}>
          <Text>
            {entry.date}: {entry.hours}h - {entry.quality}
          </Text>
          <Text style={styles.goalStatus}>
            {entry.hours >= sleepGoal ? "✅ Goal Met" : "⚠️ Goal Missed"}
          </Text>
        </View>
      ))}

      {/* Chart */}
      {sleepChartData.length > 0 && (
        <>
          <Text style={styles.subtitle}>Sleep Trend</Text>
          <LineChart
            data={{
              labels: sleepData.slice(-7).map((entry) => entry.date),
              datasets: [
                {
                  data: sleepChartData,
                },
              ],
            }}
            width={Dimensions.get("window").width - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#f8fafe",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafe",
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#b3e5fc",
    padding: 12,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "bold",
  },
  info: {
    fontSize: 16,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  sleepEntry: {
    marginBottom: 8,
  },
  goalStatus: {
    fontWeight: "600",
    color: "#00796b",
  },
  chart: {
    marginVertical: 16,
    borderRadius: 10,
  },
});
