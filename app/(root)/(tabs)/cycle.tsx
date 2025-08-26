import { Picker } from "@react-native-picker/picker";
import React, { useMemo, useState } from "react";
import {
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tinycolor from "tinycolor2";
import { useCycle } from "../../../app/context/CycleContext"; // Use the global Cycle context
import { useTheme } from "../../../app/context/ThemeContext"; // Use the global Theme context

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- COMPONENT-SPECIFIC CONSTANTS & HELPERS ---
const PHASE_COLORS: Record<string, string> = { Menstruation: "#c2185b", Follicular: "#ffb3c1", Ovulation: "#00bcd4", Luteal: "#cdb4db", Default: "#e0e0e0", };
const symptomOptions = [ "Cramps", "Fatigue", "Headache", "Back Pain", "Nausea", "Mood Swings", ];
const sexDriveOptions = ["", "High", "Neutral", "Low"];
const birthControlOptions = [ "Pill Taken", "Missed Pill", "Injection", "IUD", "Implant", "Patch", "None", ];
const pregSymptomsOptions = [ "Morning Sickness", "Fatigue", "Breast Tenderness", "Frequent Urination", "Food Cravings", "Aversions", "Heartburn", "Swelling", "Backache", "Braxton Hicks", "Contractions", "Fetal Movement", "Pelvic Pressure", ];
const flowOptions = ["None", "Light", "Medium", "Heavy", "Do not want to say"];

const getPhaseColor = (phase: string): string => {
    return PHASE_COLORS[phase.split(' ')[0]] || PHASE_COLORS.Default;
};

const getCyclePredictions = (lastCycleStart: string | null, cycleLength: number, periodDuration: number) => {
    if (!lastCycleStart) return {};
    const predictions: Record<string, any> = {};
    const nextPeriodStart = new Date(lastCycleStart);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + cycleLength);

    for (let i = 0; i < periodDuration; i++) {
        const d = new Date(nextPeriodStart);
        d.setDate(nextPeriodStart.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        predictions[ds] = {
            color: tinycolor(PHASE_COLORS.Menstruation).lighten(20).toString(),
            textColor: "#000",
            customLabel: i === 0 ? "Next Period (Predicted)" : undefined,
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
            color: tinycolor(PHASE_COLORS.Ovulation).lighten(20).toString(),
            textColor: "#000",
            customLabel: i === 0 ? "Ovulation (Predicted)" : "Fertile (Predicted)",
        };
    }
    return predictions;
};


export default function CycleTracker() {
  const { theme } = useTheme();
  const {
    logs,
    setLogs,
    cycleLength,
    setCycleLength,
    periodDuration,
    setPeriodDuration,
    goal,
    setGoal,
    userDueDate,
    setUserDueDate,
    discreetMode,
    setDiscreetMode,
    cycleInfo,
  } = useCycle();

  const styles = getDynamicStyles(theme);
  const today = new Date().toISOString().split("T")[0];

  // --- LOCAL UI STATE (for modals and forms) ---
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [logModalVisible, setLogModalVisible] = useState<boolean>(false);
  const [periodSettingsVisible, setPeriodSettingsVisible] = useState<boolean>(false);
  const [positiveTestCongratsModalVisible, setPositiveTestCongratsModalVisible] = useState<boolean>(false);
  const [initialPregnancyModalVisible, setInitialPregnancyModalVisible] = useState<boolean>(false);
  const [historyVisible, setHistoryVisible] = useState<boolean>(false);
  
  // Log Modal States
  const [flow, setFlow] = useState<string>("None");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [birthControl, setBirthControl] = useState<string[]>([]);
  const [sexDrive, setSexDrive] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [cervicalMucus, setCervicalMucus] = useState<string>("");
  const [basalTemp, setBasalTemp] = useState<string>("");
  const [lhTest, setLhTest] = useState<string>("");
  const [pregnancyTest, setPregnancyTest] = useState<string>("");
  const [pregWeight, setPregWeight] = useState<string>("");
  const [doctorVisit, setDoctorVisit] = useState<string>("");
  const [pregSymptoms, setPregSymptoms] = useState<string[]>([]);
  
  const [tempWeeksPregnant, setTempWeeksPregnant] = useState<string>(''); 
  const [selectedDueDateInModal, setSelectedDueDateInModal] = useState<string>(today);
  
  // --- Handlers & Functions ---
  const toggleSelection = (item: string, list: string[], setFn: React.Dispatch<React.SetStateAction<string[]>>) => setFn(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  const openLogModalForDate = (date: string) => {
    setSelectedDate(date);
    const dayLog = logs[date] || {};
    setFlow(dayLog.flow || "None");
    setSymptoms(dayLog.symptoms || []);
    setActivity(dayLog.activity || []);
    setBirthControl(dayLog.birthControl || []);
    setSexDrive(dayLog.sexDrive || "");
    setMood(dayLog.mood || "");
    setEnergy(dayLog.energy || "");
    setNote(dayLog.note || "");
    setCervicalMucus(dayLog.cervicalMucus || "");
    setBasalTemp(dayLog.basalTemp || "");
    setLhTest(dayLog.lhTest || "");
    setPregnancyTest(dayLog.pregnancyTest || "");
    setPregWeight(dayLog.pregWeight || "");
    setDoctorVisit(dayLog.doctorVisit || "");
    setPregSymptoms(dayLog.pregSymptoms || []);
    setLogModalVisible(true);
  };
  
  const saveLogsForDate = () => {
    const isPositiveTest = goal === "Pregnancy" && pregnancyTest === "Positive";
    setLogs(prevLogs => {
      const newLogs = { ...prevLogs };
      const newLogData = {
        flow, symptoms, activity, birthControl, sexDrive, mood, energy, note,
        cervicalMucus, basalTemp, lhTest, pregnancyTest, pregWeight, doctorVisit, pregSymptoms
      };

      Object.keys(newLogData).forEach(key => {
        const value = (newLogData as any)[key];
        if (value === "None" || value === "" || (Array.isArray(value) && value.length === 0)) {
          delete (newLogData as any)[key];
        }
      });
      
      if (Object.keys(newLogData).length > 0) {
        newLogs[selectedDate] = newLogData;
      } else {
        delete newLogs[selectedDate];
      }
      return newLogs;
    });
    setLogModalVisible(false);
    if (isPositiveTest) {
      setInitialPregnancyModalVisible(true);
      setTempWeeksPregnant('');
      setSelectedDueDateInModal(userDueDate || today);
    }
  };

  const handleInitialPregnancyDetailsSave = () => { let calculatedDueDate: string | null = null; if (tempWeeksPregnant) { const weeks = parseInt(tempWeeksPregnant, 10); if (!isNaN(weeks) && weeks >= 1 && weeks <= 40) { const todayDate = new Date(); const remainingDays = Math.max(0, (40 - weeks) * 7); const newDueDate = new Date(todayDate.getTime() + remainingDays * 86400000); calculatedDueDate = newDueDate.toISOString().split("T")[0]; } } else if (selectedDueDateInModal) { calculatedDueDate = selectedDueDateInModal; } setUserDueDate(calculatedDueDate || today); setGoal("PregnantMode"); setInitialPregnancyModalVisible(false); setPositiveTestCongratsModalVisible(true); };
  
  const getMarkedDates = () => {
    const markings: Record<string, any> = {};
    const { lastCycleStart } = cycleInfo;

    if (lastCycleStart) {
        const startDate = new Date(lastCycleStart);
        for (let i = -14; i < cycleLength + 14; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            if (!markings[ds]) {
                const phase = cycleInfo.phaseForToday;
                markings[ds] = { color: getPhaseColor(phase), textColor: theme.white, customStyles: { container: { borderRadius: 0 } } };
            }
        }
    }
    
    const predictions = getCyclePredictions(lastCycleStart, cycleLength, periodDuration);
    Object.keys(predictions).forEach(date => {
        if (!logs[date]) { markings[date] = predictions[date]; }
    });

    Object.keys(logs).forEach(date => {
      if (logs[date]?.flow && logs[date].flow !== 'None') {
        const prevDay = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
        const nextDay = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0];
        markings[date] = { ...markings[date], color: PHASE_COLORS.Menstruation, textColor: theme.white, startingDay: !(logs[prevDay]?.flow && logs[prevDay].flow !== 'None'), endingDay: !(logs[nextDay]?.flow && logs[nextDay].flow !== 'None'), };
      }
    });

    Object.keys(logs).forEach(ds => {
      if (Object.keys(logs[ds]).length > 0) {
          if (!markings[ds]) markings[ds] = {};
          markings[ds].marked = true;
          markings[ds].dotColor = theme.textPrimary;
      }
    });
    
    if (goal === "PregnantMode" && userDueDate) { markings[userDueDate] = { ...(markings[userDueDate] || {}), color: '#4CAF50', startingDay: true, endingDay: true, textColor: theme.white }; }

    if (markings[selectedDate]) { markings[selectedDate] = { ...markings[selectedDate], selected: true, selectedColor: theme.accent, }; } else { markings[selectedDate] = { selected: true, selectedColor: theme.accent, }; }
    
    return markings;
  };

  const cycleHistory = useMemo(() => {
    const periodDays = Object.keys(logs)
        .filter(date => logs[date]?.flow && logs[date].flow !== 'None')
        .sort();

    if (periodDays.length === 0) return [];

    const cycles = [];
    let currentCycle = {
        startDate: periodDays[0],
        duration: 1,
    };

    for (let i = 1; i < periodDays.length; i++) {
        const prevDay = new Date(periodDays[i-1]);
        const currentDay = new Date(periodDays[i]);
        // Set to UTC midnight to avoid DST issues
        prevDay.setUTCHours(0, 0, 0, 0);
        currentDay.setUTCHours(0, 0, 0, 0);

        const diffTime = currentDay.getTime() - prevDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentCycle.duration += 1;
        } else {
            cycles.push(currentCycle);
            currentCycle = {
                startDate: periodDays[i],
                duration: 1,
            };
        }
    }
    cycles.push(currentCycle);
    return cycles.reverse();
  }, [logs]);

  const calendarTheme = { backgroundColor: theme.background, calendarBackground: theme.surface, textSectionTitleColor: theme.textSecondary, selectedDayBackgroundColor: theme.accent, selectedDayTextColor: tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary, todayTextColor: theme.primary, dayTextColor: theme.textPrimary, textDisabledColor: theme.border, dotColor: theme.textPrimary, selectedDotColor: theme.white, arrowColor: theme.primary, monthTextColor: theme.textPrimary, textDayFontWeight: "bold", textMonthFontWeight: 'bold', textDayHeaderFontWeight: 'normal', };
  const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
  const { phaseForToday, dayOfCycle, lastCycleStart } = cycleInfo;
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.phaseBar, { backgroundColor: goal === "PregnantMode" ? theme.accent : getPhaseColor(phaseForToday) }]}>
        <Text style={[styles.phaseBarText, {color: tinycolor(goal === "PregnantMode" ? theme.accent : getPhaseColor(phaseForToday)).isDark() ? theme.white : theme.textPrimary}]}>
          {goal === "PregnantMode" 
              ? `💖 Pregnant!`
              : dayOfCycle > 0 
                  ? `Day ${dayOfCycle} - ${phaseForToday}`
                  : 'Log your period to begin tracking'}
        </Text>
      </View>
      {goal === "Pregnancy" && lastCycleStart && (() => { const ovulationDay = cycleLength - 14 + 1; if (dayOfCycle > ovulationDay) { const dpo = dayOfCycle - ovulationDay; return ( <Text style={[styles.phaseBarText, styles.dpoText]}> 🍼 {dpo} DPO – {dpo >= 10 ? "You can test soon!" : "Still early – hang in there 💕"} </Text> ); } return null; })()}

      <ScrollView style={styles.contentScrollView}>
        <Calendar markingType="period" markedDates={getMarkedDates()} onDayPress={(day) => openLogModalForDate(day.dateString)} theme={calendarTheme} style={{marginTop: 10}}/>
        {lastCycleStart && goal !== "PregnantMode" && ( <View style={styles.predictionsCard}><Text style={styles.predictionsTitle}>Upcoming Predictions</Text><Text style={styles.predictionsText}>{(() => { const start = new Date(lastCycleStart); const nextPeriodStart = new Date(start); nextPeriodStart.setDate(start.getDate() + cycleLength); const nextPeriodEnd = new Date(nextPeriodStart); nextPeriodEnd.setDate(nextPeriodStart.getDate() + periodDuration - 1); const ovulation = new Date(nextPeriodStart); ovulation.setDate(ovulation.getDate() - 14); const fertileStart = new Date(ovulation); fertileStart.setDate(ovulation.getDate() - 5); const format = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", }); if (goal === "Pregnancy") { return `🩷 Best days to try: ${format(fertileStart)} – ${format(ovulation)}\n🩷 Predicted ovulation: ${format(ovulation)}\n🩷 Next period (if not pregnant 🤞): ${format(nextPeriodStart)} – ${format(nextPeriodEnd)}`; } else { return `Next period: ${format(nextPeriodStart)} – ${format(nextPeriodEnd)}\nOvulation: ${format(ovulation)}\nFertile window: ${format(fertileStart)} – ${format(ovulation)}`; } })()}</Text></View> )}
      </ScrollView>
      
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => setHistoryVisible(true)}>
            <MaterialIcons name="history" size={22} color={onPrimaryColor} />
            <Text style={styles.navButtonText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setPeriodSettingsVisible(true)}>
            <MaterialIcons name="settings" size={22} color={onPrimaryColor} />
            <Text style={styles.navButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* MODALS */}
      <Modal visible={logModalVisible} transparent animationType="fade" onRequestClose={() => setLogModalVisible(false)}><View style={styles.modalOverlay}><TouchableWithoutFeedback onPress={() => setLogModalVisible(false)}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}><Text style={styles.modalTitle}>Log for {selectedDate}</Text>
      {goal !== "PregnantMode" && (<>
        <Text style={styles.label}>Period Flow</Text>
        <View style={styles.optionsRow}>
            {flowOptions.map((flowOption) => (
                <TouchableOpacity key={flowOption} style={[styles.option, flow === flowOption && styles.optionSelected]} onPress={() => setFlow(flowOption)} >
                    <Text style={flow === flowOption ? styles.optTextSel : styles.optText}>{flowOption}</Text>
                </TouchableOpacity>
            ))}
        </View>
        <Text style={styles.label}>Symptoms</Text><View style={styles.optionsRow}>{symptomOptions.map((symptom) => ( <TouchableOpacity key={symptom} style={[ styles.option, symptoms.includes(symptom) && styles.optionSelected, ]} onPress={() => toggleSelection(symptom, symptoms, setSymptoms)}><Text style={ symptoms.includes(symptom) ? styles.optTextSel : styles.optText }>{symptom}</Text></TouchableOpacity> ))}</View>
      </>)}
      <Text style={styles.label}>Sexual Activity</Text><View style={styles.optionsRow}>{["Protected", "Unprotected", "None"].map((act) => ( <TouchableOpacity key={act} style={[ styles.option, activity.includes(act) && styles.optionSelected, ]} onPress={() => toggleSelection(act, activity, setActivity)}><Text style={activity.includes(act) ? styles.optTextSel : styles.optText}>{act}</Text></TouchableOpacity> ))}</View>
      {goal !== "PregnantMode" && ( <><Text style={styles.label}>Birth Control Taken</Text><View style={styles.optionsRow}>{birthControlOptions.map((item) => ( <TouchableOpacity key={item} style={[ styles.option, birthControl.includes(item) && styles.optionSelected, ]} onPress={() => toggleSelection(item, birthControl, setBirthControl)}><Text style={ birthControl.includes(item) ? styles.optTextSel : styles.optText }>{item}</Text></TouchableOpacity> ))}</View></> )}
      <Text style={styles.label}>Sex Drive</Text><Picker selectedValue={sexDrive} onValueChange={setSexDrive} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item key={""} label={"None"} value={""} />{sexDriveOptions.slice(1).map((opt) => ( <Picker.Item key={opt} label={opt} value={opt} /> ))}</Picker>
      <Text style={styles.label}>Mood</Text><TextInput style={styles.note} placeholder="Describe your mood" value={mood} onChangeText={setMood} placeholderTextColor={theme.textSecondary} />
      <Text style={styles.label}>Energy</Text><TextInput style={styles.note} placeholder="Describe your energy" value={energy} onChangeText={setEnergy} placeholderTextColor={theme.textSecondary} />
      {goal === "Pregnancy" && ( <><Text style={styles.label}>Cervical Mucus</Text><Picker selectedValue={cervicalMucus} onValueChange={setCervicalMucus} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="None" value="" /><Picker.Item label="Dry" value="Dry" /><Picker.Item label="Sticky" value="Sticky" /><Picker.Item label="Creamy" value="Creamy" /><Picker.Item label="Egg White" value="Egg White" /><Picker.Item label="Watery" value="Watery" /></Picker><Text style={styles.label}>Basal Body Temperature (°C)</Text><TextInput style={styles.note} placeholder="e.g. 36.55" keyboardType="numeric" value={basalTemp} onChangeText={setBasalTemp} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>LH Test</Text><Picker selectedValue={lhTest} onValueChange={setLhTest} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="Not Taken" value="" /><Picker.Item label="Negative" value="Negative" /><Picker.Item label="Positive" value="Positive" /></Picker><Text style={styles.label}>Pregnancy Test</Text><Picker selectedValue={pregnancyTest} onValueChange={setPregnancyTest} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="Not Taken" value="" /><Picker.Item label="Negative" value="Negative" /><Picker.Item label="Positive" value="Positive" /></Picker></> )}
      {goal === "PregnantMode" && ( <><Text style={styles.label}>Weight (kg)</Text><TextInput style={styles.note} placeholder="e.g. 65.2" keyboardType="numeric" value={pregWeight} onChangeText={setPregWeight} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>Doctor Visit</Text><TextInput style={styles.note} placeholder="e.g. Routine check-up, Ultrasound" value={doctorVisit} onChangeText={setDoctorVisit} placeholderTextColor={theme.textSecondary} /><Text style={styles.label}>Pregnancy Symptoms</Text><View style={styles.optionsRow}>{pregSymptomsOptions.map((symptom) => ( <TouchableOpacity key={symptom} style={[ styles.option, pregSymptoms.includes(symptom) && styles.optionSelected, ]} onPress={() => toggleSelection(symptom, pregSymptoms, setPregSymptoms)}><Text style={ pregSymptoms.includes(symptom) ? styles.optTextSel : styles.optText }>{symptom}</Text></TouchableOpacity> ))}</View></> )}
      <Text style={styles.label}>Additional Notes</Text><TextInput style={[styles.note, { height: 80 }]} multiline placeholder="Add any notes" value={note} onChangeText={setNote} placeholderTextColor={theme.textSecondary} />
      <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveLogsForDate}><Text style={styles.buttonText}>Save</Text></TouchableOpacity></ScrollView></View></View></Modal>

      <Modal visible={periodSettingsVisible} transparent animationType="fade" onRequestClose={() => setPeriodSettingsVisible(false)}><View style={styles.modalOverlay}><View style={styles.popupWrapper}><ScrollView style={styles.popupContainer} keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>Period Settings</Text><Text style={styles.label}>Average Cycle Length (days)</Text><TextInput style={styles.note} keyboardType="numeric" value={cycleLength.toString()} onChangeText={(t) => setCycleLength(parseInt(t, 10) || 0)} /><Text style={styles.label}>Average Period Duration (days)</Text><TextInput style={styles.note} keyboardType="numeric" value={periodDuration.toString()} onChangeText={(t) => setPeriodDuration(parseInt(t, 10) || 0)} /><Text style={styles.label}>Fertility Goal</Text><Picker selectedValue={goal} onValueChange={(itemValue) => setGoal(itemValue as 'None' | 'Pregnancy' | 'PregnantMode')} style={styles.picker} itemStyle={{color: theme.textPrimary}}><Picker.Item label="None" value="None" /><Picker.Item label="Trying to Conceive" value="Pregnancy" /><Picker.Item label="Currently Pregnant" value="PregnantMode" /></Picker>{goal === "PregnantMode" && ( <><Text style={styles.label}>Expected Due Date</Text><Calendar onDayPress={(day) => { setUserDueDate(day.dateString); }} markedDates={{ [userDueDate]: { selected: true, selectedColor: theme.primary }, }} theme={calendarTheme}/></> )}<TouchableOpacity style={[styles.option, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => setDiscreetMode(!discreetMode)}><MaterialIcons name={discreetMode ? 'visibility-off' : 'visibility'} size={24} color={discreetMode ? theme.primary : theme.textSecondary} /><Text style={[styles.optText, { marginLeft: 8 }]}>{discreetMode ? 'Discreet Mode Enabled' : 'Discreet Mode Disabled'}</Text></TouchableOpacity><TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => setPeriodSettingsVisible(false)}><Text style={styles.buttonText}>Close</Text></TouchableOpacity></ScrollView></View></View></Modal>
      
      <Modal visible={historyVisible} transparent animationType="fade" onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.popupWrapper}>
                <Text style={styles.modalTitle}>Cycle History</Text>
                <ScrollView style={styles.historyScrollView}>
                    {cycleHistory.length > 0 ? (
                        cycleHistory.map((cycle, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Text style={styles.historyDate}>
                                    Start Date: {new Date(cycle.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                                <Text style={styles.historyDuration}>
                                    Period Duration: {cycle.duration} days
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noHistoryText}>No period history logged yet.</Text>
                    )}
                </ScrollView>
                 <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={() => setHistoryVisible(false)}>
                     <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={initialPregnancyModalVisible} transparent animationType="fade" onRequestClose={() => setInitialPregnancyModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.popupWrapper}>
                  <ScrollView style={styles.popupContainer}>
                      <Text style={styles.modalTitle}>Congratulations! 🎉</Text>
                      <Text style={[styles.label, {textAlign: 'center', marginBottom: 16}]}>Let's set up your pregnancy tracking.</Text>
                      <Text style={styles.label}>How many weeks pregnant are you?</Text>
                      <TextInput style={styles.note} placeholder="e.g., 5" keyboardType="numeric" value={tempWeeksPregnant} onChangeText={setTempWeeksPregnant} />
                      <Text style={[styles.label, {textAlign: 'center', marginVertical: 8}]}>OR</Text>
                      <Text style={styles.label}>Select your estimated due date:</Text>
                      <Calendar onDayPress={(day) => setSelectedDueDateInModal(day.dateString)} markedDates={{ [selectedDueDateInModal]: { selected: true, selectedColor: theme.primary } }} theme={calendarTheme} />
                      <TouchableOpacity style={[styles.button, styles.saveButton, {marginTop: 20}]} onPress={handleInitialPregnancyDetailsSave}>
                          <Text style={styles.buttonText}>Save & Begin Tracking</Text>
                      </TouchableOpacity>
                  </ScrollView>
              </View>
          </View>
      </Modal>

      <Modal visible={positiveTestCongratsModalVisible} transparent animationType="fade" onRequestClose={() => setPositiveTestCongratsModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.popupWrapper}>
                  <View style={styles.popupContainer}>
                      <Text style={styles.modalTitle}>All Set! 💖</Text>
                      <Text style={{color: theme.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 20}}>Your tracker is now in Pregnancy Mode. Wishing you a healthy and happy journey!</Text>
                      <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => setPositiveTestCongratsModalVisible(false)}>
                          <Text style={styles.buttonText}>Awesome!</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme: any) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        contentScrollView: { flex: 1, },
        phaseBar: { paddingVertical: 10, alignItems: "center", },
        phaseBarText: { fontWeight: "700", fontSize: 16, },
        dpoText: { paddingBottom: 4, backgroundColor: theme.surface, color: theme.textPrimary, textAlign: 'center' },
        predictionsCard: { marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: theme.surface, marginHorizontal: 12, borderWidth: 1, borderColor: theme.border },
        predictionsTitle: { fontWeight: "bold", marginBottom: 8, fontSize: 16, color: theme.textPrimary },
        predictionsText: { fontSize: 14, color: theme.textSecondary, lineHeight: 22 },
        bottomNav: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: 10,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
        },
        navButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.primary,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 25,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
        },
        navButtonText: {
            fontSize: 14,
            color: onPrimaryColor,
            marginLeft: 8,
            fontWeight: 'bold',
        },
        button: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, alignItems: "center", },
        saveButton: { backgroundColor: theme.primary, marginTop: 10, },
        closeButton: {
            backgroundColor: theme.accent,
            margin: 20,
            marginTop: 10,
        },
        buttonText: { color: onPrimaryColor, fontWeight: "600", fontSize: 16 },
        label: { marginTop: 12, fontWeight: "600", color: theme.textSecondary, fontSize: 16 },
        picker: { backgroundColor: theme.border, marginVertical: 8, color: theme.textPrimary, borderRadius: 8, },
        note: { borderWidth: 1, borderColor: theme.border, padding: 10, borderRadius: 8, marginVertical: 8, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: 16, textAlignVertical: 'top' },
        option: { backgroundColor: theme.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginTop: 10, alignSelf: "flex-start", marginRight: 8 },
        optionSelected: { backgroundColor: theme.primary },
        optText: { fontWeight: "600", color: theme.textPrimary },
        optTextSel: { color: onPrimaryColor, fontWeight: "600" },
        modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", },
        popupWrapper: { width: "90%", maxHeight: "80%", backgroundColor: theme.surface, borderRadius: 12, overflow: "hidden", },
        popupContainer: { padding: 20 },
        modalTitle: { fontSize: 20, fontWeight: "bold", padding: 20, paddingBottom: 10, textAlign: 'center', color: theme.textPrimary },
        optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6, },
        historyScrollView: {
            paddingHorizontal: 20,
        },
        historyItem: {
            backgroundColor: theme.border,
            padding: 15,
            borderRadius: 10,
            marginBottom: 10,
        },
        historyDate: {
            color: theme.textPrimary,
            fontSize: 16,
            fontWeight: 'bold',
        },
        historyDuration: {
            color: theme.textSecondary,
            fontSize: 14,
            marginTop: 4,
        },
        noHistoryText: {
            color: theme.textSecondary,
            textAlign: 'center',
            marginTop: 20,
            fontSize: 16,
            paddingBottom: 20,
        },
    });
};