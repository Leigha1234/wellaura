import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";

interface WaterEntry {
  date: string;
  amount: number;
}

export default function WaterTracker() {
  const [waterData, setWaterData] = useState<WaterEntry[]>([]);
  const [target, setTarget] = useState<number>(64);
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [input, setInput] = useState(target.toString());
  const [goalReachedAlready, setGoalReachedAlready] = useState(false);

  const glassAnim = React.useRef(new Animated.Value(0)).current;
  const today = new Date().toLocaleDateString();

  useEffect(() => {
    loadWaterData();
  }, []);

  useEffect(() => {
    if (dataLoaded) {
      animateGlass();

      if (dailyTotal >= target && target > 0 && !goalReachedAlready) {
        Alert.alert(
          "🎉 Goal Reached!",
          "You hit your hydration target today! Great job! 💧"
        );
        setGoalReachedAlready(true);
        AsyncStorage.setItem(`goalReached_${today}`, "true");
      }
    }
  }, [dailyTotal, dataLoaded]);

  const loadWaterData = async () => {
    const data = await AsyncStorage.getItem("waterData");
    const storedTarget = await AsyncStorage.getItem("waterTarget");
    const goalReached = await AsyncStorage.getItem(`goalReached_${today}`);

    let total = 0;

    if (data) {
      const parsed: WaterEntry[] = JSON.parse(data);
      setWaterData(parsed);
      const todayEntry = parsed.find((entry) => entry.date === today);
      if (todayEntry) total = todayEntry.amount;
    }

    if (storedTarget) {
      const targetNum = parseInt(storedTarget);
      setTarget(targetNum);
      setInput(targetNum.toString());
    }

    setDailyTotal(total);
    setGoalReachedAlready(goalReached === "true");
    setDataLoaded(true);
  };

  const animateGlass = () => {
    const fillPercent = Math.min(dailyTotal / target, 1) * 100;
    Animated.timing(glassAnim, {
      toValue: fillPercent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const addGlass = async () => {
    const increment = 8;
    const newAmount = dailyTotal + increment;

    const updatedData = waterData.filter((entry) => entry.date !== today);
    updatedData.push({ date: today, amount: newAmount });

    setWaterData(updatedData);
    setDailyTotal(newAmount);

    await AsyncStorage.setItem("waterData", JSON.stringify(updatedData));
  };

  const updateTarget = async (value: string) => {
    setInput(value);
    const val = parseInt(value);
    if (!isNaN(val) && val > 0) {
      setTarget(val);
      await AsyncStorage.setItem("waterTarget", value);
      animateGlass();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Water Tracker</Text>
      <Text style={styles.status}>
        Target: {target} oz | Today: {dailyTotal} oz
      </Text>

      <View style={styles.glassContainer}>
        <TouchableOpacity onPress={addGlass} activeOpacity={0.7}>
          <View style={styles.glass}>
            <Animated.View
              style={[
                styles.waterFill,
                {
                  height: glassAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.tapText}>Tap the glass to add 8 oz</Text>
      </View>

      <TextInput
        placeholder="Set daily target (oz)"
        keyboardType="numeric"
        value={input}
        onChangeText={updateTarget}
        style={styles.input}
      />

      <Text style={styles.historyTitle}>Previous Days</Text>
      {waterData
        .filter((entry) => entry.date !== today)
        .slice(-7)
        .reverse()
        .map((entry, index) => (
          <Text key={index} style={styles.historyItem}>
            {entry.date}: {entry.amount} oz
          </Text>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: "#f8faff",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e2a3c",
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
  },
  glassContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  glass: {
    width: 80,
    height: 150,
    borderWidth: 3,
    borderColor: "#3ac6f2",
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#d6eefa",
    justifyContent: "flex-end",
  },
  waterFill: {
    backgroundColor: "#3ac6f2",
    width: "100%",
  },
  tapText: {
    marginTop: 10,
    color: "#3ac6f2",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 30,
  },
  historyTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  historyItem: {
    fontSize: 14,
    marginBottom: 4,
  },
});
