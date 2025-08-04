import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { LineChart } from "react-native-chart-kit";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get("window").width;
const msPerDay = 86400000; // Milliseconds per day

const symptomOptions = [
  "Cramps",
  "Fatigue",
  "Headache",
  "Back Pain",
  "Nausea",
  "Mood Swings",
];
const sexDriveOptions = ["", "High", "Neutral", "Low"];
const birthControlOptions = [
  "Pill Taken",
  "Missed Pill",
  "Injection",
  "IUD",
  "Implant",
  "Patch",
  "None",
];

// Pregnancy-specific constants
const pregSymptomsOptions = [
  "Morning Sickness",
  "Fatigue",
  "Breast Tenderness",
  "Frequent Urination",
  "Food Cravings",
  "Aversions",
  "Heartburn",
  "Swelling",
  "Backache",
  "Braxton Hicks",
  "Contractions",
  "Fetal Movement",
  "Pelvic Pressure",
];

const pregnancyFacts = {
  4: { size: "Poppy Seed", fact: "Your baby is just a tiny ball of cells, but a lot is happening!" },
  5: { size: "Sesame Seed", fact: "The neural tube is developing, which will become the brain and spinal core." },
  6: { size: "Lentil", fact: "The heart begins to beat and tiny limb buds appear." },
  7: { size: "Blueberry", fact: "Your baby has developed tiny hands and feet, though they look more like paddles." },
  8: { size: "Kidney Bean", fact: "Fingers and toes are forming, and the tiny tail is almost gone!" },
  9: { size: "Grape", fact: "All major organs are in place, just needing to grow and develop." },
  10: { size: "Kumquat", fact: "The baby's eyelids are forming, and the placenta is fully functional." },
  11: { size: "Fig", fact: "Your baby is starting to kick and stretch, though you can't feel it yet." },
  12: { size: "Plum", fact: "The baby's reflexes are developing, and they can open and close their fingers." },
  13: { size: "Peach", fact: "Your baby now has unique fingerprints and is growing rapidly!" },
  14: { size: "Lemon", fact: "Hair is starting to grow on your baby's head and body." },
  15: { size: "Apple", fact: "Your baby can now hear sounds, including your heartbeat!" },
  16: { size: "Avocado", fact: "The baby's skeleton is hardening from cartilage to bone." },
  17: { size: "Turnip", fact: "Your baby is developing fat layers under their skin." },
  18: { size: "Bell Pepper", fact: "Your baby is becoming more active, and you might start feeling flutters!" },
  19: { size: "Mango", fact: "A protective coating called vernix caseosa is forming on your baby's skin." },
  20: { size: "Artichoke", fact: "You're halfway there! Your baby is swallowing more and practicing breathing." },
  21: { size: "Pomegranate", fact: "Your baby's eyebrows and eyelids are fully formed." },
  22: { size: "Papaya", fact: "Your baby is beginning to sprout hair, and their grip is strengthening." },
  23: { size: "Large Grapefruit", fact: "Your baby can recognize your voice and is gaining weight rapidly." },
  24: { size: "Cantaloupe", fact: "Your baby's lungs are developing rapidly, producing surfactant." },
  25: { size: "Cauliflower", fact: "Your baby is developing distinct sleep and wake patterns." },
  26: { size: "Head of Lettuce", fact: "Your baby is starting to open their eyes and respond to light." },
  27: { size: "Rutabaga", fact: "Your baby's brain is very active, and they are moving more rhythmically." },
  28: { size: "Eggplant", fact: "Your baby is almost 2/3 of their birth size and weight." },
  29: { size: "Butternut Squash", fact: "Your baby's bones are continuing to harden." },
  30: { size: "Cabbage", fact: "Your baby is gaining about half a pound a week and getting plump!" },
  31: { size: "Coconut", fact: "Your baby's central nervous system is maturing quickly." },
  32: { size: "Jicama", fact: "Your baby's skin is smoothing out as fat layers build up." },
  33: { size: "Pineapple", fact: "Your baby's immune system is developing, and they are practicing breathing." },
  34: { size: "Pumpkin", fact: "Your baby's lungs are nearly mature, almost ready for the outside world!" },
  35: { size: "Honeydew Melon", fact: "Your baby's kidneys are fully developed, and the liver can process waste." },
  36: { size: "Romaine Lettuce", fact: "Your baby is losing the vernix caseosa and gaining more fat." },
  37: { size: "Swiss Chard", fact: "Your baby is considered full-term! They are practicing essential skills for birth." },
  38: { size: "Watermelon", fact: "Your baby's brain is still developing, adding more folds." },
  39: { size: "Mini Watermelon", fact: "Your baby is getting into position for birth, often head-down." },
  40: { size: "Pumpkin", fact: "Congratulations! Your baby is here or coming very soon!" },
};


function getCyclePhase(startDate, dateStr, cycleLength, periodDuration) {
  if (!startDate) return "Not Tracked";
  const delta = Math.floor((new Date(dateStr).getTime() - new Date(startDate).getTime()) / msPerDay);
  if (delta < 0) return "Future Date";

  const cycleDay = (delta % cycleLength) + 1;

  const ovulationDay = cycleLength - 14;

  if (cycleDay <= periodDuration) return "Menstruation";
  if (cycleDay <= ovulationDay) return "Follicular Phase";
  if (cycleDay === ovulationDay + 1) return "Ovulation (Fertile Window)";
  if (cycleDay <= cycleLength) return "Luteal Phase";
  return "Awaiting New Cycle";
}

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case "Menstruation":
      return "#c2185b";
    case "Follicular Phase":
      return "#ffb3c1";
    case "Ovulation (Fertile Window)":
      return "#00bcd4";
    case "Luteal Phase":
      return "#cdb4db";
    default:
      return "#e0e0e0";
  }
};

export default function CycleTracker() {
  const today = new Date().toISOString().split("T")[0];

  // Cycle and UI state
  const [cycleStart, setCycleStart] = useState(today);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [discreetMode, setDiscreetMode] = useState(false);
  const [goal, setGoal] = useState("None"); // Can be "None", "Pregnancy" (TTC), "PregnantMode" (Currently Pregnant)
  const [cervicalMucus, setCervicalMucus] = useState("");
  const [basalTemp, setBasalTemp] = useState("");
  const [lhTest, setLhTest] = useState("");
  const [pregnancyTest, setPregnancyTest] = useState("");
  const [userDueDate, setUserDueDate] = useState("");
  const [logs, setLogs] = useState({});

  // Pregnancy-specific state variables
  const [pregWeight, setPregWeight] = useState("");
  const [doctorVisit, setDoctorVisit] = useState("");
  const [pregSymptoms, setPregSymptoms] = useState([]);

  // State for the positive test congratulatory modal
  const [positiveTestCongratsModalVisible, setPositiveTestCongratsModalVisible] = useState(false);
  // State for the initial pregnancy details modal
  const [initialPregnancyModalVisible, setInitialPregnancyModalVisible] = useState(false);
  const [tempWeeksPregnant, setTempWeeksPregnant] = useState(''); // For user input in the new modal
  const [selectedDueDateInModal, setSelectedDueDateInModal] = useState(today); // For direct due date selection in the new modal

  // Calculate weeks pregnant if in PregnantMode and due date is set
  let weeksPregnant = null;
  let babyFact = null;
  if (goal === "PregnantMode" && userDueDate) {
    const todayDate = new Date();
    const dueDate = new Date(userDueDate);
    
    // Calculate weeks pregnant from due date
    // Total days in a standard pregnancy = 280 (40 weeks)
    // Days from today to dueDate
    const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - todayDate.getTime()) / msPerDay));
    // Weeks from selectedDate (rounded down)
    weeksPregnant = Math.max(0, 40 - Math.floor(daysUntilDue / 7)); 
    
    // Lookup baby fact
    babyFact = pregnancyFacts[Math.floor(weeksPregnant)];
  }


  // Editable fields for selected date
  const [symptoms, setSymptoms] = useState([]);
  const [activity, setActivity] = useState([]);
  const [birthControl, setBirthControl] = useState([]);
  const [sexDrive, setSexDrive] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [note, setNote] = useState("");

  // Modal controls
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [periodSettingsVisible, setPeriodSettingsVisible] = useState(false);
  
  // Initialize filterType based on goal
  // Use a useEffect if `goal` could change *after* initial render and you want `filterType` to update automatically.
  // For now, it will set correctly on component mount or manual `setGoal` in settings.
  const [filterType, setFilterType] = useState(
    goal === "PregnantMode" ? "pregSymptoms" : "symptoms"
  );

  // Helper to toggle selection in array state
  const toggleSelection = (item, list, setFn) =>
    setFn(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  // Load logs for a day into modal fields and open modal
  const openLogModalForDate = (date) => {
    setSelectedDate(date);
    const dayLog = logs[date] || {
      symptoms: [],
      activity: [],
      birthControl: [],
      sexDrive: "",
      mood: "",
      energy: "",
      note: "",
      cervicalMucus: "",
      basalTemp: "",
      lhTest: "",
      pregnancyTest: "",
      pregWeight: "",
      doctorVisit: "",
      pregSymptoms: [],
    };
    setCervicalMucus(dayLog.cervicalMucus || "");
    setBasalTemp(dayLog.basalTemp || "");
    setLhTest(dayLog.lhTest || "");
    setPregnancyTest(dayLog.pregnancyTest || "");
    setSymptoms(dayLog.symptoms);
    setActivity(dayLog.activity);
    setBirthControl(dayLog.birthControl);
    setSexDrive(dayLog.sexDrive);
    setMood(dayLog.mood);
    setEnergy(dayLog.energy);
    setNote(dayLog.note);
    setPregWeight(dayLog.pregWeight || "");
    setDoctorVisit(dayLog.doctorVisit || "");
    setPregSymptoms(dayLog.pregSymptoms || []);

    setLogModalVisible(true);
  };

  // Function to handle saving initial pregnancy details
  const handleInitialPregnancyDetailsSave = () => {
    let calculatedDueDate = null;

    if (tempWeeksPregnant) {
      const weeks = parseInt(tempWeeksPregnant, 10);
      if (!isNaN(weeks) && weeks >= 1 && weeks <= 40) { // Basic validation for weeks
        const todayDate = new Date();
        const remainingDays = Math.max(0, (40 - weeks) * 7); // Remaining days assuming 40-week pregnancy
        const newDueDate = new Date(todayDate.getTime() + remainingDays * msPerDay);
        calculatedDueDate = newDueDate.toISOString().split("T")[0];
      }
    } else if (selectedDueDateInModal) {
        calculatedDueDate = selectedDueDateInModal; // Use the directly selected date
    }

    // Set the calculated/selected due date
    setUserDueDate(calculatedDueDate || today); // Fallback to today if nothing valid is set

    // Transition to PregnantMode
    setGoal("PregnantMode");
    // Also reset filterType for analytics to a relevant pregnancy one
    setFilterType("pregSymptoms"); 

    // Close the initial details modal
    setInitialPregnancyModalVisible(false);

    // Show the congratulatory modal
    setPositiveTestCongratsModalVisible(true);
  };


  // Save current modal edits to logs state
  const saveLogsForDate = () => {
    // Check for positive pregnancy test if in TTC mode
    const isPositiveTest = goal === "Pregnancy" && pregnancyTest === "Positive";

    // Save current log data first
    setLogs(prevLogs => ({
      ...prevLogs,
      [selectedDate]: {
        symptoms, activity, birthControl, sexDrive, mood, energy, note,
        cervicalMucus, basalTemp, lhTest, pregnancyTest,
        pregWeight, doctorVisit, pregSymptoms,
      },
    }));

    // Close the current log modal
    setLogModalVisible(false);

    // If positive test detected AND we are in TTC mode, open the new initial pregnancy details modal
    if (isPositiveTest) {
      setInitialPregnancyModalVisible(true);
      // Reset tempWeeksPregnant for a clean slate when modal opens
      setTempWeeksPregnant('');
      // Default the calendar in the modal to today or an educated guess if userDueDate exists
      setSelectedDueDateInModal(userDueDate || today);
    }
  };

  // Mark calendar days for cycle and highlight selected date
  const getMarkedDates = () => {
    if (!cycleStart && goal !== "PregnantMode") return {};

    const markings = {};
    // Only show predictions if not in PregnantMode
    if (goal !== "PregnantMode") {
        const predictions = getCyclePredictions(cycleStart, cycleLength, periodDuration);
        Object.keys(predictions).forEach((date) => {
            markings[date] = {
                ...(markings[date] || {}),
                ...predictions[date],
            };
        });

        const startTime = new Date(cycleStart).getTime();
        for (let i = 0; i < cycleLength; i++) {
            const d = new Date(startTime + i * msPerDay);
            const ds = d.toISOString().split("T")[0];
            const phase = getCyclePhase(cycleStart, ds, cycleLength, periodDuration);

            // Apply base phase coloring
            if (!markings[ds] || !markings[ds].color) { // Don't overwrite explicit prediction colors
                markings[ds] = {
                    ...(markings[ds] || {}),
                    color: getPhaseColor(phase),
                    textColor: "#fff",
                    startingDay: i === 0,
                    endingDay: i === cycleLength - 1,
                };
            }

            if (!markings[ds].dots) {
                markings[ds].dots = [];
            }
            if (phase === "Ovulation (Fertile Window)") {
                markings[ds].dots.push({ key: "ovulation", color: "#00bcd4" });
            }
        }
    }


    // Mark logged days with black dot regardless of mode
    Object.keys(logs).forEach(ds => {
        if (logs[ds]) {
            if (!markings[ds]) markings[ds] = {dots: []};
            if (!markings[ds].dots) markings[ds].dots = [];
            if (!markings[ds].dots.some(dot => dot.key === "log")) {
                markings[ds].dots.push({ key: "log", color: "#000" });
            }
        }
    });

    // Mark the user's due date with a special dot and text style when in PregnantMode
    if (goal === "PregnantMode" && userDueDate) {
        if (!markings[userDueDate]) markings[userDueDate] = { dots: [] };
        if (!markings[userDueDate].dots) markings[userDueDate].dots = [];
        // Add a distinct dot for the due date
        if (!markings[userDueDate].dots.some(dot => dot.key === "dueDate")) {
            markings[userDueDate].dots.push({ key: "dueDate", color: "#4CAF50", selectedDotColor: '#fff' }); // Green dot for due date
        }
        // Make due date text bold and ensure good contrast
        markings[userDueDate] = {
            ...markings[userDueDate],
            textStyle: { fontWeight: 'bold', color: markings[userDueDate]?.textColor || '#000' } 
        };
    }

    // Highlight selected date (this should always override other markings for clarity)
    if (markings[selectedDate]) {
      markings[selectedDate] = {
        ...markings[selectedDate],
        selected: true,
        selectedColor: "#ff4081",
        textColor: "#fff",
      };
    } else {
      markings[selectedDate] = {
        selected: true,
        selectedColor: "#ff4081",
      };
    }

    return markings;
  };

  // Discreet mode masking
  const displayText = (text) => (discreetMode ? "●●●●●" : text);

  // Analytics data for chart
  const getGraphData = () => {
    let categories = [];
    let colorMap = {};

    if (goal === "PregnantMode") {
      categories = [
        "pregSymptoms",
        "pregWeight",
        "mood",
        "energy",
        "doctorVisit",
        "note" // Include note to count notes
      ];
      colorMap = {
        pregSymptoms: "#f44336",
        pregWeight: "#9c27b0",
        mood: "#2196f3",
        energy: "#ff9800",
        doctorVisit: "#4caf50",
        note: "#795548", // Color for notes
      };
    } else { // None or Pregnancy (TTC)
      categories = [
        "symptoms",
        "activity",
        "birthControl",
        "sexDrive",
        "mood",
        "energy",
        "basalTemp",
        "note" // Also include note for non-pregnant mode
      ];
      colorMap = {
        symptoms: "#f44336",
        activity: "#2196f3",
        birthControl: "#4caf50",
        sexDrive: "#ff9800",
        mood: "#9c27b0",
        energy: "#795548",
        basalTemp: "#ff5722",
        note: "#757575", // Different color for non-pregnant notes
      };
    }

    const logDates = Object.keys(logs).sort();

    // Determine if the chart should be a frequency (bar-like) or time-series (line) chart for single filter types
    const isTimeSeriesFilter = filterType === "basalTemp" || filterType === "pregWeight";

    if (filterType !== "all") {
      const dataPoints = {}; // Stores {date: value} for time series, or {item: count} for frequency
      let labels = []; // Will store dates or item names

      logDates.forEach((date) => {
        const val = logs[date][filterType];

        if (isTimeSeriesFilter) {
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            dataPoints[date] = numVal;
          }
        } else if (Array.isArray(val)) {
          val.forEach((item) => {
            dataPoints[item] = (dataPoints[item] || 0) + 1;
          });
        } else if (typeof val === "string" && val.trim()) {
          // For 'note' or other single string entries, count presence
          dataPoints[val] = (dataPoints[val] || 0) + 1;
        }
      });

      // Handle labels for single filter types
      if (isTimeSeriesFilter) {
        const allDates = Object.keys(dataPoints);
        const maxLabels = 7; // Max labels to show on X-axis for readability
        const interval = Math.max(1, Math.ceil(allDates.length / maxLabels));
        labels = allDates.filter((_, i) => i % interval === 0).map(d => d.slice(5).replace('-', '/')); // Format MM/DD
      } else {
        // For frequency charts (symptoms, activity, mood, energy, doctorVisit, notes), labels are the items themselves
        // We need to collect all unique items from the logs for the specific filterType
        const uniqueItems = new Set<string>();
        logDates.forEach(date => {
            const val = logs[date][filterType];
            if (Array.isArray(val)) {
                val.forEach(item => uniqueItems.add(item));
            } else if (typeof val === 'string' && val.trim()) {
                uniqueItems.add(val);
            }
        });
        labels = Array.from(uniqueItems).sort();
        // Recalculate data points based on these sorted unique labels for the chart.
        // This ensures that the data array matches the sorted labels.
        const datasetData = labels.map(label => {
            let count = 0;
            logDates.forEach(date => {
                const val = logs[date][filterType];
                if (Array.isArray(val) && val.includes(label)) {
                    count++;
                } else if (typeof val === 'string' && val.trim() === label) {
                    count++;
                }
            });
            return count;
        });

        return {
            labels: labels,
            datasets: [{
                data: datasetData,
                color: () => colorMap[filterType] || "#000",
            }]
        };
      }
      
      return {
        labels: labels,
        datasets: [
          {
            data: isTimeSeriesFilter ? Object.values(dataPoints) : labels.map(label => dataPoints[label] || 0),
            color: () => colorMap[filterType] || "#000",
          },
        ],
      };
    }

    // For 'all' filter:
    const allLabels = logDates.map((d) => d.slice(5).replace('-', '/')); // Format MM/DD for X-axis dates

    // Implement sampling for 'all' filter labels
    const maxLabelsForAll = 10; // More labels for 'all' since multiple lines
    const intervalForAll = Math.max(1, Math.ceil(allLabels.length / maxLabelsForAll));
    const sampledLabels = allLabels.filter((_, i) => i % intervalForAll === 0);

    const datasets = categories.map((cat) => ({
      data: logDates.map((date) => {
        const val = logs[date][cat];
        if (cat === "basalTemp" || cat === "pregWeight") {
          return parseFloat(val) || 0; // Numeric value for temperatures/weights
        }
        if (Array.isArray(val)) return val.length; // Count of items in array (symptoms, activities, pregSymptoms)
        if (typeof val === "string" && val.trim()) return 1; // Presence of single-value items (mood, energy, sexDrive, birthControl, doctorVisit, note)
        return 0;
      }),
      color: () => colorMap[cat],
      strokeWidth: 2,
    }));

    return {
      labels: sampledLabels, // Use sampled labels here
      datasets,
      legend: categories.map((cat) => {
        // Nicer labels for legend
        if (cat === 'pregSymptoms') return 'Pregnancy Symptoms';
        if (cat === 'pregWeight') return 'Weight';
        if (cat === 'doctorVisit') return 'Doctor Visit';
        if (cat === 'birthControl') return 'Birth Control';
        if (cat === 'sexDrive') return 'Sex Drive';
        if (cat === 'basalTemp') return 'Basal Temperature';
        return cat.charAt(0).toUpperCase() + cat.slice(1);
      }),
    };
  };

  // Current phase bar
  const dayIndex = Math.floor(
    (new Date(selectedDate).getTime() - new Date(cycleStart).getTime()) / msPerDay
  );
  const currentPhase = getCyclePhase(cycleStart, selectedDate, cycleLength, periodDuration);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Phase Bar */}
      <View
        style={[
          styles.phaseBar,
          { backgroundColor: goal === "PregnantMode" ? "#c2185b" : getPhaseColor(currentPhase) },
        ]}
      >
        <Text style={styles.phaseBarText}>
          {goal === "PregnantMode"
            ? `💖 Pregnant! Week ${weeksPregnant !== null ? weeksPregnant : 'N/A'}`
            : `Day ${dayIndex + 1} - ${currentPhase}`}
        </Text>
      </View>
      {/* DPO Tracker (only for TTC mode) */}
      {goal === "Pregnancy" &&
        (() => {
          const cycleDay = (dayIndex % cycleLength) + 1;
          const ovulationDay = cycleLength - 14 + 1;

          if (cycleDay > ovulationDay) {
            const dpo = cycleDay - ovulationDay;
            return (
              <Text style={[styles.phaseBarText, { marginBottom: 4 }]}>
                🍼 {dpo} DPO –{" "}
                {dpo >= 10
                  ? "You can test soon!"
                  : "Still early – hang in there 💕"}
              </Text>
            );
          }
          return null;
        })()}

      <ScrollView style={styles.container}>
        {/* Cycle Start Date / Due Date Button */}
        <TouchableOpacity
          style={styles.cycleStartBtn}
          onPress={() => setShowStartDateModal(true)}
        >
          <Text style={styles.cycleStartBtnText}>
            {goal === "PregnantMode"
              ? `🤰 Due Date: ${userDueDate || 'Not Set'}`
              : goal === "Pregnancy"
              ? `🌸 TTC Cycle Start: ${cycleStart}`
              : `Cycle Start: ${cycleStart}`}
          </Text>
        </TouchableOpacity>
        <Modal
          visible={showStartDateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStartDateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.popupWrapper}>
              <View style={styles.popupContainer}>
                <Text style={styles.modalTitle}>
                  {goal === "PregnantMode" ? "Select Due Date" : "Select Cycle Start Date"}
                </Text>

                <Calendar
                  onDayPress={(day) => {
                    if (goal === "PregnantMode") {
                      setUserDueDate(day.dateString);
                    } else {
                      setCycleStart(day.dateString);
                    }
                    setShowStartDateModal(false);
                  }}
                  markedDates={{
                    [goal === "PregnantMode" ? userDueDate : cycleStart]: {
                      selected: true,
                      selectedColor: "#c2185b",
                      textColor: "#fff",
                    },
                  }}
                  theme={{
                    todayTextColor: "#c2185b",
                    arrowColor: "#c2185b",
                  }}
                />

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={() => setShowStartDateModal(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Calendar */}
        <Calendar
          markingType="period"
          markedDates={getMarkedDates()}
          onDayPress={(day) => openLogModalForDate(day.dateString)}
          theme={{
            todayTextColor: "#c2185b",
            arrowColor: "#c2185b",
            textDayFontWeight: "bold",
          }}
        />

        {/* Predictions (only if not in PregnantMode) */}
        {cycleStart && goal !== "PregnantMode" && (
          <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ fontWeight: "600", fontSize: 16, marginBottom: 6 }}>
              Upcoming Predictions
            </Text>
            <Text style={{ color: "#444" }}>
              {(() => {
                const start = new Date(cycleStart);
                const nextPeriodStart = new Date(start);
                nextPeriodStart.setDate(start.getDate() + cycleLength);
                const nextPeriodEnd = new Date(nextPeriodStart);
                nextPeriodEnd.setDate(nextPeriodStart.getDate() + periodDuration - 1);

                const ovulation = new Date(nextPeriodStart);
                ovulation.setDate(ovulation.getDate() - 14);

                const fertileStart = new Date(ovulation);
                fertileStart.setDate(ovulation.getDate() - 5);

                const format = (d) =>
                  d.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  });

                if (goal === "Pregnancy") {
                  return `🩷 Best days to try: ${format(fertileStart)} – ${format(
                    ovulation
                  )}\n🩷 Predicted ovulation: ${format(
                    ovulation
                  )}\n🩷 Next period (if not pregnant 🤞): ${format(
                    nextPeriodStart
                  )} – ${format(nextPeriodEnd)}`;
                } else {
                  return `Next period: ${format(nextPeriodStart)} – ${format(
                    nextPeriodEnd
                  )}\nOvulation: ${format(
                    ovulation
                  )}\nFertile window: ${format(fertileStart)} – ${format(ovulation)}`;
                }
              })()}
            </Text>
          </View>
        )}

        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {goal === "PregnantMode"
              ? `Your Pregnancy Summary - ${selectedDate}`
              : `Daily Summary - ${selectedDate}`}
          </Text>

          {/* Pregnancy Facts */}
          {goal === "PregnantMode" && weeksPregnant !== null && babyFact && (
            <Text style={[styles.summaryItem, { color: '#c2185b', fontWeight: 'bold' }]}>
              👶 Your baby is about the size of a {displayText(babyFact.size)}! {displayText(babyFact.fact)}
            </Text>
          )}

          {logs[selectedDate] ? (
            <>
              {goal !== "PregnantMode" && logs[selectedDate].symptoms?.length > 0 && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="favorite" size={16} /> Symptoms: {displayText(logs[selectedDate].symptoms.join(", "))}
                </Text>
              )}
              {logs[selectedDate].activity?.length > 0 && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="group" size={16} /> Activity: {displayText(logs[selectedDate].activity.join(", "))}
                </Text>
              )}
              {goal !== "PregnantMode" && logs[selectedDate].birthControl?.length > 0 && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="medication" size={16} /> Birth Control: {displayText(logs[selectedDate].birthControl.join(", "))}
                </Text>
              )}
              {logs[selectedDate].sexDrive && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="local-fire-department" size={16} /> Sex Drive: {displayText(logs[selectedDate].sexDrive)}
                </Text>
              )}
              {logs[selectedDate].mood && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="mood" size={16} /> Mood: {displayText(logs[selectedDate].mood)}
                </Text>
              )}
              {logs[selectedDate].energy && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="bolt" size={16} /> Energy: {displayText(logs[selectedDate].energy)}
                </Text>
              )}
              {logs[selectedDate].note && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="notes" size={16} /> Note: {displayText(logs[selectedDate].note)}
                </Text>
              )}
              {goal === "Pregnancy" && logs[selectedDate]?.cervicalMucus && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="opacity" size={16} /> Mucus: {displayText(logs[selectedDate].cervicalMucus)}
                </Text>
              )}
              {goal === "Pregnancy" && logs[selectedDate]?.basalTemp && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="device-thermostat" size={16} /> BBT: {displayText(logs[selectedDate].basalTemp + "°C")}
                </Text>
              )}
              {goal === "Pregnancy" && logs[selectedDate]?.lhTest && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="science" size={16} /> LH Test: {displayText(logs[selectedDate].lhTest)}
                </Text>
              )}
              {goal !== "PregnantMode" && logs[selectedDate].pregnancyTest && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="pregnant-woman" size={16} /> Pregnancy Test:{" "}
                  {logs[selectedDate].pregnancyTest === "Positive"
                    ? "💖 Positive"
                    : logs[selectedDate].pregnancyTest === "Negative"
                      ? "Negative – Don’t give up 💕"
                      : logs[selectedDate].pregnancyTest}
                </Text>
              )}

              {/* Pregnancy-specific summary items */}
              {goal === "PregnantMode" && logs[selectedDate]?.pregWeight && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="line-weight" size={16} /> Weight: {displayText(logs[selectedDate].pregWeight)} kg
                </Text>
              )}
              {goal === "PregnantMode" && logs[selectedDate]?.doctorVisit && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="medical-services" size={16} /> Doctor Visit: {displayText(logs[selectedDate].doctorVisit)}
                </Text>
              )}
              {goal === "PregnantMode" && logs[selectedDate].pregSymptoms?.length > 0 && (
                <Text style={styles.summaryItem}>
                  <MaterialIcons name="sick" size={16} /> Pregnancy Symptoms: {displayText(logs[selectedDate].pregSymptoms.join(", "))}
                </Text>
              )}

              {getCyclePredictions(cycleStart, cycleLength, periodDuration)[selectedDate]?.customLabel && goal !== "PregnantMode" && (
                <Text style={[styles.summaryItem, { color: '#c2185b', fontStyle: 'italic' }]}>
                  🔮 {getCyclePredictions(cycleStart, cycleLength, periodDuration)[selectedDate].customLabel}
                </Text>
              )}
            </>
          ) : (
            <Text>No logs for this day</Text>
          )}

        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.settingsButton]}
            onPress={() => setPeriodSettingsVisible(true)}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.analyticsButton]}
            onPress={() => {
                // When opening analytics, ensure filterType is sensible for the current goal
                if (goal === "PregnantMode" && !['pregSymptoms', 'pregWeight', 'mood', 'energy', 'doctorVisit', 'note'].includes(filterType)) {
                    setFilterType("pregSymptoms"); // Default for pregnant mode
                } else if (goal !== "PregnantMode" && !['symptoms', 'activity', 'birthControl', 'sexDrive', 'mood', 'energy', 'basalTemp', 'note'].includes(filterType)) {
                    setFilterType("symptoms"); // Default for non-pregnant mode
                }
                setAnalyticsVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={logModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setLogModalVisible(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.popupWrapper}>
            <ScrollView
              style={styles.popupContainer}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.modalTitle}>Log for {selectedDate}</Text>

              {/* General inputs (Symptoms, Activity, Sex Drive, Mood, Energy, Note) */}
              {goal !== "PregnantMode" && (
                <>
                  <Text style={styles.label}>Symptoms</Text>
                  <View style={styles.optionsRow}>
                    {symptomOptions.map((symptom) => (
                      <TouchableOpacity
                        key={symptom}
                        style={[
                          styles.option,
                          symptoms.includes(symptom) && styles.optionSelected,
                        ]}
                        onPress={() => toggleSelection(symptom, symptoms, setSymptoms)}
                      >
                        <Text
                          style={
                            symptoms.includes(symptom) ? styles.optTextSel : styles.optText
                          }
                        >
                          {symptom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Sexual Activity</Text>
              <View style={styles.optionsRow}>
                {["Protected", "Unprotected", "None"].map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.option,
                      activity.includes(act) && styles.optionSelected,
                    ]}
                    onPress={() => toggleSelection(act, activity, setActivity)}
                  >
                    <Text
                      style={activity.includes(act) ? styles.optTextSel : styles.optText}
                    >
                      {act}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hide Birth Control for PregnantMode */}
              {goal !== "PregnantMode" && (
                <>
                  <Text style={styles.label}>Birth Control Taken</Text>
                  <View style={styles.optionsRow}>
                    {birthControlOptions.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.option,
                          birthControl.includes(item) && styles.optionSelected,
                        ]}
                        onPress={() => toggleSelection(item, birthControl, setBirthControl)}
                      >
                        <Text
                          style={
                            birthControl.includes(item) ? styles.optTextSel : styles.optText
                          }
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Sex Drive</Text>
              <Picker
                selectedValue={sexDrive}
                onValueChange={setSexDrive}
                style={styles.picker}
              >
                {sexDriveOptions.map((opt) => (
                  <Picker.Item key={opt} label={opt || "None"} value={opt} />
                ))}
              </Picker>

              <Text style={styles.label}>Mood</Text>
              <TextInput
                style={styles.note}
                placeholder="Describe your mood"
                value={mood}
                onChangeText={setMood}
              />

              <Text style={styles.label}>Energy</Text>
              <TextInput
                style={styles.note}
                placeholder="Describe your energy"
                value={energy}
                onChangeText={setEnergy}
              />

              {/* Fertility-specific inputs (Cervical Mucus, BBT, LH Test, Pregnancy Test) */}
              {goal === "Pregnancy" && (
                <>
                  <Text style={styles.label}>Cervical Mucus</Text>
                  <Picker
                    selectedValue={cervicalMucus}
                    onValueChange={setCervicalMucus}
                    style={styles.picker}
                  >
                    <Picker.Item label="None" value="" />
                    <Picker.Item label="Dry" value="Dry" />
                    <Picker.Item label="Sticky" value="Sticky" />
                    <Picker.Item label="Creamy" value="Creamy" />
                    <Picker.Item label="Egg White" value="Egg White" />
                    <Picker.Item label="Watery" value="Watery" />
                  </Picker>

                  <Text style={styles.label}>Basal Body Temperature (°C)</Text>
                  <TextInput
                    style={styles.note}
                    placeholder="e.g. 36.55"
                    keyboardType="numeric"
                    value={basalTemp}
                    onChangeText={setBasalTemp}
                  />

                  <Text style={styles.label}>LH Test</Text>
                  <Picker
                    selectedValue={lhTest}
                    onValueChange={setLhTest}
                    style={styles.picker}
                  >
                    <Picker.Item label="Not Taken" value="" />
                    <Picker.Item label="Negative" value="Negative" />
                    <Picker.Item label="Positive" value="Positive" />
                  </Picker>
                  <Text style={styles.label}>Pregnancy Test</Text>
                  <Picker
                    selectedValue={pregnancyTest}
                    onValueChange={setPregnancyTest}
                    style={styles.picker}
                  >
                    <Picker.Item label="Not Taken" value="" />
                    <Picker.Item label="Negative" value="Negative" />
                    <Picker.Item label="Positive" value="Positive" />
                  </Picker>
                </>
              )}

              {/* Pregnancy-specific log inputs (Weight, Doctor Visit, Pregnancy Symptoms) */}
              {goal === "PregnantMode" && (
                <>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    style={styles.note}
                    placeholder="e.g. 65.2"
                    keyboardType="numeric"
                    value={pregWeight}
                    onChangeText={setPregWeight}
                  />

                  <Text style={styles.label}>Doctor Visit</Text>
                  <TextInput
                    style={styles.note}
                    placeholder="e.g. Routine check-up, Ultrasound"
                    value={doctorVisit}
                    onChangeText={setDoctorVisit}
                  />

                  <Text style={styles.label}>Pregnancy Symptoms</Text>
                  <View style={styles.optionsRow}>
                    {pregSymptomsOptions.map((symptom) => (
                      <TouchableOpacity
                        key={symptom}
                        style={[
                          styles.option,
                          pregSymptoms.includes(symptom) && styles.optionSelected,
                        ]}
                        onPress={() => toggleSelection(symptom, pregSymptoms, setPregSymptoms)}
                      >
                        <Text
                          style={
                            pregSymptoms.includes(symptom) ? styles.optTextSel : styles.optText
                          }
                        >
                          {symptom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Note */}
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.note, { height: 80 }]}
                multiline
                placeholder="Add any notes"
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveLogsForDate}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Period Settings Modal */}
      <Modal
        visible={periodSettingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupWrapper}>
            <ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Period Settings</Text>

              <Text style={styles.label}>Cycle Length (days)</Text>
              <TextInput
                style={styles.note}
                keyboardType="numeric"
                value={cycleLength.toString()}
                onChangeText={(t) => setCycleLength(parseInt(t) || 0)}
              />

              <Text style={styles.label}>Period Duration (days)</Text>
              <TextInput
                style={styles.note}
                keyboardType="numeric"
                value={periodDuration.toString()}
                onChangeText={(t) => setPeriodDuration(parseInt(t) || 0)}
              />

              <Text style={styles.label}>Fertility Goal</Text>
              <Picker selectedValue={goal} onValueChange={setGoal} style={styles.picker}>
                <Picker.Item label="None" value="None" />
                <Picker.Item label="Trying to Conceive" value="Pregnancy" />
                <Picker.Item label="Currently Pregnant" value="PregnantMode" />
              </Picker>

              {goal === "PregnantMode" && (
                <>
                  <Text style={styles.label}>Expected Due Date</Text>
                  <Calendar
                    onDayPress={(day) => {
                      setUserDueDate(day.dateString);
                    }}
                    markedDates={{
                      [userDueDate]: {
                        selected: true,
                        selectedColor: "#c2185b",
                        textColor: "#fff",
                      },
                    }}
                    theme={{
                      todayTextColor: "#c2185b",
                      arrowColor: "#c2185b",
                    }}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.option, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setDiscreetMode(!discreetMode)}
              >
                <MaterialIcons
                  name={discreetMode ? 'visibility-off' : 'visibility'}
                  size={24}
                  color={discreetMode ? '#c2185b' : '#444'}
                />
                <Text style={[styles.optText, { marginLeft: 8 }]}>
                  {discreetMode ? 'Discreet Mode Enabled' : 'Discreet Mode Disabled'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={() => setPeriodSettingsVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        visible={analyticsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalyticsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupWrapper}>
            <ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Analytics</Text>

              <Text style={styles.label}>Filter</Text>
              <Picker
                selectedValue={filterType}
                onValueChange={setFilterType}
                style={styles.picker}
              >
                <Picker.Item label="All" value="all" />
                {goal !== "PregnantMode" ? (
                  <>
                    <Picker.Item label="Symptoms" value="symptoms" />
                    <Picker.Item label="Activity" value="activity" />
                    <Picker.Item label="Birth Control" value="birthControl" />
                    <Picker.Item label="Sex Drive" value="sexDrive" />
                    <Picker.Item label="Mood" value="mood" />
                    <Picker.Item label="Energy" value="energy" />
                    <Picker.Item label="Basal Temperature" value="basalTemp" />
                    <Picker.Item label="Notes (Count)" value="note" /> {/* Added here for consistency */}
                  </>
                ) : (
                  <>
                    <Picker.Item label="Pregnancy Symptoms" value="pregSymptoms" />
                    <Picker.Item label="Weight" value="pregWeight" />
                    <Picker.Item label="Doctor Visit" value="doctorVisit" />
                    <Picker.Item label="Mood" value="mood" />
                    <Picker.Item label="Energy" value="energy" />
                    <Picker.Item label="Notes (Count)" value="note" />
                  </>
                )}
              </Picker>

              {/* Adjust line chart to be scrollable if needed or add more styling */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{width: screenWidth - 40}}>
                <LineChart
                    data={getGraphData()}
                    width={Math.max(screenWidth - 40, getGraphData().labels.length * 60)} // Dynamic width for horizontal scroll
                    height={filterType === "all" ? 300 : 220}
                    chartConfig={{
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      color: (opacity = 1, index) =>
                        getGraphData().datasets[index]?.color(opacity),
                      labelColor: () => "#000",
                      strokeWidth: 2,
                      useShadowColorFromDataset: false,
                      propsForBackgroundLines: {
                        strokeDasharray: "", // makes solid grid lines
                        strokeWidth: 1,
                        stroke: "#e0e0e0"
                      },
                      propsForLabels: {
                        fontSize: 10, // Smaller font for labels
                      }
                    }}
                    bezier
                    style={{ marginVertical: 16 }}
                    fromZero
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={() => setAnalyticsVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Initial Pregnancy Details Modal */}
      <Modal
        visible={initialPregnancyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInitialPregnancyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupWrapper}>
            <ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Congratulations! Tell us more:</Text>

              <Text style={styles.label}>How many weeks pregnant are you?</Text>
              <TextInput
                style={styles.note}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={tempWeeksPregnant}
                onChangeText={setTempWeeksPregnant}
              />
              <Text style={{ marginBottom: 15, color: '#666', fontSize: 12 }}>
                (We'll estimate your due date based on this.)
              </Text>

              <Text style={styles.label}>OR, select your estimated Due Date:</Text>
              <Calendar
                onDayPress={(day) => {
                  setSelectedDueDateInModal(day.dateString);
                  setTempWeeksPregnant(''); // Clear weeks input if due date selected directly
                }}
                markedDates={{
                  [selectedDueDateInModal]: {
                    selected: true,
                    selectedColor: "#c2185b",
                    textColor: "#fff",
                  },
                }}
                theme={{
                  todayTextColor: "#c2185b",
                  arrowColor: "#c2185b",
                }}
              />

              <TouchableOpacity
                style={[styles.button, styles.saveButton, { marginTop: 20 }]}
                onPress={handleInitialPregnancyDetailsSave}
                // Disable if no valid input is provided
                disabled={(!tempWeeksPregnant || isNaN(parseInt(tempWeeksPregnant))) && !selectedDueDateInModal}
              >
                <Text style={styles.buttonText}>Confirm Pregnancy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#999', marginTop: 10 }]}
                onPress={() => setInitialPregnancyModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Positive Pregnancy Test Congratulatory Modal (Now triggered AFTER details are saved) */}
      <Modal
        visible={positiveTestCongratsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPositiveTestCongratsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupWrapper}>
            <View style={styles.popupContainer}>
              <Text style={styles.modalTitle}>🎉 Congratulations! 🎉</Text>
              <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
                It looks like you've logged a positive pregnancy test!
                The app is now in <Text style={{fontWeight: 'bold'}}>Pregnant Mode</Text>,
                and your tracking will adjust to support your pregnancy journey.
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={() => {
                  setPositiveTestCongratsModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Awesome!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}


const styles = StyleSheet.create({
  phaseBar: {
    paddingVertical: 10,
    alignItems: "center",
  },
  phaseBarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  summaryCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  summaryTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: "center",
  },
  settingsButton: {
    backgroundColor: "#c2185b",
  },
  analyticsButton: {
    backgroundColor: "#007aff",
  },
  saveButton: {
    backgroundColor: "#c2185b",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cycleStartBtn: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 10,
  },
  cycleStartBtnText: {
    fontWeight: "600",
    color: "#444",
  },
  label: {
    marginTop: 12,
    fontWeight: "600",
  },
  picker: {
    backgroundColor: "#f5f5f5",
    marginVertical: 8,
  },
  note: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
  },
  option: {
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  optionSelected: {
    backgroundColor: "#c2185b",
  },
  optText: {
    fontWeight: "600",
  },
  optTextSel: {
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  popupWrapper: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  popupContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6,
  },
});

function getCyclePredictions(
  cycleStart: string,
  cycleLength: number,
  periodDuration: number
) {
  const predictions: Record<
    string,
    { color?: string; textColor?: string; customLabel?: string; dots?: Array<any> }
  > = {};

  const nextPeriodStart = new Date(cycleStart);
  nextPeriodStart.setDate(nextPeriodStart.getDate() + cycleLength);

  for (let i = 0; i < periodDuration; i++) {
    const d = new Date(nextPeriodStart);
    d.setDate(nextPeriodStart.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    predictions[ds] = {
      color: "#e91e63",
      textColor: "#fff",
      customLabel: i === 0 ? "Next Period" : undefined,
    };
  }

  const ovulationDate = new Date(nextPeriodStart);
  ovulationDate.setDate(ovulationDate.getDate() - 14);

  for (let i = -5; i <= 0; i++) {
    const d = new Date(ovulationDate);
    d.setDate(ovulationDate.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    predictions[ds] = {
      ...(predictions[ds] || {}),
      color: "#80deea",
      textColor: "#000",
      customLabel: i === 0 ? "Ovulation (Predicted)" : "Fertile",
      dots: predictions[ds]?.dots || [],
    };
    if (i === 0) {
      predictions[ds].dots.push({ key: "predictedOvulation", color: "#00bcd4" });
    }
  }

  return predictions;
}