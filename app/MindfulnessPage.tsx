import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  Alert,
} from "react-native";
import LottieView from "lottie-react-native";

const DAILY_AFFIRMATION = "I am calm, centered, and at peace.";
const COLOR_CYCLE = ["#A0E7E5", "#B4F8C8", "#FBE7C6", "#FFAEBC"];
const MOODS = ["😊", "😔", "😠", "😴", "😐"];

export default function MindfulnessPage() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState("Breathe In");
  const [duration, setDuration] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [journalText, setJournalText] = useState("");

  const backgroundColor = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathCycleRef = useRef<NodeJS.Timeout | null>(null);
  const colorCycleRef = useRef<NodeJS.Timeout | null>(null);

  const interpolateColor = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: [
      COLOR_CYCLE[colorIndex],
      COLOR_CYCLE[(colorIndex + 1) % COLOR_CYCLE.length],
    ],
  });

  useEffect(() => {
    if (isBreathing) {
      setDuration(0);
      startTimer();
      startBreathCycleText();
      startColorCycle();
    } else {
      stopTimer();
      clearBreathCycleText();
      stopColorCycle();
      setBreathText("Breathe In");
      setDuration(0);
    }

    return () => {
      stopTimer();
      clearBreathCycleText();
      stopColorCycle();
    };
  }, [isBreathing]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startBreathCycleText = () => {
    setBreathText("Breathe In");
    breathCycleRef.current = setInterval(() => {
      setBreathText((t) => (t === "Breathe In" ? "Breathe Out" : "Breathe In"));
    }, 4000);
  };

  const clearBreathCycleText = () => {
    if (breathCycleRef.current) {
      clearInterval(breathCycleRef.current);
      breathCycleRef.current = null;
    }
  };

  const startColorCycle = () => {
    colorCycleRef.current = setInterval(() => {
      const nextIndex = (colorIndex + 1) % COLOR_CYCLE.length;
      Animated.timing(backgroundColor, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        backgroundColor.setValue(0);
        setColorIndex(nextIndex);
      });
    }, 4000);
  };

  const stopColorCycle = () => {
    if (colorCycleRef.current) {
      clearInterval(colorCycleRef.current);
      colorCycleRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (sec % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleJournalSave = () => {
    Alert.alert("Journal Saved", journalText ? "Your entry has been saved." : "No text entered.");
    setJournalText("");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Mindfulness & Meditation</Text>

      <View style={styles.affirmationContainer}>
        <Text style={styles.affirmationText}>{DAILY_AFFIRMATION}</Text>
      </View>

      <TouchableOpacity
        onPress={() => setIsBreathing((prev) => !prev)}
        style={[
          styles.button,
          isBreathing ? styles.buttonStop : styles.buttonStart,
        ]}
      >
        <Text style={styles.buttonText}>
          {isBreathing ? "Stop Breathing" : "Start Breathing"}
        </Text>
      </TouchableOpacity>

      {isBreathing && (
        <View style={styles.breathingContainer}>
          <Animated.View
            style={[styles.breathCircle, { backgroundColor: interpolateColor }]}
          >
            <LottieView
              source={require("../assets/breathing.json")}
              autoPlay
              loop
              style={styles.lottie}
            />
          </Animated.View>
          <Text style={styles.breathText}>{breathText}</Text>
          <Text style={styles.durationText}>
            Duration: {formatDuration(duration)}
          </Text>
        </View>
      )}

      {/* Mood Tracker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood Tracker</Text>
        <View style={styles.moodContainer}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood}
              onPress={() => setSelectedMood(mood)}
              style={[
                styles.moodButton,
                selectedMood === mood && styles.moodSelected,
              ]}
            >
              <Text style={styles.moodText}>{mood}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedMood && (
          <Text style={styles.selectedMoodText}>You feel: {selectedMood}</Text>
        )}
      </View>

      {/* Journaling */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journal</Text>
        <TextInput
          style={styles.journalInput}
          multiline
          placeholder="Write your thoughts here..."
          value={journalText}
          onChangeText={setJournalText}
        />
        <TouchableOpacity style={styles.journalButton} onPress={handleJournalSave}>
          <Text style={styles.journalButtonText}>Save Entry</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#f8fafe",
    flexGrow: 1,
    alignItems: "center",
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e2a3c",
    marginBottom: 15,
  },
  affirmationContainer: {
    backgroundColor: "#d0e8ff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: "100%",
  },
  affirmationText: {
    fontSize: 18,
    fontStyle: "italic",
    color: "#3a7bd5",
    textAlign: "center",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 40,
  },
  buttonStart: {
    backgroundColor: "#3ac6f2",
  },
  buttonStop: {
    backgroundColor: "#f25c5c",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  breathingContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  breathCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  breathText: {
    fontSize: 28,
    color: "#3a3a3a",
    fontWeight: "600",
    marginBottom: 10,
  },
  durationText: {
    fontSize: 16,
    color: "#555",
  },
  section: {
    width: "100%",
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1e2a3c",
    marginBottom: 10,
  },
  moodContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  moodButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  moodSelected: {
    backgroundColor: "#cce5ff",
  },
  moodText: {
    fontSize: 24,
  },
  selectedMoodText: {
    fontSize: 16,
    textAlign: "center",
    color: "#3a3a3a",
  },
  journalInput: {
    height: 100,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  journalButton: {
    backgroundColor: "#3ac6f2",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  journalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
