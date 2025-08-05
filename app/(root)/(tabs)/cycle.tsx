import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { BarChart, LineChart } from "react-native-chart-kit";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tinycolor from "tinycolor2";
import { useTheme } from "../../../app/context/ThemeContext";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS ---
const screenWidth = Dimensions.get("window").width;
const msPerDay = 86400000;
const PHASE_COLORS = { Menstruation: "#c2185b", Follicular: "#ffb3c1", Ovulation: "#00bcd4", Luteal: "#cdb4db", Default: "#e0e0e0", };
const symptomOptions = [ "Cramps", "Fatigue", "Headache", "Back Pain", "Nausea", "Mood Swings", ];
const sexDriveOptions = ["", "High", "Neutral", "Low"];
const birthControlOptions = [ "Pill Taken", "Missed Pill", "Injection", "IUD", "Implant", "Patch", "None", ];
const pregSymptomsOptions = [ "Morning Sickness", "Fatigue", "Breast Tenderness", "Frequent Urination", "Food Cravings", "Aversions", "Heartburn", "Swelling", "Backache", "Braxton Hicks", "Contractions", "Fetal Movement", "Pelvic Pressure", ];
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

// --- Utility Functions ---
function getCyclePhase(startDate, dateStr, cycleLength, periodDuration) { /* ... same as before ... */ if (!startDate) return "Not Tracked"; const delta = Math.floor((new Date(dateStr).getTime() - new Date(startDate).getTime()) / msPerDay); if (delta < 0) return "Future Date"; const cycleDay = (delta % cycleLength) + 1; const ovulationDay = cycleLength - 14; if (cycleDay <= periodDuration) return "Menstruation"; if (cycleDay <= ovulationDay) return "Follicular Phase"; if (cycleDay === ovulationDay + 1) return "Ovulation (Fertile Window)"; if (cycleDay <= cycleLength) return "Luteal Phase"; return "Awaiting New Cycle";}
const getPhaseColor = (phase: string) => { /* ... same as before ... */ switch (phase) { case "Menstruation": return PHASE_COLORS.Menstruation; case "Follicular Phase": return PHASE_COLORS.Follicular; case "Ovulation (Fertile Window)": return PHASE_COLORS.Ovulation; case "Luteal Phase": return PHASE_COLORS.Luteal; default: return PHASE_COLORS.Default; } };
const getCyclePredictions = ( cycleStart: string, cycleLength: number, periodDuration: number ) => { /* ... same as before ... */ const predictions: Record<string, any> = {}; const nextPeriodStart = new Date(cycleStart); nextPeriodStart.setDate(nextPeriodStart.getDate() + cycleLength); for (let i = 0; i < periodDuration; i++) { const d = new Date(nextPeriodStart); d.setDate(nextPeriodStart.getDate() + i); const ds = d.toISOString().split("T")[0]; predictions[ds] = { color: "#e91e63", textColor: "#fff", customLabel: i === 0 ? "Next Period" : undefined, }; } const ovulationDate = new Date(nextPeriodStart); ovulationDate.setDate(ovulationDate.getDate() - 14); for (let i = -5; i <= 0; i++) { const d = new Date(ovulationDate); d.setDate(ovulationDate.getDate() + i); const ds = d.toISOString().split("T")[0]; predictions[ds] = { ...(predictions[ds] || {}), color: "#80deea", textColor: "#000", customLabel: i === 0 ? "Ovulation (Predicted)" : "Fertile", dots: predictions[ds]?.dots || [], }; if (i === 0) { predictions[ds].dots.push({ key: "predictedOvulation", color: "#00bcd4" }); } } return predictions; };

export default function CycleTracker() {
  const { theme } = useTheme();
  const styles = getDynamicStyles(theme);
  const today = new Date().toISOString().split("T")[0];
  const [cycleStart, setCycleStart] = useState(today);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [discreetMode, setDiscreetMode] = useState(false);
  const [goal, setGoal] = useState("None"); 
  const [userDueDate, setUserDueDate] = useState("");
  const [logs, setLogs] = useState({});
  const [positiveTestCongratsModalVisible, setPositiveTestCongratsModalVisible] = useState(false);
  const [initialPregnancyModalVisible, setInitialPregnancyModalVisible] = useState(false);
  const [tempWeeksPregnant, setTempWeeksPregnant] = useState(''); 
  const [selectedDueDateInModal, setSelectedDueDateInModal] = useState(today);
  const [symptoms, setSymptoms] = useState([]);
  const [activity, setActivity] = useState([]);
  const [birthControl, setBirthControl] = useState([]);
  const [sexDrive, setSexDrive] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [note, setNote] = useState("");
  const [cervicalMucus, setCervicalMucus] = useState("");
  const [basalTemp, setBasalTemp] = useState("");
  const [lhTest, setLhTest] = useState("");
  const [pregnancyTest, setPregnancyTest] = useState("");
  const [pregWeight, setPregWeight] = useState("");
  const [doctorVisit, setDoctorVisit] = useState("");
  const [pregSymptoms, setPregSymptoms] = useState([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [periodSettingsVisible, setPeriodSettingsVisible] = useState(false);
  const [filterType, setFilterType] = useState(goal === "PregnantMode" ? "pregSymptoms" : "symptoms");

  let weeksPregnant = null;
  let babyFact = null;
  if (goal === "PregnantMode" && userDueDate) { const todayDate = new Date(); const dueDate = new Date(userDueDate); const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - todayDate.getTime()) / msPerDay)); weeksPregnant = Math.max(0, 40 - Math.floor(daysUntilDue / 7)); babyFact = pregnancyFacts[Math.floor(weeksPregnant)]; }
  const toggleSelection = (item, list, setFn) => setFn(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  const openLogModalForDate = (date) => { setSelectedDate(date); const dayLog = logs[date] || { symptoms: [], activity: [], birthControl: [], sexDrive: "", mood: "", energy: "", note: "", cervicalMucus: "", basalTemp: "", lhTest: "", pregnancyTest: "", pregWeight: "", doctorVisit: "", pregSymptoms: [], }; setSymptoms(dayLog.symptoms); setActivity(dayLog.activity); setBirthControl(dayLog.birthControl); setSexDrive(dayLog.sexDrive); setMood(dayLog.mood); setEnergy(dayLog.energy); setNote(dayLog.note); setCervicalMucus(dayLog.cervicalMucus || ""); setBasalTemp(dayLog.basalTemp || ""); setLhTest(dayLog.lhTest || ""); setPregnancyTest(dayLog.pregnancyTest || ""); setPregWeight(dayLog.pregWeight || ""); setDoctorVisit(dayLog.doctorVisit || ""); setPregSymptoms(dayLog.pregSymptoms || []); setLogModalVisible(true); };
  const handleInitialPregnancyDetailsSave = () => { let calculatedDueDate = null; if (tempWeeksPregnant) { const weeks = parseInt(tempWeeksPregnant, 10); if (!isNaN(weeks) && weeks >= 1 && weeks <= 40) { const todayDate = new Date(); const remainingDays = Math.max(0, (40 - weeks) * 7); const newDueDate = new Date(todayDate.getTime() + remainingDays * msPerDay); calculatedDueDate = newDueDate.toISOString().split("T")[0]; } } else if (selectedDueDateInModal) { calculatedDueDate = selectedDueDateInModal; } setUserDueDate(calculatedDueDate || today); setGoal("PregnantMode"); setFilterType("pregSymptoms"); setInitialPregnancyModalVisible(false); setPositiveTestCongratsModalVisible(true); };
  const saveLogsForDate = () => { const isPositiveTest = goal === "Pregnancy" && pregnancyTest === "Positive"; setLogs(prevLogs => ({ ...prevLogs, [selectedDate]: { symptoms, activity, birthControl, sexDrive, mood, energy, note, cervicalMucus, basalTemp, lhTest, pregnancyTest, pregWeight, doctorVisit, pregSymptoms, }, })); setLogModalVisible(false); if (isPositiveTest) { setInitialPregnancyModalVisible(true); setTempWeeksPregnant(''); setSelectedDueDateInModal(userDueDate || today); } };
  const getMarkedDates = () => { const markings = {}; if (goal !== "PregnantMode") { const startTime = new Date(cycleStart).getTime(); for (let i = 0; i < cycleLength * 2; i++) { const d = new Date(startTime + i * msPerDay); const ds = d.toISOString().split("T")[0]; const phase = getCyclePhase(cycleStart, ds, cycleLength, periodDuration); if (phase !== 'Not Tracked' && phase !== 'Future Date') { markings[ds] = { color: getPhaseColor(phase), startingDay: i % cycleLength === 0, endingDay: i % cycleLength === cycleLength - 1, textColor: theme.white, }; } } } Object.keys(logs).forEach(ds => { if (logs[ds]) { if (!markings[ds]) markings[ds] = {}; markings[ds].marked = true; markings[ds].dotColor = theme.textPrimary; } }); if (goal === "PregnantMode" && userDueDate) { markings[userDueDate] = { ...(markings[userDueDate] || {}), startingDay: true, endingDay: true, color: '#4CAF50' }; } if (markings[selectedDate]) { markings[selectedDate] = { ...markings[selectedDate], selected: true, selectedColor: theme.accent, }; } else { markings[selectedDate] = { selected: true, selectedColor: theme.accent, }; } return markings; };
  const getGraphData = () => { let categories = []; let colorMap = {}; if (goal === "PregnantMode") { categories = [ "pregSymptoms", "pregWeight", "mood", "energy", "doctorVisit", "note" ]; colorMap = { pregSymptoms: "#f44336", pregWeight: "#9c27b0", mood: "#2196f3", energy: "#ff9800", doctorVisit: "#4caf50", note: "#795548", }; } else { categories = [ "symptoms", "activity", "birthControl", "sexDrive", "mood", "energy", "basalTemp", "note" ]; colorMap = { symptoms: "#f44336", activity: "#2196f3", birthControl: "#4caf50", sexDrive: "#ff9800", mood: "#9c27b0", energy: "#795548", basalTemp: "#ff5722", note: "#757575", }; } const logDates = Object.keys(logs).sort(); const isTimeSeriesFilter = filterType === "basalTemp" || filterType === "pregWeight" || filterType === "all"; if (filterType !== "all") { const dataPoints = {}; let labels = []; logDates.forEach((date) => { const val = logs[date][filterType]; if (isTimeSeriesFilter) { const numVal = parseFloat(val); if (!isNaN(numVal)) { dataPoints[date] = numVal; } } else if (Array.isArray(val)) { val.forEach((item) => { dataPoints[item] = (dataPoints[item] || 0) + 1; }); } else if (typeof val === "string" && val.trim()) { dataPoints[val] = (dataPoints[val] || 0) + 1; } }); if (isTimeSeriesFilter) { const allDates = Object.keys(dataPoints); const maxLabels = 7; const interval = Math.max(1, Math.ceil(allDates.length / maxLabels)); labels = allDates.filter((_, i) => i % interval === 0).map(d => d.slice(5).replace('-', '/')); } else { const uniqueItems = new Set<string>(); logDates.forEach(date => { const val = logs[date][filterType]; if (Array.isArray(val)) { val.forEach(item => uniqueItems.add(item)); } else if (typeof val === 'string' && val.trim()) { uniqueItems.add(val); } }); labels = Array.from(uniqueItems).sort(); } const datasetData = labels.map(label => dataPoints[label] || 0); return { labels: labels, datasets: [{ data: datasetData.length > 0 ? datasetData : [0], color: () => colorMap[filterType] || "#000", }] }; } const allLabels = logDates.map((d) => d.slice(5).replace('-', '/')); const maxLabelsForAll = 10; const intervalForAll = Math.max(1, Math.ceil(allLabels.length / maxLabelsForAll)); const sampledLabels = allLabels.filter((_, i) => i % intervalForAll === 0); const datasets = categories.map((cat) => ({ data: logDates.map((date) => { const val = logs[date][cat]; if (cat === "basalTemp" || cat === "pregWeight") { return parseFloat(val) || 0; } if (Array.isArray(val)) return val.length; if (typeof val === "string" && val.trim()) return 1; return 0; }), color: () => colorMap[cat], strokeWidth: 2, })); return { labels: sampledLabels.length > 0 ? sampledLabels : [""], datasets, legend: categories.map((cat) => { if (cat === 'pregSymptoms') return 'Pregnancy Symptoms'; if (cat === 'pregWeight') return 'Weight'; if (cat === 'doctorVisit') return 'Doctor Visit'; if (cat === 'birthControl') return 'Birth Control'; if (cat === 'sexDrive') return 'Sex Drive'; if (cat === 'basalTemp') return 'Basal Temperature'; return cat.charAt(0).toUpperCase() + cat.slice(1); }), };};
  
  const displayText = (text) => (discreetMode ? "●●●●●" : text);
  const dayIndex = Math.floor((new Date(selectedDate).getTime() - new Date(cycleStart).getTime()) / msPerDay);
  const currentPhase = getCyclePhase(cycleStart, selectedDate, cycleLength, periodDuration);
  const calendarTheme = { backgroundColor: theme.background, calendarBackground: theme.surface, textSectionTitleColor: theme.textSecondary, selectedDayBackgroundColor: theme.accent, selectedDayTextColor: tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary, todayTextColor: theme.primary, dayTextColor: theme.textPrimary, textDisabledColor: theme.border, dotColor: theme.textPrimary, selectedDotColor: theme.white, arrowColor: theme.primary, monthTextColor: theme.textPrimary, textDayFontWeight: "bold", textMonthFontWeight: 'bold', textDayHeaderFontWeight: 'normal', };
  const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
  const onAccentColor = tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary;
  const isChartTimeSeries = filterType === 'basalTemp' || filterType === 'pregWeight' || filterType === 'all';
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.phaseBar, { backgroundColor: goal === "PregnantMode" ? theme.accent : getPhaseColor(currentPhase) }]}>
        <Text style={[styles.phaseBarText, {color: tinycolor(goal === "PregnantMode" ? theme.accent : getPhaseColor(currentPhase)).isDark() ? theme.white : theme.textPrimary}]}>
          {goal === "PregnantMode" ? `💖 Pregnant! Week ${weeksPregnant !== null ? weeksPregnant : 'N/A'}` : `Day ${dayIndex + 1} - ${currentPhase}`}
        </Text>
      </View>
      {goal === "Pregnancy" && (() => { const cycleDay = (dayIndex % cycleLength) + 1; const ovulationDay = cycleLength - 14 + 1; if (cycleDay > ovulationDay) { const dpo = cycleDay - ovulationDay; return ( <Text style={[styles.phaseBarText, styles.dpoText]}> 🍼 {dpo} DPO – {dpo >= 10 ? "You can test soon!" : "Still early – hang in there 💕"} </Text> ); } return null; })()}

      <ScrollView style={styles.contentScrollView}>
        <TouchableOpacity style={styles.cycleStartBtn} onPress={() => setShowStartDateModal(true)}><Text style={styles.cycleStartBtnText}>{goal === "PregnantMode" ? `🤰 Due Date: ${userDueDate || 'Not Set'}` : `Cycle Start: ${cycleStart}`}</Text></TouchableOpacity>
        <Calendar markingType="period" markedDates={getMarkedDates()} onDayPress={(day) => openLogModalForDate(day.dateString)} theme={calendarTheme}/>
        {cycleStart && goal !== "PregnantMode" && ( <View style={styles.predictionsCard}><Text style={styles.predictionsTitle}>Upcoming Predictions</Text><Text style={styles.predictionsText}>{(() => { const start = new Date(cycleStart); const nextPeriodStart = new Date(start); nextPeriodStart.setDate(start.getDate() + cycleLength); const nextPeriodEnd = new Date(nextPeriodStart); nextPeriodEnd.setDate(nextPeriodStart.getDate() + periodDuration - 1); const ovulation = new Date(nextPeriodStart); ovulation.setDate(ovulation.getDate() - 14); const fertileStart = new Date(ovulation); fertileStart.setDate(ovulation.getDate() - 5); const format = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", }); if (goal === "Pregnancy") { return `🩷 Best days to try: ${format(fertileStart)} – ${format(ovulation)}\n🩷 Predicted ovulation: ${format(ovulation)}\n🩷 Next period (if not pregnant 🤞): ${format(nextPeriodStart)} – ${format(nextPeriodEnd)}`; } else { return `Next period: ${format(nextPeriodStart)} – ${format(nextPeriodEnd)}\nOvulation: ${format(ovulation)}\nFertile window: ${format(fertileStart)} – ${format(ovulation)}`; } })()}</Text></View> )}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{goal === "PregnantMode" ? `Your Pregnancy Summary - ${selectedDate}` : `Daily Summary - ${selectedDate}`}</Text>
          {goal === "PregnantMode" && weeksPregnant !== null && babyFact && ( <Text style={[styles.summaryItem, { color: theme.primary, fontWeight: 'bold' }]}> 👶 Your baby is about the size of a {displayText(babyFact.size)}! {displayText(babyFact.fact)} </Text> )}
          {logs[selectedDate] ? ( <>
              {goal !== "PregnantMode" && logs[selectedDate].symptoms?.length > 0 && ( <Text style={styles.summaryItem}><MaterialIcons name="favorite" size={16} color={theme.textSecondary}/> Symptoms: {displayText(logs[selectedDate].symptoms.join(", "))}</Text> )}
              {logs[selectedDate].activity?.length > 0 && ( <Text style={styles.summaryItem}><MaterialIcons name="group" size={16} color={theme.textSecondary}/> Activity: {displayText(logs[selectedDate].activity.join(", "))}</Text> )}
              {goal !== "PregnantMode" && logs[selectedDate].birthControl?.length > 0 && ( <Text style={styles.summaryItem}><MaterialIcons name="medication" size={16} color={theme.textSecondary}/> Birth Control: {displayText(logs[selectedDate].birthControl.join(", "))}</Text> )}
              {logs[selectedDate].sexDrive && ( <Text style={styles.summaryItem}><MaterialIcons name="local-fire-department" size={16} color={theme.textSecondary}/> Sex Drive: {displayText(logs[selectedDate].sexDrive)}</Text> )}
              {logs[selectedDate].mood && ( <Text style={styles.summaryItem}><MaterialIcons name="mood" size={16} color={theme.textSecondary}/> Mood: {displayText(logs[selectedDate].mood)}</Text> )}
              {logs[selectedDate].energy && ( <Text style={styles.summaryItem}><MaterialIcons name="bolt" size={16} color={theme.textSecondary}/> Energy: {displayText(logs[selectedDate].energy)}</Text> )}
              {logs[selectedDate].note && ( <Text style={styles.summaryItem}><MaterialIcons name="notes" size={16} color={theme.textSecondary}/> Note: {displayText(logs[selectedDate].note)}</Text> )}
              {goal === "Pregnancy" && logs[selectedDate]?.cervicalMucus && ( <Text style={styles.summaryItem}><MaterialIcons name="opacity" size={16} color={theme.textSecondary}/> Mucus: {displayText(logs[selectedDate].cervicalMucus)}</Text> )}
              {goal === "Pregnancy" && logs[selectedDate]?.basalTemp && ( <Text style={styles.summaryItem}><MaterialIcons name="device-thermostat" size={16} color={theme.textSecondary}/> BBT: {displayText(logs[selectedDate].basalTemp + "°C")}</Text> )}
              {goal === "Pregnancy" && logs[selectedDate]?.lhTest && ( <Text style={styles.summaryItem}><MaterialIcons name="science" size={16} color={theme.textSecondary}/> LH Test: {displayText(logs[selectedDate].lhTest)}</Text> )}
              {goal !== "PregnantMode" && logs[selectedDate].pregnancyTest && ( <Text style={styles.summaryItem}><MaterialIcons name="pregnant-woman" size={16} color={theme.textSecondary}/> Pregnancy Test: {logs[selectedDate].pregnancyTest === "Positive" ? "💖 Positive" : logs[selectedDate].pregnancyTest === "Negative" ? "Negative – Don’t give up 💕" : logs[selectedDate].pregnancyTest}</Text> )}
              {goal === "PregnantMode" && logs[selectedDate]?.pregWeight && ( <Text style={styles.summaryItem}><MaterialIcons name="line-weight" size={16} color={theme.textSecondary}/> Weight: {displayText(logs[selectedDate].pregWeight)} kg</Text> )}
              {goal === "PregnantMode" && logs[selectedDate]?.doctorVisit && ( <Text style={styles.summaryItem}><MaterialIcons name="medical-services" size={16} color={theme.textSecondary}/> Doctor Visit: {displayText(logs[selectedDate].doctorVisit)}</Text> )}
              {goal === "PregnantMode" && logs[selectedDate].pregSymptoms?.length > 0 && ( <Text style={styles.summaryItem}><MaterialIcons name="sick" size={16} color={theme.textSecondary}/> Pregnancy Symptoms: {displayText(logs[selectedDate].pregSymptoms.join(", "))}</Text> )}
              {getCyclePredictions(cycleStart, cycleLength, periodDuration)[selectedDate]?.customLabel && goal !== "PregnantMode" && ( <Text style={[styles.summaryItem, { color: theme.primary, fontStyle: 'italic' }]}>🔮 {getCyclePredictions(cycleStart, cycleLength, periodDuration)[selectedDate].customLabel}</Text> )}
            </>
          ) : ( <Text style={styles.summaryItem}>No logs for this day</Text> )}
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.settingsButton]} onPress={() => setPeriodSettingsVisible(true)}><Ionicons name="options-outline" size={20} color={onPrimaryColor} /><Text style={[styles.actionButtonText, {color: onPrimaryColor}]}>Settings</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.analyticsButton]} onPress={() => { if (goal === "PregnantMode" && !['pregSymptoms', 'pregWeight', 'mood', 'energy', 'doctorVisit', 'note'].includes(filterType)) { setFilterType("pregSymptoms"); } else if (goal !== "PregnantMode" && !['symptoms', 'activity', 'birthControl', 'sexDrive', 'mood', 'energy', 'basalTemp', 'note'].includes(filterType)) { setFilterType("symptoms"); } setAnalyticsVisible(true); }}><Ionicons name="bar-chart-outline" size={20} color={onAccentColor} /><Text style={[styles.actionButtonText, {color: onAccentColor}]}>Analytics</Text></TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showStartDateModal} transparent animationType="fade" onRequestClose={() => setShowStartDateModal(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><View style={styles.popupContainer}><Text style={styles.modalTitle}>{goal === "PregnantMode" ? "Select Due Date" : "Select Cycle Start Date"}</Text><Calendar onDayPress={(day) => { if (goal === "PregnantMode") { setUserDueDate(day.dateString); } else { setCycleStart(day.dateString); } setShowStartDateModal(false); }} markedDates={{ [goal === "PregnantMode" ? userDueDate : cycleStart]: { selected: true, selectedColor: theme.primary }, }} theme={calendarTheme}/><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => setShowStartDateModal(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity></View></View></View></Modal>
      <Modal visible={logModalVisible} transparent animationType="fade" onRequestClose={() => setLogModalVisible(false)}><View style={styles.modalOverlay}><TouchableWithoutFeedback onPress={() => setLogModalVisible(false)}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}><Text style={styles.modalTitle}>Log for {selectedDate}</Text>{goal !== "PregnantMode" && ( <><Text style={styles.label}>Symptoms</Text><View style={styles.optionsRow}>{symptomOptions.map((symptom) => ( <TouchableOpacity key={symptom} style={[ styles.option, symptoms.includes(symptom) && styles.optionSelected, ]} onPress={() => toggleSelection(symptom, symptoms, setSymptoms)}><Text style={ symptoms.includes(symptom) ? styles.optTextSel : styles.optText }>{symptom}</Text></TouchableOpacity> ))}</View></> )}<Text style={styles.label}>Sexual Activity</Text><View style={styles.optionsRow}>{["Protected", "Unprotected", "None"].map((act) => ( <TouchableOpacity key={act} style={[ styles.option, activity.includes(act) && styles.optionSelected, ]} onPress={() => toggleSelection(act, activity, setActivity)}><Text style={activity.includes(act) ? styles.optTextSel : styles.optText}>{act}</Text></TouchableOpacity> ))}</View>{goal !== "PregnantMode" && ( <><Text style={styles.label}>Birth Control Taken</Text><View style={styles.optionsRow}>{birthControlOptions.map((item) => ( <TouchableOpacity key={item} style={[ styles.option, birthControl.includes(item) && styles.optionSelected, ]} onPress={() => toggleSelection(item, birthControl, setBirthControl)}><Text style={ birthControl.includes(item) ? styles.optTextSel : styles.optText }>{item}</Text></TouchableOpacity> ))}</View></> )}<Text style={styles.label}>Sex Drive</Text><Picker selectedValue={sexDrive} onValueChange={setSexDrive} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item key={""} label={"None"} value={""} />{sexDriveOptions.slice(1).map((opt) => ( <Picker.Item key={opt} label={opt} value={opt} /> ))}</Picker><Text style={styles.label}>Mood</Text><TextInput style={styles.note} placeholder="Describe your mood" value={mood} onChangeText={setMood} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>Energy</Text><TextInput style={styles.note} placeholder="Describe your energy" value={energy} onChangeText={setEnergy} placeholderTextColor={theme.textSecondary} />{goal === "Pregnancy" && ( <><Text style={styles.label}>Cervical Mucus</Text><Picker selectedValue={cervicalMucus} onValueChange={setCervicalMucus} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="None" value="" /><Picker.Item label="Dry" value="Dry" /><Picker.Item label="Sticky" value="Sticky" /><Picker.Item label="Creamy" value="Creamy" /><Picker.Item label="Egg White" value="Egg White" /><Picker.Item label="Watery" value="Watery" /></Picker><Text style={styles.label}>Basal Body Temperature (°C)</Text><TextInput style={styles.note} placeholder="e.g. 36.55" keyboardType="numeric" value={basalTemp} onChangeText={setBasalTemp} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>LH Test</Text><Picker selectedValue={lhTest} onValueChange={setLhTest} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="Not Taken" value="" /><Picker.Item label="Negative" value="Negative" /><Picker.Item label="Positive" value="Positive" /></Picker><Text style={styles.label}>Pregnancy Test</Text><Picker selectedValue={pregnancyTest} onValueChange={setPregnancyTest} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="Not Taken" value="" /><Picker.Item label="Negative" value="Negative" /><Picker.Item label="Positive" value="Positive" /></Picker></> )}{goal === "PregnantMode" && ( <><Text style={styles.label}>Weight (kg)</Text><TextInput style={styles.note} placeholder="e.g. 65.2" keyboardType="numeric" value={pregWeight} onChangeText={setPregWeight} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>Doctor Visit</Text><TextInput style={styles.note} placeholder="e.g. Routine check-up, Ultrasound" value={doctorVisit} onChangeText={setDoctorVisit} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>Pregnancy Symptoms</Text><View style={styles.optionsRow}>{pregSymptomsOptions.map((symptom) => ( <TouchableOpacity key={symptom} style={[ styles.option, pregSymptoms.includes(symptom) && styles.optionSelected, ]} onPress={() => toggleSelection(symptom, pregSymptoms, setPregSymptoms)}><Text style={ pregSymptoms.includes(symptom) ? styles.optTextSel : styles.optText }>{symptom}</Text></TouchableOpacity> ))}</View></> )}<Text style={styles.label}>Additional Notes</Text><TextInput style={[styles.note, { height: 80 }]} multiline placeholder="Add any notes" value={note} onChangeText={setNote} placeholderTextColor={theme.textSecondary} /><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveLogsForDate}><Text style={styles.buttonText}>Save</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={periodSettingsVisible} transparent animationType="fade" onRequestClose={() => setPeriodSettingsVisible(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>Period Settings</Text><Text style={styles.label}>Cycle Length (days)</Text><TextInput style={styles.note} keyboardType="numeric" value={cycleLength.toString()} onChangeText={(t) => setCycleLength(parseInt(t) || 0)} /><Text style={styles.label}>Period Duration (days)</Text><TextInput style={styles.note} keyboardType="numeric" value={periodDuration.toString()} onChangeText={(t) => setPeriodDuration(parseInt(t) || 0)} /><Text style={styles.label}>Fertility Goal</Text><Picker selectedValue={goal} onValueChange={setGoal} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="None" value="None" /><Picker.Item label="Trying to Conceive" value="Pregnancy" /><Picker.Item label="Currently Pregnant" value="PregnantMode" /></Picker>{goal === "PregnantMode" && ( <><Text style={styles.label}>Expected Due Date</Text><Calendar onDayPress={(day) => { setUserDueDate(day.dateString); }} markedDates={{ [userDueDate]: { selected: true, selectedColor: theme.primary }, }} theme={calendarTheme}/></> )}<TouchableOpacity style={[styles.option, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setDiscreetMode(!discreetMode)}><MaterialIcons name={discreetMode ? 'visibility-off' : 'visibility'} size={24} color={discreetMode ? theme.primary : theme.textSecondary} /><Text style={[styles.optText, { marginLeft: 8 }]}>{discreetMode ? 'Discreet Mode Enabled' : 'Discreet Mode Disabled'}</Text></TouchableOpacity><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => setPeriodSettingsVisible(false)}><Text style={styles.buttonText}>Close</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={analyticsVisible} transparent animationType="fade" onRequestClose={() => setAnalyticsVisible(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>Analytics</Text><Text style={styles.label}>Filter</Text><Picker selectedValue={filterType} onValueChange={setFilterType} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="All" value="all" />{goal !== "PregnantMode" ? ( <>
        <Picker.Item label="Symptoms" value="symptoms" /><Picker.Item label="Activity" value="activity" /><Picker.Item label="Birth Control" value="birthControl" /><Picker.Item label="Sex Drive" value="sexDrive" /><Picker.Item label="Mood" value="mood" /><Picker.Item label="Energy" value="energy" /><Picker.Item label="Basal Temperature" value="basalTemp" /><Picker.Item label="Notes (Count)" value="note" />
    </> ) : ( <>
        <Picker.Item label="Pregnancy Symptoms" value="pregSymptoms" /><Picker.Item label="Weight" value="pregWeight" /><Picker.Item label="Doctor Visit" value="doctorVisit" /><Picker.Item label="Mood" value="mood" /><Picker.Item label="Energy" value="energy" /><Picker.Item label="Notes (Count)" value="note" />
    </> )}</Picker><ScrollView horizontal showsHorizontalScrollIndicator={true}>{isChartTimeSeries ? <LineChart data={getGraphData()} width={Math.max(screenWidth - 80, getGraphData().labels.length * 60)} height={filterType === "all" ? 300 : 220} chartConfig={{ backgroundGradientFrom: theme.surface, backgroundGradientTo: theme.surface, color: (opacity = 1) => `rgba(${tinycolor(theme.primary).toRgb().r}, ${tinycolor(theme.primary).toRgb().g}, ${tinycolor(theme.primary).toRgb().b}, ${opacity})`, labelColor: () => theme.textPrimary, strokeWidth: 2, useShadowColorFromDataset: false, propsForBackgroundLines: { stroke: theme.border }, propsForLabels: { fontSize: 10, } }} bezier style={{ marginVertical: 16 }} fromZero/> : <BarChart data={getGraphData()} width={Math.max(screenWidth - 80, getGraphData().labels.length * 60)} height={220} yAxisLabel="" yAxisSuffix="" chartConfig={{ backgroundGradientFrom: theme.surface, backgroundGradientTo: theme.surface, color: (opacity = 1) => `rgba(${tinycolor(theme.accent).toRgb().r}, ${tinycolor(theme.accent).toRgb().g}, ${tinycolor(theme.accent).toRgb().b}, ${opacity})`, labelColor: () => theme.textPrimary, propsForBackgroundLines: { stroke: theme.border }, propsForLabels: { fontSize: 10, }}} style={{ marginVertical: 16 }} fromZero />}</ScrollView><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => setAnalyticsVisible(false)}><Text style={styles.buttonText}>Close</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={initialPregnancyModalVisible} transparent animationType="fade" onRequestClose={() => setInitialPregnancyModalVisible(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>Congratulations! Tell us more:</Text><Text style={styles.label}>How many weeks pregnant are you?</Text><TextInput style={styles.note} placeholder="e.g. 5" keyboardType="numeric" value={tempWeeksPregnant} onChangeText={setTempWeeksPregnant} /><Text style={{ marginBottom: 15, color: theme.textSecondary, fontSize: 12 }}>(We'll estimate your due date based on this.)</Text><Text style={styles.label}>OR, select your estimated Due Date:</Text><Calendar onDayPress={(day) => { setSelectedDueDateInModal(day.dateString); setTempWeeksPregnant(''); }} markedDates={{ [selectedDueDateInModal]: { selected: true, selectedColor: theme.primary }, }} theme={calendarTheme}/><TouchableOpacity style={[styles.button, styles.saveButton, { marginTop: 20 }]} onPress={handleInitialPregnancyDetailsSave} disabled={(!tempWeeksPregnant || isNaN(parseInt(tempWeeksPregnant))) && !selectedDueDateInModal}><Text style={styles.buttonText}>Confirm Pregnancy</Text></TouchableOpacity><TouchableOpacity style={[styles.button, { backgroundColor: theme.textSecondary, marginTop: 10 }]} onPress={() => setInitialPregnancyModalVisible(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={positiveTestCongratsModalVisible} transparent animationType="fade" onRequestClose={() => setPositiveTestCongratsModalVisible(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><View style={styles.popupContainer}><Text style={styles.modalTitle}>🎉 Congratulations! 🎉</Text><Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: theme.textPrimary }}>It looks like you've logged a positive pregnancy test! The app is now in <Text style={{fontWeight: 'bold'}}>Pregnant Mode</Text>, and your tracking will adjust to support your pregnancy journey.</Text><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => { setPositiveTestCongratsModalVisible(false); }}><Text style={styles.buttonText}>Awesome!</Text></TouchableOpacity></View></View></View></Modal>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const onAccentColor = tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary;

    return StyleSheet.create({
        phaseBar: { paddingVertical: 10, alignItems: "center", },
        phaseBarText: { fontWeight: "700", fontSize: 16, },
        dpoText: { paddingBottom: 4, backgroundColor: theme.surface, color: theme.textPrimary },
        container: { flex: 1, backgroundColor: theme.background },
        contentScrollView: { flex: 1, },
        summaryCard: { marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: theme.surface, marginHorizontal: 12, borderWidth: 1, borderColor: theme.border },
        summaryTitle: { fontWeight: "bold", marginBottom: 8, fontSize: 16, color: theme.textPrimary },
        summaryItem: { fontSize: 14, color: theme.textSecondary, marginBottom: 6, lineHeight: 22 },
        predictionsCard: { marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: theme.surface, marginHorizontal: 12, borderWidth: 1, borderColor: theme.border },
        predictionsTitle: { fontWeight: "bold", marginBottom: 8, fontSize: 16, color: theme.textPrimary },
        predictionsText: { fontSize: 14, color: theme.textSecondary, lineHeight: 22 },
        buttonsRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 20, marginHorizontal: 12, },
        actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, flex: 1, marginHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
        settingsButton: { backgroundColor: theme.primary, },
        analyticsButton: { backgroundColor: theme.accent, },
        actionButtonText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, },
        button: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, alignItems: "center", },
        saveButton: { backgroundColor: theme.primary, marginTop: 10, },
        buttonText: { color: onPrimaryColor, fontWeight: "600", fontSize: 16 },
        cycleStartBtn: { padding: 12, backgroundColor: theme.surface, borderRadius: 8, alignSelf: "center", marginVertical: 10, borderWidth: 1, borderColor: theme.border },
        cycleStartBtnText: { fontWeight: "600", color: theme.textPrimary },
        label: { marginTop: 12, fontWeight: "600", color: theme.textSecondary, fontSize: 16 },
        picker: { backgroundColor: theme.border, marginVertical: 8, color: theme.textPrimary, borderRadius: 8, },
        note: { borderWidth: 1, borderColor: theme.border, padding: 10, borderRadius: 8, marginVertical: 8, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: 16, textAlignVertical: 'top' },
        option: { backgroundColor: theme.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginTop: 10, alignSelf: "flex-start", marginRight: 8 },
        optionSelected: { backgroundColor: theme.primary },
        optText: { fontWeight: "600", color: theme.textPrimary },
        optTextSel: { color: onPrimaryColor, fontWeight: "600" },
        modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", },
        popupWrapper: { width: "90%", maxHeight: "80%", backgroundColor: theme.surface, borderRadius: 12, overflow: "hidden", },
        popupContainer: { padding: 20, },
        modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: 'center', color: theme.textPrimary },
        optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6, },
    });
};