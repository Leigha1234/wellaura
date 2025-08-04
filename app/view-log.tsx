import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function ViewLogPage() {
  const logs = [
    { date: "May 8, 2025", exercises: ["Push-ups", "Squats", "Plank"] },
    { date: "May 7, 2025", exercises: ["Jumping Jacks", "Burpees"] },
    { date: "May 6, 2025", exercises: ["Push-ups", "Lunges"] },
  ];

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
      <View style={{ paddingTop: 50, paddingHorizontal: 60, marginBottom: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1e2a3c" }}>Workout Log</Text>
      </View>

      {/* Log List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
        {logs.map((log, index) => (
          <View key={index} style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
            elevation: 1
          }}>
            <Text style={{ fontWeight: "bold", marginBottom: 6 }}>{log.date}</Text>
            {log.exercises.map((exercise, i) => (
              <Text key={i} style={{ color: "#444" }}>• {exercise}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
