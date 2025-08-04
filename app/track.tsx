import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TrackPage() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafe" }}>
      {/* Top Back Arrow */}
      <View style={{ position: "absolute", top: 50, left: 20, zIndex: 10 }}>
        <Link href="/" asChild>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={28} color="#1e2a3c" />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Header */}
      <View style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1e2a3c" }}>Workout Tracker</Text>
        <Text style={{ color: "#555", marginTop: 5 }}>Track your daily fitness progress</Text>
      </View>

      {/* Buttons to navigate */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 20 }}>
        <Link href="/new-workout" asChild>
          <TouchableOpacity style={{
            backgroundColor: "#1e2a3c",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20
          }}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>New Workout</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/view-log" asChild>
          <TouchableOpacity style={{
            backgroundColor: "#4caf50",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20
          }}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>View Log</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Meal Planner Shortcut */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Link href="/meal-planner" asChild>
          <TouchableOpacity style={{
            backgroundColor: "#ff9800",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20
          }}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Meal Planner</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Sample Exercises */}
      <ScrollView style={{ paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Push-Ups</Text>
          <Text>3 sets of 15 reps</Text>
        </View>
        <View style={{ backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Squats</Text>
          <Text>3 sets of 20 reps</Text>
        </View>
        <View style={{ backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Plank</Text>
          <Text>Hold for 60 seconds</Text>
        </View>
        <View style={{ backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 100 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Jumping Jacks</Text>
          <Text>2 minutes</Text>
        </View>
      </ScrollView>
    </View>
  );
}
