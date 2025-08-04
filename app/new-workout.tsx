import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NewWorkoutPage() {
  const [exercises, setExercises] = useState([{ name: "", sets: "", reps: "" }]);

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "" }]);
  };

  const updateExercise = (index, field, value) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const saveWorkout = () => {
    console.log("Workout saved:", exercises);
    // Save logic goes here (e.g., async storage or API)
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafe" }}>
      {/* Back Button */}
      <View style={{ position: "absolute", top: 50, left: 20, zIndex: 10 }}>
        <Link href="/track" asChild>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={28} color="#1e2a3c" />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Header */}
      <View style={{ paddingTop: 50, paddingHorizontal: 60, marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1e2a3c" }}>New Workout</Text>
        <Text style={{ color: "#555" }}>Add exercises to your routine</Text>
      </View>

      {/* Exercise Form */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        {exercises.map((exercise, index) => (
          <View key={index} style={{ backgroundColor: "#fff", borderRadius: 15, padding: 15, marginBottom: 15 }}>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Exercise {index + 1}</Text>
            <TextInput
              placeholder="Exercise name"
              value={exercise.name}
              onChangeText={(text) => updateExercise(index, "name", text)}
              style={{ borderBottomWidth: 1, borderColor: "#ccc", marginBottom: 10 }}
            />
            <TextInput
              placeholder="Sets"
              value={exercise.sets}
              onChangeText={(text) => updateExercise(index, "sets", text)}
              keyboardType="numeric"
              style={{ borderBottomWidth: 1, borderColor: "#ccc", marginBottom: 10 }}
            />
            <TextInput
              placeholder="Reps"
              value={exercise.reps}
              onChangeText={(text) => updateExercise(index, "reps", text)}
              keyboardType="numeric"
              style={{ borderBottomWidth: 1, borderColor: "#ccc" }}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={addExercise}
          style={{ backgroundColor: "#1e2a3c", padding: 12, borderRadius: 25, marginBottom: 20 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={saveWorkout}
          style={{ backgroundColor: "#4caf50", padding: 12, borderRadius: 25 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>Save Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
