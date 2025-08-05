import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import * as Speech from 'expo-speech';
import LottieView from "lottie-react-native";
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import tinycolor from 'tinycolor2';

import { useTheme } from '../../context/ThemeContext';
import { CalendarEvent } from '../../types';
import { useWellaura } from '../../WellauraContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS ---
const AFFIRMATIONS = ["I am creating a peaceful and loving space for myself.","I breathe in calm, I breathe out chaos.","I am present and grounded in this moment.","I am worthy of this time I've set aside for myself.","My mind is a garden, and I am planting seeds of peace.",];
const MINDFUL_PROMPTS = ["What is a scent you can notice right now?","Describe the feeling of your feet on the ground.","Listen for the quietest sound you can hear.","Notice the rhythm of your own breathing.","Think of three things that brought you a small joy today.",];
const MEDITATION_SCRIPTS = [{id: 1, title: "Body Scan", durationInSeconds: 70, script: "Let's begin. Find a comfortable position. Close your eyes gently. Bring your attention to your breath. Notice the feeling of the air moving in... and out. Now, bring your awareness to the top of your head. Feel any sensations. Slowly move down to your forehead... your eyes... and your jaw, releasing any tension. Let this awareness travel down your neck... your shoulders... down your arms to your fingertips. Now feel your chest rise and fall with each breath. Move your attention down to your stomach... your legs... all the way down to your toes. You are calm and relaxed. When you're ready, gently open your eyes."}, {id: 2, title: "Mindful Breathing", durationInSeconds: 65, script: "Please, get comfortable and close your eyes. Let's start by taking a deep breath in... and a long breath out. Focus all your attention on your breath. Don't try to change it. Just observe. Feel the cool air enter your nostrils... and the warm air as it leaves. Your mind may wander. That's okay. Gently guide your focus back to your breath. In... and out. Stay with this for a few more moments. You are fully present. When you are ready, slowly open your eyes."},];
const MOODS = [{ emoji: "😊", label: "Joyful" },{ emoji: "😌", label: "Relaxed" },{ emoji: "😐", label: "Neutral" },{ emoji: "😟", "label": "Anxious" },{ emoji: "😠", "label": "Frustrated" },];
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];


export default function MindfulnessPage() {
  const { calendarEvents, saveCalendarEvents } = useWellaura();
  const { theme } = useTheme();
  const styles = getDynamicStyles(theme);

  // --- State ---
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState("Breathe In");
  const [duration, setDuration] = useState(0);
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalText, setJournalText] = useState("");
  const [isJournalSaved, setIsJournalSaved] = useState(false);
  const [affirmation, setAffirmation] = useState(() => getRandomItem(AFFIRMATIONS));
  const [mindfulPrompt, setMindfulPrompt] = useState(() => getRandomItem(MINDFUL_PROMPTS));
  const [activeMeditationId, setActiveMeditationId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, minutes: 0, streak: 0 });
  const [journalEntries, setJournalEntries] = useState([]);
  const [availableVoices, setAvailableVoices] = useState({ female: null, male: null });
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedStats, savedJournal, savedVoice] = await Promise.all([
          AsyncStorage.getItem('mindfulness_stats'),
          AsyncStorage.getItem('mindfulness_journal'),
          AsyncStorage.getItem('mindfulness_voice')
        ]);

        if (savedStats) setStats(JSON.parse(savedStats));
        if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
        if (savedVoice) setSelectedVoice(savedVoice);

        const voices = await Speech.getAvailableVoicesAsync();
        const englishVoices = voices.filter(v => v.language.startsWith('en'));
        const premiumFemale = englishVoices.find(v => v.identifier.includes('premium') && v.gender === 'female');
        const premiumMale = englishVoices.find(v => v.identifier.includes('premium') && v.gender === 'male');
        const femaleVoice = premiumFemale || englishVoices.find(v => v.gender === 'female' || v.name.toLowerCase().includes('samantha')) || englishVoices[0];
        const maleVoice = premiumMale || englishVoices.find(v => v.gender === 'male' || v.name.toLowerCase().includes('alex'));

        setAvailableVoices({ female: femaleVoice?.identifier, male: maleVoice?.identifier });
        if (!savedVoice && femaleVoice) { setSelectedVoice(femaleVoice.identifier); }
      } catch (e) { console.error("Failed to load data.", e); }
    };
    loadData();
    return () => { Speech.stop(); };
  }, []);

  const startBreathingAnimation = () => { Animated.loop( Animated.sequence([ Animated.timing(scaleAnim, { toValue: 1.2, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(scaleAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), ]) ).start(); };

  const updateStats = async (durationInSeconds) => {
    const newStats = { sessions: stats.sessions + 1, minutes: stats.minutes + Math.round(durationInSeconds / 60), streak: stats.streak };
    setStats(newStats);
    await AsyncStorage.setItem('mindfulness_stats', JSON.stringify(newStats));
  };

  const handleJournalSave = async () => {
    if (!journalText.trim()) { Alert.alert("Empty Entry", "Please write something before saving."); return; }
    const newEntry = { id: Date.now().toString(), text: journalText, date: new Date().toISOString() };
    const updatedEntries = [newEntry, ...journalEntries];
    setJournalEntries(updatedEntries);
    await AsyncStorage.setItem('mindfulness_journal', JSON.stringify(updatedEntries));
    setJournalText("");
    setIsJournalSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setIsJournalSaved(false), 2000);
  };

  const handleSelectVoice = async (voiceIdentifier) => {
    if (!voiceIdentifier) return;
    setSelectedVoice(voiceIdentifier);
    await AsyncStorage.setItem('mindfulness_voice', voiceIdentifier);
  };

  const handlePlay = (meditation) => {
      const meditationIdToPlay = meditation.id;
      Speech.stop();
      Speech.speak(meditation.script, {
        voice: selectedVoice, language: 'en-US', pitch: 1.0, rate: 0.9,
        onDone: () => {
          setActiveMeditationId(currentActiveId => {
            if (currentActiveId === meditationIdToPlay) {
              updateStats(meditation.durationInSeconds);
              setIsPaused(false);
              return null;
            }
            return currentActiveId;
          });
        },
        onError: (e) => { console.error(e); Alert.alert("Speech Error", "Could not play the meditation."); }
      });
      setActiveMeditationId(meditationIdToPlay);
      setIsPaused(false);
  };
  const handlePause = () => { Speech.pause(); setIsPaused(true); };
  const handleResume = () => { Speech.resume(); setIsPaused(false); };

  const handlePressMeditation = (meditation) => {
    if (isProcessing) { return; }
    setIsProcessing(true);
    const isThisMeditationActive = activeMeditationId === meditation.id;
    if (isThisMeditationActive) {
      isPaused ? handleResume() : handlePause();
    } else {
      handlePlay(meditation);
    }
    setTimeout(() => setIsProcessing(false), 500);
  };
  
  const handleScheduleReminder = () => {
    if (!reminderTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your reminder.");
      return;
    }
    const newReminder: CalendarEvent = {
      id: `mindful-${Date.now()}`,
      title: `🧘 ${reminderTitle.trim()}`,
      start: reminderDate,
      end: new Date(reminderDate.getTime() + 15 * 60 * 1000), // 15-minute duration
      color: '#81C784', // A calming green
      type: 'mindfulness',
    };
    saveCalendarEvents([...calendarEvents, newReminder]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Reminder Scheduled", `"${newReminder.title}" has been added to your calendar.`);
    setReminderTitle("");
    setReminderDate(new Date());
  };
  
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(null);
    if (event.type === 'set' && selectedDate) {
        setReminderDate(selectedDate);
    }
  };

  useEffect(() => { let breathCycle; if (isBreathing) { setDuration(0); lottieRef.current?.play(); timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000); setBreathText("Breathe In"); startBreathingAnimation(); breathCycle = setInterval(() => { setBreathText((prev) => (prev === "Breathe In" ? "Breathe Out" : "Breathe In")); }, 4000); } else { if (duration > 10) { updateStats(duration); } lottieRef.current?.reset(); clearInterval(timerRef.current); clearInterval(breathCycle); scaleAnim.stopAnimation(); scaleAnim.setValue(1); } return () => { clearInterval(timerRef.current); clearInterval(breathCycle); }; }, [isBreathing]);
  const handleMoodSelect = (mood) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedMood(mood); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); };
  const formatDuration = (sec) => { const minutes = Math.floor(sec / 60).toString().padStart(2, "0"); const seconds = (sec % 60).toString().padStart(2, "0"); return `${minutes}:${seconds}`; };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mindfulness', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.textPrimary, headerTitleStyle: { color: theme.textPrimary } }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Your Mindful Space</Text>
        <Text style={styles.subHeader}>{affirmation}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guided Breathing</Text>
          <TouchableOpacity onPress={() => setIsBreathing((prev) => !prev)}>
            <Animated.View style={[styles.breathCircle, { transform: [{ scale: scaleAnim }] }]}>
              <LottieView ref={lottieRef} source={require("../../../assets/breathing.json")} loop style={styles.lottie} />
              { !isBreathing && <Text style={styles.tapToBeginText}>Tap to Begin</Text> }
            </Animated.View>
          </TouchableOpacity>
          {isBreathing && ( <View style={styles.breathingInfo}><Text style={styles.breathText}>{breathText}</Text><Text style={styles.durationText}>{formatDuration(duration)}</Text></View> )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mindful Moment</Text>
          <Text style={styles.promptText}>{mindfulPrompt}</Text>
          <TouchableOpacity style={styles.promptButton} onPress={() => setMindfulPrompt(getRandomItem(MINDFUL_PROMPTS))}><Text style={styles.promptButtonText}>New Prompt</Text></TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How are you feeling?</Text>
          <View style={styles.moodContainer}>{MOODS.map((mood) => (<TouchableOpacity key={mood.label} onPress={() => handleMoodSelect(mood)} style={[styles.moodButton, selectedMood?.label === mood.label && styles.moodSelected,]}><Text style={styles.moodText}>{mood.emoji}</Text><Text style={styles.moodLabel}>{mood.label}</Text></TouchableOpacity>))}
          </View>
          {selectedMood && (<Text style={styles.selectedMoodText}>It's okay to feel {selectedMood.label.toLowerCase()}.</Text>)}
        </View>
         <View style={styles.card}>
          <Text style={styles.cardTitle}>Spoken Meditations</Text>
          <View style={styles.voiceSelector}>
            {availableVoices.female && (<TouchableOpacity onPress={() => handleSelectVoice(availableVoices.female)} style={[styles.voiceButton, selectedVoice === availableVoices.female && styles.voiceButtonSelected]}><Text style={styles.voiceButtonText}>Female Voice</Text></TouchableOpacity>)}
            {availableVoices.male && (<TouchableOpacity onPress={() => handleSelectVoice(availableVoices.male)} style={[styles.voiceButton, selectedVoice === availableVoices.male && styles.voiceButtonSelected]}><Text style={styles.voiceButtonText}>Male Voice</Text></TouchableOpacity>)}
          </View>
          {MEDITATION_SCRIPTS.map((meditation) => (<View key={meditation.id}><TouchableOpacity style={styles.meditationItem} onPress={() => handlePressMeditation(meditation)} disabled={isProcessing}><View><Text style={styles.meditationTitle}>{meditation.title}</Text><Text style={styles.meditationDuration}>{Math.round(meditation.durationInSeconds / 60)} min</Text></View><Text style={styles.playIcon}>{activeMeditationId === meditation.id && !isPaused ? '❚❚' : '▶'}</Text></TouchableOpacity></View>))}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Journal</Text>
          <TextInput style={styles.journalInput} multiline placeholder="Reflect on your day..." placeholderTextColor={theme.textSecondary} value={journalText} onChangeText={setJournalText} />
          <TouchableOpacity style={styles.saveButton} onPress={handleJournalSave}><Text style={styles.saveButtonText}>{isJournalSaved ? "Saved!" : "Save Reflection"}</Text></TouchableOpacity>
          <View style={styles.journalHistory}>{journalEntries.slice(0, 3).map(entry => (<View key={entry.id} style={styles.journalEntry}><Text style={styles.journalEntryDate}>{new Date(entry.date).toLocaleDateString()}</Text><Text style={styles.journalEntryText} numberOfLines={2}>{entry.text}</Text></View>))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule a Reminder</Text>
          <Text style={styles.formLabel}>What would you like to do?</Text>
          <TextInput style={styles.input} placeholder="e.g., Morning Meditation" value={reminderTitle} onChangeText={setReminderTitle} placeholderTextColor={theme.textSecondary}/>
          <Text style={styles.formLabel}>When?</Text>
          <View style={styles.dateContainer}>
              <TouchableOpacity onPress={() => setShowPicker('date')}><Text style={styles.dateText}>{moment(reminderDate).format("ddd, MMM D")}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPicker('time')}><Text style={styles.dateText}>{moment(reminderDate).format("h:mm A")}</Text></TouchableOpacity>
          </View>
          {showPicker && (
              <DateTimePicker
                  value={reminderDate}
                  mode={showPicker}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
              />
          )}
          <TouchableOpacity style={styles.saveButton} onPress={handleScheduleReminder}><Text style={styles.saveButtonText}>Add to Calendar</Text></TouchableOpacity>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Mindful Journey</Text>
          <View style={styles.statsContainer}>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.sessions}</Text><Text style={styles.statLabel}>Sessions</Text></View>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.minutes}</Text><Text style={styles.statLabel}>Minutes</Text></View>
              <View style={styles.statItem}><Text style={styles.statValue}>{stats.streak}</Text><Text style={styles.statLabel}>Days Streak</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        scrollContent: { padding: 20, paddingBottom: 40 },
        header: { fontSize: 32, fontWeight: 'bold', color: theme.textPrimary, textAlign: "center" },
        subHeader: { fontSize: 18, fontStyle: 'italic', color: theme.textSecondary, textAlign: "center", marginBottom: 30 },
        card: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
        cardTitle: { fontSize: 22, fontWeight: '600', color: theme.textPrimary, marginBottom: 20, textAlign: "center" },
        breathCircle: { width: 200, height: 200, borderRadius: 100, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 20, backgroundColor: tinycolor(theme.accent).setAlpha(0.3).toRgbString(), shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15 },
        lottie: { width: 250, height: 250 },
        tapToBeginText: { position: 'absolute', fontSize: 16, fontWeight: '500', color: theme.textPrimary },
        breathingInfo: { alignItems: 'center' },
        breathText: { fontSize: 26, color: theme.textPrimary, fontWeight: "bold", marginBottom: 5 },
        durationText: { fontSize: 18, color: theme.textSecondary },
        promptText: { fontSize: 16, color: theme.textPrimary, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
        promptButton: { backgroundColor: theme.accent, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, alignSelf: 'center' },
        promptButtonText: { color: onPrimaryColor, fontWeight: '600', fontSize: 14 },
        moodContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 15 },
        moodButton: { alignItems: 'center', padding: 10, borderRadius: 20, width: 70, height: 70, justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
        moodSelected: { backgroundColor: tinycolor(theme.accent).setAlpha(0.2).toRgbString(), borderColor: theme.accent },
        moodText: { fontSize: 28 },
        moodLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
        selectedMoodText: { fontSize: 16, textAlign: "center", color: theme.textSecondary, fontStyle: 'italic', marginTop: 10 },
        journalInput: { height: 120, backgroundColor: theme.background, borderRadius: 15, padding: 15, fontSize: 16, color: theme.textPrimary, textAlignVertical: "top", lineHeight: 22, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
        saveButton: { backgroundColor: theme.primary, paddingVertical: 15, borderRadius: 15, alignItems: "center" },
        saveButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: "bold" },
        meditationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
        meditationTitle: { fontSize: 16, fontWeight: '500', color: theme.textPrimary },
        meditationDuration: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
        playIcon: { fontSize: 24, color: theme.primary, width: 25, textAlign: 'center' },
        statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
        statItem: { alignItems: 'center' },
        statValue: { fontSize: 24, fontWeight: 'bold', color: theme.primary },
        statLabel: { fontSize: 14, color: theme.textSecondary, marginTop: 5 },
        journalHistory: { marginTop: 20, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
        journalEntry: { backgroundColor: theme.background, padding: 15, borderRadius: 10, marginBottom: 10 },
        journalEntryDate: { fontSize: 12, color: theme.textSecondary, marginBottom: 5, fontWeight: 'bold' },
        journalEntryText: { fontSize: 14, color: theme.textPrimary },
        voiceSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 10 },
        voiceButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: theme.border, marginHorizontal: 10 },
        voiceButtonSelected: { backgroundColor: theme.accent, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
        voiceButtonText: { color: theme.textPrimary, fontWeight: '600' },
        formLabel: { fontSize: 16, fontWeight: '500', color: theme.textSecondary, marginBottom: 10 },
        input: { backgroundColor: theme.background, borderRadius: 15, padding: 15, fontSize: 16, color: theme.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
        dateContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: theme.background, padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
        dateText: { fontSize: 18, color: theme.primary, fontWeight: '600' },
    });
};