import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const today = new Date().toISOString().split("T")[0];

  const [waterCount, setWaterCount] = useState(0);
  const [waterTarget, setWaterTarget] = useState(64);
  const [sleepHours, setSleepHours] = useState(0);
  const [cycleDay, setCycleDay] = useState<string | null>(null);
  const [habitList, setHabitList] = useState([
    { name: "Exercise", completed: false },
    { name: "Meditate", completed: false },
  ]);

  const [glassAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadWater();
    loadSleep();
    loadCycle();
  }, []);

  useEffect(() => {
    Animated.timing(glassAnim, {
      toValue: (waterCount / waterTarget) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [waterCount]);

  const loadWater = async () => {
    const count = await AsyncStorage.getItem("waterCount");
    const target = await AsyncStorage.getItem("waterTarget");
    const lastDate = await AsyncStorage.getItem("lastWaterDate");
    if (lastDate !== today) {
      await AsyncStorage.setItem("waterCount", "0");
      await AsyncStorage.setItem("lastWaterDate", today);
      setWaterCount(0);
    } else if (count) {
      setWaterCount(parseInt(count));
    }
    if (target) setWaterTarget(parseInt(target));
  };

  const addWater = async () => {
    const newCount = waterCount + 8;
    setWaterCount(newCount);
    await AsyncStorage.setItem("waterCount", newCount.toString());
    await AsyncStorage.setItem("lastWaterDate", today);
  };

  const loadSleep = async () => {
    const hours = await AsyncStorage.getItem("sleepHours");
    const lastSleepDate = await AsyncStorage.getItem("lastSleepDate");
    if (lastSleepDate !== today) {
      await AsyncStorage.setItem("sleepHours", "0");
      await AsyncStorage.setItem("lastSleepDate", today);
      setSleepHours(0);
    } else if (hours) {
      setSleepHours(parseFloat(hours));
    }
  };

  const loadCycle = async () => {
    const day = await AsyncStorage.getItem("cycleDay");
    setCycleDay(day || null);
  };

  const logCycle = async () => {
    const newDay = today;
    setCycleDay(newDay);
    await AsyncStorage.setItem("cycleDay", newDay);
  };

  const toggleHabit = (index: number) => {
    const updatedHabits = [...habitList];
    updatedHabits[index].completed = !updatedHabits[index].completed;
    setHabitList(updatedHabits);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: "#f8fafe" }}>
        <View style={{ padding: 20, paddingTop: 50 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1e2a3c" }}>
            Wellaura
          </Text>
          <View style={{
            marginTop: 10,
            padding: 15,
            backgroundColor: "#d7f0f4",
            borderRadius: 15,
          }}>
            <Text style={{ fontSize: 16 }}>Laura</Text>
            <Text style={{ fontSize: 14, color: "#555" }}>
              Let’s hit your goals today!
            </Text>
          </View>
        </View>

        <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <Link href="/calendar" asChild>
            <TouchableOpacity style={styles.cardBlue}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Calendar & To-Do</Text>
              </View>
              <Text>Tue 24 - 9:00 AM - Meeting with Sam</Text>
              <Text>• Buy groceries</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/BudgetPage" asChild>
            <TouchableOpacity style={styles.cardYellow}>
              <View style={styles.cardHeader}>
                <FontAwesome name="money" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Budget</Text>
              </View>
              <Text>Remaining: £520.00</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/calendar" asChild>
            <TouchableOpacity style={styles.cardBlue}>
              <View style={styles.cardHeader}>
                <Ionicons name="list" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Daily Planner</Text>
              </View>
              <Text>8:00 AM - Work</Text>
              <Text>9:00 AM - Call</Text>
              <Text>Add lunch...</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/water" asChild>
            <TouchableOpacity style={styles.cardWater}>
              <View style={styles.cardHeader}>
                <FontAwesome name="tint" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Water Tracker</Text>
              </View>
              <View style={styles.glass}>
                <Animated.View style={{
                  height: glassAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#3ac6f2",
                  width: "100%",
                }} />
              </View>
              <Text>{waterCount} oz / {waterTarget} oz</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/HabitTrackerPage" asChild>
            <TouchableOpacity style={styles.cardPurple}>
              <View style={styles.cardHeader}>
                <FontAwesome name="check-square-o" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Habits</Text>
              </View>
              {habitList.map((habit, idx) => (
                <TouchableOpacity key={idx} onPress={() => toggleHabit(idx)}>
                  <Text style={{ textDecorationLine: habit.completed ? "line-through" : "none" }}>
                    {habit.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </Link>

          <Link href="/MindfulnessPage" asChild>
            <TouchableOpacity style={styles.cardPink}>
              <View style={styles.cardHeader}>
                <Ionicons name="leaf" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Mindfulness</Text>
              </View>
              <Text style={{ color: "#555" }}>How do you feel?</Text>
              <Text style={{ fontSize: 24, marginTop: 5 }}>😊</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/meal-planner" asChild>
            <TouchableOpacity style={styles.cardOrange}>
              <View style={styles.cardHeader}>
                <Ionicons name="restaurant" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Meal Planner</Text>
              </View>
              <Text>Next meal: Lunch at 12:30 PM</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/cycle" asChild>
            <TouchableOpacity style={styles.cardPink}>
              <View style={styles.cardHeader}>
                <FontAwesome name="female" size={20} color="#1e2a3c" />
                <Text style={styles.cardTitle}>Cycle Tracker</Text>
              </View>
              <Text style={{ marginVertical: 5 }}>
                Last logged: {cycleDay || "Not yet"}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {["Menstrual", "Follicular", "Ovulation", "Luteal"].map((phase, i) => (
                  <View key={i} style={{ backgroundColor: ["#d94d79", "#e1f5ff", "#ffe6eb", "#f2e9ff", "#ccc"][i], padding: 5, borderRadius: 5 }}>
                    <Text>{phase}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </Link>
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <NavIcon icon="home" label="Home" link="/" />
          <NavIcon icon="line-chart" label="Track" link="/track" fa />
          <NavIcon icon="leaf" label="Plan" link="/meal-planner" />
          <NavIcon icon="heart" label="Mindfulness" link="/MindfulnessPage" />
          <NavIcon icon="person" label="Profile" link="/profile" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const NavIcon = ({ icon, label, link, fa }: any) => (
  <Link href={link} asChild>
    <TouchableOpacity style={{ alignItems: "center" }}>
      {fa ? (
        <FontAwesome name={icon} size={24} color="#333" />
      ) : (
        <Ionicons name={icon} size={24} color="#333" />
      )}
      <Text style={{ fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  </Link>
);

const styles = StyleSheet.create({
  cardTitle: { fontWeight: "bold", marginBottom: 5 },
  cardBlue: {
    backgroundColor: "#e8eafe",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  cardYellow: {
    backgroundColor: "#fff4e6",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  cardWater: {
    backgroundColor: "#e1f5ff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  cardPurple: {
    backgroundColor: "#f2e9ff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: "flex-start",
  },
  cardPink: {
    backgroundColor: "#ffe6eb",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: "flex-start",
  },
  cardOrange: {
    backgroundColor: "#ffe9d6",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: "flex-start",
  },
  glass: {
    width: 60,
    height: 100,
    borderWidth: 2,
    borderColor: "#3ac6f2",
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
