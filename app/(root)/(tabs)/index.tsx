
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, LayoutAnimation, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, { interpolateColor, runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import ColorPicker from "react-native-wheel-color-picker";
import tinycolor from "tinycolor2";
import { generateWeeklyInsights } from "../../../lib/insights";
import { useWellaura } from "../../WellauraContext";
import { TodaySnapshot } from "./TodaySnapshot";
import { WeatherWidget } from "./WeatherWidget";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- "SUNSET GLOW" THEME & CONSTANTS ---
const COLORS = { primary: '#F97E16', accent: '#FACC15', background: '#FFF7ED', surface: '#FFFFFF', textPrimary: '#1E293B', textSecondary: '#64748B', border: '#F1F5F9' };
const pastelColors = ['#FFFFFF', '#fde4cf', '#fbf8cc', '#d9f9cc', '#cce6ff', '#d9cce6', '#fccfcf', '#cfd8dc'];

// --- WIDGET COMPONENTS ---
const SkeletonLoader = ({ height }) => {
    const shimmer = useSharedValue(0);
    useEffect(() => { shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false); }, []);
    const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(shimmer.value, [0, 0.5, 1], ['#E2E8F0', '#F1F5F9', '#E2E8F0']) }));
    return <Animated.View style={[styles.skeleton, { height: height - 40 }, animatedStyle]} />;
};
const CalendarWidget = React.memo(() => {
  const { calendarEvents } = useWellaura();
  const today = moment();
  const formattedDate = today.format("dddd, MMMM D");
  const todaysEvents = calendarEvents.filter(e => moment(e.start).isSame(today, 'day') && !e.allDay).sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 3);
  return (
    <View>
      <Text style={styles.dateText}>{formattedDate}</Text>
      <Text style={styles.subTitle}>Today's Agenda</Text>
      {todaysEvents.length > 0 ? (todaysEvents.map(event => (<Text key={event.id} style={styles.cardText} numberOfLines={1}>{moment(event.start).format('h:mma')} - {event.title}</Text>))) : (<Text style={styles.cardText}>No events scheduled today.</Text>)}
    </View>
  );
});
const BudgetWidget = React.memo(() => {
  const { transactions, budgetSettings } = useWellaura();
  const { totalIncome, totalExpenses } = useMemo(() => {
    const income = (budgetSettings.incomeVaries ? transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.budgetedAmount, 0) : parseFloat(budgetSettings.fixedIncome || '0')) || 0;
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0);
    return { totalIncome: income, totalExpenses: expenses };
  }, [transactions, budgetSettings]);
  const remaining = totalIncome - totalExpenses;
  return <Text style={styles.cardText}>Remaining this period: £{remaining.toFixed(2)}</Text>;
});
const HabitsWidget = React.memo(() => {
  const { habits } = useWellaura();
  const today = new Date().toISOString().split('T')[0];
  if (!habits || habits.length === 0) { return <Text style={styles.cardText}>No habits set up yet.</Text> }
  return (
    <View style={{ gap: 4 }}>
      {habits.slice(0, 3).map((habit) => {
        const isCompleted = habit.history?.[today]?.completed || false;
        return (<Text key={habit.id} style={[styles.cardText, { textDecorationLine: isCompleted ? "line-through" : "none" }]}>{habit.icon} {habit.name}</Text>)
      })}
    </View>
  );
});
const MindfulnessWidget = React.memo(() => (<View><Text style={styles.cardText}>How are you feeling today?</Text><Text style={{ fontSize: 24, marginTop: 5 }}>😌</Text></View>));
const MealPlannerWidget = React.memo(() => {
  const { mealPlan } = useWellaura();
  const dayOfWeek = moment().format('dddd');
  const dinner = mealPlan[dayOfWeek]?.dinner?.name;
  return <Text style={styles.cardText}>Tonight's Dinner: {dinner || 'Not planned'}</Text>;
});
const CycleTrackerWidget = React.memo(() => {
  const { cycleData } = useWellaura();
  if (!cycleData || !cycleData.cycleStart) return <Text style={styles.cardText}>No cycle data yet.</Text>;
  const dayIndex = moment().diff(moment(cycleData.cycleStart), 'days');
  return <Text style={styles.cardText}>Cycle Day: {dayIndex + 1}</Text>;
});

const InsightsWidget = React.memo(() => {
    const { habits, transactions, cycleData } = useWellaura();
    const [isExpanded, setIsExpanded] = useState(false);
    const rotation = useSharedValue(0);
    const insights = useMemo(() => generateWeeklyInsights(habits, transactions, cycleData), [habits, transactions, cycleData]);
    const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
        rotation.value = withTiming(isExpanded ? 0 : 180, { duration: 250 });
    };
    if (insights.length === 0) { return null; }
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={toggleExpand}>
            <View style={styles.insightsCard}>
                <View style={styles.insightsHeader}>
                    <Ionicons name="sparkles" size={22} color={COLORS.primary} />
                    <Text style={styles.cardTitle}>Your Weekly Insights</Text>
                    <Animated.View style={animatedIconStyle}>
                        <Ionicons name="chevron-down-outline" size={24} color={COLORS.primary} />
                    </Animated.View>
                </View>
                {isExpanded && (
                    <View style={styles.insightsContent}>
                        {insights.map((insight, index) => (<Text key={index} style={styles.insightText}>• {insight}</Text>))}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

const ColorPickerModal = ({ isVisible, onClose, initialColor, onColorConfirm }) => {
    const [tempColor, setTempColor] = useState(initialColor);
    const [hexInput, setHexInput] = useState(tinycolor(initialColor).toHexString());
    useEffect(() => { setTempColor(initialColor); setHexInput(tinycolor(initialColor).toHexString()); }, [initialColor, isVisible]);
    const handleColorChange = (color) => { setTempColor(color); setHexInput(tinycolor(color).toHexString()); };
    const applyHexCode = () => {
        const color = tinycolor(hexInput);
        if (color.isValid()) { setTempColor(color.toHexString()); }
        else { Alert.alert("Invalid Color", "Please enter a valid HEX color code."); }
    };
    return (
        <Modal visible={isVisible} onRequestClose={onClose} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={styles.colorModalContainer}>
                    <Text style={styles.modalTitle}>Choose a Color</Text>
                    <View style={styles.pickerWrapper}><ColorPicker color={tempColor} onColorChangeComplete={handleColorChange} thumbSize={30} sliderSize={20} noSnap={true} row={false} /></View>
                    <Text style={styles.swatchLabel}>Swatches</Text>
                    <View style={styles.swatchContainer}>
                        {pastelColors.map(color => (<TouchableOpacity key={color} style={[styles.swatch, { backgroundColor: color, borderColor: tinycolor.equals(tempColor, color) ? COLORS.primary : COLORS.border }]} onPress={() => handleColorChange(color)} />))}
                    </View>
                    <View style={styles.hexInputContainer}>
                        <TextInput style={styles.hexInput} value={hexInput} onChangeText={setHexInput} placeholder="#FFFFFF" autoCapitalize="none" />
                        <TouchableOpacity style={styles.applyButton} onPress={applyHexCode}><Text style={styles.applyButtonText}>Apply</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.confirmButton} onPress={() => onColorConfirm(tempColor)}><Text style={styles.confirmButtonText}>Done</Text></TouchableOpacity>
                </View>
            </View>
      </Modal>
    );
};

// --- WIDGET CONFIGURATION ---
type Widget = { key: string; path: string; title: string; icon: React.ReactNode; component: React.FC<any>; height: number; color?: string };
const WIDGETS_TEMPLATE: Widget[] = [
  { key: "calendar-widget", path: "/(root)/(tabs)/calendar", title: "Calendar & To-Do", icon: <Ionicons name="calendar-outline" size={20} color={COLORS.textPrimary} />, component: CalendarWidget, height: 240 },
  { key: "budget-widget", path: "/(root)/(tabs)/budget-page", title: "Budget", icon: <FontAwesome name="money" size={20} color={COLORS.textPrimary} />, component: BudgetWidget, height: 160 },
  { key: "habits-widget", path: "/(root)/(tabs)/habit-tracker-page", title: "Habits", icon: <Ionicons name="checkmark-done-outline" size={20} color={COLORS.textPrimary} />, component: HabitsWidget, height: 160 },
  { key: "mindfulness-widget", path: "/(root)/(tabs)/mindfulness-page", title: "Mindfulness", icon: <Ionicons name="leaf-outline" size={20} color={COLORS.textPrimary} />, component: MindfulnessWidget, height: 160 },
  { key: "meal-planner-widget", path: "/(root)/(tabs)/meal-planner", title: "Meal Planner", icon: <Ionicons name="restaurant-outline" size={20} color={COLORS.textPrimary} />, component: MealPlannerWidget, height: 160 },
  { key: "cycle-tracker-widget", path: "/(root)/(tabs)/cycle", title: "Cycle Tracker", icon: <Ionicons name="female-outline" size={20} color={COLORS.textPrimary} />, component: CycleTrackerWidget, height: 160 },
];
const WIDGETS_STORAGE_KEY = '@user_widgets_layout_v3';
const LAYOUT_STORAGE_KEY = '@user_layout_columns_v3';

const WidgetRenderer = ({ item, isLoading }) => {
    const WidgetComponent = item.component;
    return isLoading ? <SkeletonLoader height={item.height} /> : <WidgetComponent />;
};

export default function Index() {
  const router = useRouter();
  const { isLoading, habits, calendarEvents, mealPlan } = useWellaura();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [numColumns, setNumColumns] = useState(2);
  const [isEditMode, setEditMode] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isSnapshotVisible, setSnapshotVisible] = useState(false);

  useEffect(() => { loadWidgetsAndLayout(); }, []);
  const loadWidgetsAndLayout = async () => { await loadWidgets(); await loadLayout(); };

  const saveWidgets = async (newWidgets: Widget[]) => {
    try {
      const simplified = newWidgets.map(({ component, icon, ...rest }) => rest);
      await AsyncStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(simplified));
      setWidgets(newWidgets);
    } catch (e) { console.error("Failed to save widgets.", e); }
  };

  const loadWidgets = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(WIDGETS_STORAGE_KEY);
      const savedData = jsonValue ? JSON.parse(jsonValue) : null;
      if (Array.isArray(savedData) && savedData.length > 0) {
        const hydrated = savedData.map(saved => {
            const template = WIDGETS_TEMPLATE.find(w => w.key === saved.key);
            return template ? { ...template, ...saved } : null;
        }).filter(Boolean);
        setWidgets(hydrated as Widget[]);
      } else { setWidgets(WIDGETS_TEMPLATE); }
    } catch (e) { console.error("Failed to load widgets.", e); setWidgets(WIDGETS_TEMPLATE); }
  };
  
  const loadLayout = async () => {
    try {
      const layoutValue = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
      if (layoutValue !== null) { setNumColumns(JSON.parse(layoutValue)); }
    } catch(e) { console.error("Failed to load layout setting.", e); }
  };

  const updateWidgetProperty = (key: string, property: 'height' | 'color', value: any) => {
    const newWidgets = widgets.map(w => w.key === key ? { ...w, [property]: value } : w);
    setWidgets(newWidgets);
    saveWidgets(newWidgets);
  };
  
  const openColorPicker = (item: Widget) => { setEditingWidget(item); setPickerVisible(true); };
  const confirmColor = (newColor: string) => { if (editingWidget) { updateWidgetProperty(editingWidget.key, 'color', newColor); } setPickerVisible(false); };

  const todaysData = useMemo(() => {
    const today = moment();
    const dayOfWeek = today.format('dddd');
    const todayEvents = calendarEvents.filter(e => moment(e.start).isSame(today, 'day') && e.type === 'event');
    const todayHabits = habits.filter(h => h.type === 'daily_boolean');
    const todayMeals = mealPlan[dayOfWeek] || { breakfast: {name: '', time: 'N/A'}, lunch: {name: '', time: 'N/A'}, dinner: {name: '', time: 'N/A'} };
    return { todayEvents, todayHabits, todayMeals };
  }, [calendarEvents, habits, mealPlan]);
  
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Widget>) => {
    const height = useSharedValue(item.height);
    const updateHeightInState = (newHeight: number) => { updateWidgetProperty(item.key, 'height', newHeight); };
    const panGestureHandler = useAnimatedGestureHandler({
      onStart: (_, ctx: any) => { ctx.startHeight = height.value; },
      onActive: (e, ctx: any) => { height.value = Math.max(120, ctx.startHeight + e.translationY); },
      onEnd: () => { runOnJS(updateHeightInState)(height.value); },
    });
    const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

    return (
      <View style={[styles.widgetContainer, { width: numColumns === 2 ? "50%" : "100%" }]}>
        <TouchableOpacity onLongPress={isEditMode ? drag : undefined} disabled={!isEditMode} activeOpacity={0.8}>
          <Animated.View style={[styles.card, animatedStyle, { backgroundColor: item.color || COLORS.surface, opacity: isActive ? 0.8 : 1 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>{item.icon}<Text style={styles.cardTitle}>{item.title}</Text></View>
                {isEditMode && (<TouchableOpacity style={styles.editButton} onPress={() => openColorPicker(item)}><Feather name="edit-3" size={16} color={COLORS.textSecondary} /></TouchableOpacity>)}
              </View>
              <TouchableOpacity style={styles.linkArea} disabled={isEditMode} onPress={() => router.push(item.path)}>
                <WidgetRenderer item={item} isLoading={isLoading} />
              </TouchableOpacity>
              {isEditMode && (<PanGestureHandler onGestureEvent={panGestureHandler}><Animated.View style={styles.resizeHandle} /></PanGestureHandler>)}
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <DraggableFlatList
          key={numColumns} data={widgets} renderItem={renderItem} keyExtractor={(item) => item.key}
          numColumns={numColumns} onDragEnd={({ data }) => saveWidgets(data)} dragEnabled={isEditMode}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.headerWelcome}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.headerName}>Welcome back, Laura</Text>
                  <Text style={styles.headerSubtitle}>Here's your wellness snapshot.</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.todayButton} onPress={() => setSnapshotVisible(true)}><Ionicons name="sparkles-outline" size={22} color={COLORS.primary} /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setNumColumns(numColumns === 1 ? 2 : 1)}><Ionicons name={numColumns === 1 ? "grid" : "list"} size={22} color={COLORS.textPrimary} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, isEditMode && styles.mainEditButton]} onPress={() => setEditMode(!isEditMode)}><Feather name={isEditMode ? "check-square" : "edit-3"} size={22} color={isEditMode ? COLORS.white : COLORS.textPrimary} /></TouchableOpacity>
                </View>
              </View>
              <WeatherWidget />
              <InsightsWidget />
            </View>
          }
          ListFooterComponent={ <View style={{ height: 40 }} /> }
        />
      </View>
      <Modal visible={isSnapshotVisible} transparent={true} animationType="fade" onRequestClose={() => setSnapshotVisible(false)}>
        <TodaySnapshot onClose={() => setSnapshotVisible(false)} todayEvents={todaysData.todayEvents} todayHabits={todaysData.todayHabits} todayMeals={todaysData.todayMeals} />
      </Modal>
      <ColorPickerModal 
        isVisible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        initialColor={editingWidget?.color || COLORS.surface}
        onColorConfirm={confirmColor}
      />
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, container: { flex: 1 },
  headerContainer: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 25 : 0, paddingBottom: 16 },
  headerWelcome: { padding: 20, backgroundColor: COLORS.surface, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  headerName: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary }, headerSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mainEditButton: { backgroundColor: COLORS.primary },
  iconButton: { padding: 10, backgroundColor: COLORS.border, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: 42, height: 42 },
  todayButton: { padding: 10, backgroundColor: '#F9731620', borderRadius: 20, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  widgetContainer: { padding: 8 },
  card: { borderRadius: 20, shadowColor: "#9FB1C4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: "hidden", padding: 16 },
  linkArea: { flex: 1, paddingTop: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontWeight: "bold", fontSize: 18, color: COLORS.textPrimary },
  cardText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 }, dateText: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 10 },
  subTitle: { fontWeight: "bold", marginTop: 4, marginBottom: 6, color: COLORS.textPrimary, fontSize: 14 },
  skeleton: { width: '100%', borderRadius: 16, marginTop: 12 },
  resizeHandle: { position: "absolute", bottom: 0, right: 0, width: 30, height: 30, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 4 },
  editButton: { padding: 5, backgroundColor: COLORS.border, borderRadius: 15 },
  insightsCard: { backgroundColor: '#FEF3C7', borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden' },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, },
  insightsContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  insightText: { fontSize: 15, color: '#92400E', lineHeight: 22, marginBottom: 8 },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
  colorModalContainer: { width: "90%", maxHeight: '80%', backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, alignItems: "center" },
  pickerWrapper: { height: 250, width: '100%', marginBottom: 20, },
  swatchLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, alignSelf: 'flex-start', marginBottom: 10 },
  swatchContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  swatch: { width: 36, height: 36, borderRadius: 18, margin: 4, borderWidth: 3 },
  hexInputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  hexInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 10, height: 44, color: COLORS.textPrimary, fontSize: 16, fontWeight: '500' },
  applyButton: { marginLeft: 10, backgroundColor: COLORS.border, paddingHorizontal: 15, height: 44, justifyContent: 'center', borderRadius: 12 },
  applyButtonText: { fontWeight: 'bold', color: COLORS.textPrimary },
  confirmButton: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 40, backgroundColor: COLORS.primary, borderRadius: 20 },
  confirmButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
