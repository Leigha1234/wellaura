import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function HabitTrackerPage() {
  const [habit, setHabit] = useState("");
  const [frequency, setFrequency] = useState("1"); // Frequency input (e.g., 3 times a week)
  const [habits, setHabits] = useState([]);
  const [completedHabits, setCompletedHabits] = useState({});
  const todayKey = new Date().toISOString().split("T")[0]; // e.g., "2025-05-08"

  useEffect(() => {
    const loadHabits = async () => {
      const storedHabits = await AsyncStorage.getItem("habits");
      const storedCompletedHabits = await AsyncStorage.getItem(`completed-${todayKey}`);
      if (storedHabits) setHabits(JSON.parse(storedHabits));
      if (storedCompletedHabits) setCompletedHabits(JSON.parse(storedCompletedHabits));
    };
    loadHabits();
  }, []);

  const saveHabits = async (updatedHabits) => {
    setHabits(updatedHabits);
    await AsyncStorage.setItem("habits", JSON.stringify(updatedHabits));
  };

  const saveCompletedHabits = async (updatedCompletedHabits) => {
    setCompletedHabits(updatedCompletedHabits);
    await AsyncStorage.setItem(`completed-${todayKey}`, JSON.stringify(updatedCompletedHabits));
  };

  const addHabit = () => {
    if (!habit.trim() || !frequency || isNaN(frequency) || frequency <= 0) {
      Alert.alert("Please enter a valid habit and frequency.");
      return;
    }

    const newHabit = {
      name: habit,
      frequency: parseInt(frequency, 10), // Frequency is stored as an integer
      completedCount: 0, // Tracks how many times the habit is completed
      completed: Array(parseInt(frequency, 10)).fill(false), // Array of booleans for checking off each instance
    };

    const updatedHabits = [...habits, newHabit];
    saveHabits(updatedHabits);
    setHabit("");
    setFrequency("1");
  };

  const toggleTask = (habitIndex, taskIndex) => {
    const updatedHabits = [...habits];
    const updatedCompleted = [...updatedHabits[habitIndex].completed];
    updatedCompleted[taskIndex] = !updatedCompleted[taskIndex]; // Toggle the completion state
    updatedHabits[habitIndex].completed = updatedCompleted;
    updatedHabits[habitIndex].completedCount = updatedCompleted.filter(Boolean).length; // Update count of completed instances
    saveHabits(updatedHabits);

    const updatedCompletedHabits = { ...completedHabits };
    updatedCompletedHabits[habitIndex] = updatedCompleted;
    saveCompletedHabits(updatedCompletedHabits);
  };

  const deleteHabit = (index) => {
    const updatedHabits = [...habits];
    updatedHabits.splice(index, 1);
    saveHabits(updatedHabits);

    const updatedCompletedHabits = { ...completedHabits };
    delete updatedCompletedHabits[index];
    saveCompletedHabits(updatedCompletedHabits);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗓 Habit Tracker</Text>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter Habit (e.g., Gym)"
          value={habit}
          onChangeText={setHabit}
        />
        <TextInput
          style={styles.input}
          placeholder="How often? (e.g., 3 times a week)"
          value={frequency}
          keyboardType="numeric"
          onChangeText={setFrequency}
        />
        <TouchableOpacity style={styles.button} onPress={addHabit}>
          <Text style={styles.buttonText}>Add Habit</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.habitRow}>
            <Text style={styles.habitText}>{item.name} - {item.frequency} times</Text>
            <FlatList
              data={Array(item.frequency).fill(false)}
              horizontal
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ _, itemIndex }) => (
                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    item.completed[itemIndex] && { backgroundColor: "#4CAF50" },
                  ]}
                  onPress={() => toggleTask(index, itemIndex)}
                >
                  <Text style={styles.checkButtonText}>
                    {item.completed[itemIndex] ? "✓" : `${itemIndex + 1}`}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => deleteHabit(index)}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#3f51b5",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  habitRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  habitText: {
    fontSize: 16,
    fontWeight: "600",
  },
  checkButton: {
    width: 30,
    height: 30,
    margin: 5,
    borderRadius: 15,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  deleteText: {
    color: "#d32f2f",
    fontSize: 18,
    fontWeight: "bold",
    paddingLeft: 10,
  },
});
