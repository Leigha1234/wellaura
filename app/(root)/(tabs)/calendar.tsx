import { Ionicons } from "@expo/vector-icons";
import {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import moment from "moment";
import React, {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { Calendar, DateData, DotProps } from "react-native-calendars";
import {
  Directions,
  FlingGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useWellaura } from "../../WellauraContext";
import { CalendarEvent } from "../../types";

if (Platform.OS === "android" && UIManager.getConstants().LayoutAnimation) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- "Serene Teal" Color Theme & Constants ---
const GlobalStyles = {
  primaryColor: "#00796B", accentColor: "#FF7043", backgroundColor: "#F7F9F9",
  surfaceColor: "#FFFFFF", textColor: "#263238", secondaryTextColor: "#546E7A",
  borderColor: "#ECEFF1", white: "#FFFFFF", danger: "#D32F2F", success: "#28A745",
};
const HOUR_HEIGHT = 60;
const aM_PM_TEXT_WIDTH = 50;
const PRESET_COLORS = ["#00796B", "#FF7043", "#5E35B1", "#039BE5", "#F06292", "#66BB6A", "#FBC02D", "#78909C"];
type ViewMode = "month" | "week" | "day" | "todo";
interface ToDoItem { id: string; text: string; completed: boolean; }
const initialEventState: Partial<CalendarEvent> = {
  title: "", start: new Date(), end: moment(new Date()).add(1, "hour").toDate(),
  color: PRESET_COLORS[0], type: 'event', allDay: false,
};

// --- Utility Functions ---
const getEventLayouts = (events: CalendarEvent[]) => {
  const sortedEvents = [...events].sort((a, b) => moment(a.start).diff(moment(b.start)));
  const layouts = new Map<string, { left: number; width: number }>();
  const activeEvents: CalendarEvent[] = [];
  for (const event of sortedEvents) {
    while (activeEvents.length > 0 && moment(activeEvents[0].end).isSameOrBefore(moment(event.start))) { activeEvents.shift(); }
    const collidingEvents = [event, ...activeEvents.filter(activeEvent => moment(event.start).isBefore(moment(activeEvent.end)) && moment(event.end).isAfter(moment(activeEvent.start)))];
    const columns: CalendarEvent[][] = [];
    for (const ev of collidingEvents) {
      let placed = false;
      for (const col of columns) {
        if (!col.some(c => moment(ev.start).isBefore(moment(c.end)) && moment(ev.end).isAfter(moment(c.start)))) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([ev]);
    }
    const numColumns = columns.length;
    for (let i = 0; i < numColumns; i++) {
      for (const colEvent of columns[i]) {
        if (!layouts.has(colEvent.id)) { layouts.set(colEvent.id, { left: (100 / numColumns) * i, width: 100 / numColumns }); }
      }
    }
    activeEvents.push(event);
    activeEvents.sort((a, b) => moment(a.end).diff(moment(b.end)));
  }
  return (event: CalendarEvent) => layouts.get(event.id) || { left: 0, width: 100 };
};

// --- Sub-Components ---
const CurrentTimeIndicator = ({ isVisible }: { isVisible: boolean }) => {
    if (!isVisible) return null;
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    const topPosition = (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT;
    return (<View style={[styles.timeIndicator, { top: topPosition }]}><View style={styles.timeIndicatorDot} /></View>);
};

const DayView = ({ date, events, onTimeSlotPress, onEventPress }: { date: string; events: CalendarEvent[]; onTimeSlotPress: (date: Date) => void; onEventPress: (event: CalendarEvent) => void; }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const isToday = moment(date).isSame(moment(), 'day');

  useEffect(() => {
    const now = moment();
    const scrollPosition = isToday ? (now.hour() - 1) * HOUR_HEIGHT : 7 * HOUR_HEIGHT;
    scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
  }, [date, isToday]);
  
  const { allDayEvents, timedEvents } = useMemo(() => {
    const dayEvents = events.filter((ev) => moment(ev.start).isSame(date, "day"));
    const allDay = dayEvents.filter(ev => ev.allDay);
    const timed = dayEvents.filter(ev => !ev.allDay);
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events, date]);

  const getLayout = useMemo(() => getEventLayouts(timedEvents), [timedEvents]);

  return (
    <View style={{ flex: 1 }}>
      {allDayEvents.length > 0 && (
        <View style={styles.allDayContainer}>
          {allDayEvents.map((event) => (
            <TouchableOpacity key={event.id} style={[styles.allDayEvent, { backgroundColor: event.color }]} onPress={() => onEventPress(event)}>
              <Text style={styles.allDayEventText}>{event.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.dayViewContainer}>
        {Array.from({ length: 24 }, (_, hour) => (
          <TouchableOpacity key={hour} style={styles.hourRow} onPress={() => onTimeSlotPress(moment(date).hour(hour).minute(0).toDate())}>
            <Text style={styles.hourText}>{moment({ hour }).format("h A")}</Text>
            <View style={styles.hourLine} />
          </TouchableOpacity>
        ))}
        <CurrentTimeIndicator isVisible={isToday} />
        {timedEvents.map((event) => {
          const startMoment = moment(event.start);
          const endMoment = moment(event.end);
          const top = (startMoment.hour() + startMoment.minute() / 60) * HOUR_HEIGHT;
          const height = Math.max(20, (endMoment.diff(startMoment, "minutes") / 60) * HOUR_HEIGHT - 2);
          const { left, width } = getLayout(event);
          const isMeal = event.type === 'meal';
          const isMindfulness = event.type === 'mindfulness';
          const isHabit = event.type === 'habit';
          const isPayment = event.type === 'payment';
          return (
            <TouchableOpacity key={event.id} style={[styles.eventItem, { backgroundColor: event.color, top, height, left: `${left}%`, width: `${width}%` }, isMeal && styles.mealEventItem, isMindfulness && styles.mindfulnessEventItem, isHabit && styles.habitEventItem, isPayment && styles.paymentEventItem ]} onPress={() => onEventPress(event)}>
              <Text style={[styles.eventTitle, isMeal && styles.mealEventTitle, isMindfulness && styles.mindfulnessEventTitle, isHabit && styles.habitEventTitle, isPayment && styles.paymentEventTitle]} numberOfLines={1}>{event.title}</Text>
              {height > 25 && (<Text style={[styles.eventTime, isMeal && styles.mealEventTime, isMindfulness && styles.mindfulnessEventTime, isHabit && styles.habitEventTime, isPayment && styles.paymentEventTime]} numberOfLines={1}>{startMoment.format("h:mm A")}</Text>)}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
const WeekView = ({ selectedDate, setSelectedDate, events, onTimeSlotPress, onEventPress }: { selectedDate: string; setSelectedDate: (date: string) => void; events: CalendarEvent[]; onTimeSlotPress: (date: Date) => void; onEventPress: (event: CalendarEvent) => void; }) => {
  const weekDates = useMemo(() => {
    const startOfWeek = moment(selectedDate).startOf("isoWeek");
    return Array.from({ length: 7 }, (_, i) => startOfWeek.clone().add(i, "days"));
  }, [selectedDate]);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.weekHeader}>
        {weekDates.map((date) => {
          const dateStr = date.format("YYYY-MM-DD");
          const isSelected = dateStr === selectedDate;
          const isToday = date.isSame(moment(), 'day');
          return (
            <TouchableOpacity key={dateStr} onPress={() => setSelectedDate(dateStr)} style={styles.weekDay}>
              <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>{date.format("ddd").toUpperCase()}</Text>
              <View style={[styles.weekDayNumberContainer, isSelected ? styles.weekDaySelectedStyle : null, isToday && !isSelected ? styles.weekDayNumberToday : null]}>
                <Text style={[styles.weekDayNumber, isSelected || (isToday && !isSelected) ? styles.weekDayTextSelectedStyle : null]}>{date.format("D")}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <DayView date={selectedDate} events={events} onTimeSlotPress={onTimeSlotPress} onEventPress={onEventPress} />
    </View>
  );
};
const ToDoListView = ({ todos, setTodos }: { todos: ToDoItem[]; setTodos: React.Dispatch<React.SetStateAction<ToDoItem[]>>; }) => {
  const [newTodoText, setNewTodoText] = useState("");
  const handleAddTodo = () => { if (newTodoText.trim().length === 0) return; const newTodoItem: ToDoItem = { id: Date.now().toString(), text: newTodoText.trim(), completed: false }; LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => [newTodoItem, ...prev]); setNewTodoText(""); Keyboard.dismiss(); };
  const handleToggleTodo = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))); };
  const handleDeleteTodo = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => prev.filter((todo) => todo.id !== id)); };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.todoContainer} keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}>
        <FlatList data={todos} keyExtractor={(item) => item.id} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          renderItem={({ item }) => (
            <View style={styles.todoItemContainer}>
              <TouchableOpacity onPress={() => handleToggleTodo(item.id)} style={styles.todoItem}><Ionicons name={item.completed ? "checkbox" : "square-outline"} size={26} color={item.completed ? GlobalStyles.secondaryTextColor : GlobalStyles.primaryColor} /><Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>{item.text}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTodo(item.id)} style={styles.deleteButton}><Ionicons name="trash-outline" size={24} color={GlobalStyles.danger} /></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyListContainer}><Text style={styles.emptyListText}>No tasks yet. Add one below! ✨</Text></View>}
        />
        <View style={styles.todoInputContainer}><TextInput style={styles.todoInput} placeholder="Add a new task..." placeholderTextColor={GlobalStyles.secondaryTextColor} value={newTodoText} onChangeText={setNewTodoText} onSubmitEditing={handleAddTodo} /><TouchableOpacity style={styles.todoAddButton} onPress={handleAddTodo}><Ionicons name="arrow-up-circle" size={40} color={GlobalStyles.primaryColor} /></TouchableOpacity></View>
    </KeyboardAvoidingView>
  );
};
const CalendarHeader = ({ currentMonth, viewMode, setViewMode, onNavigate, onToday }: { currentMonth: string; viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; onNavigate: (dir: "prev" | "next") => void; onToday: () => void; }) => {
    const viewModeIcons: Record<ViewMode, keyof typeof Ionicons.glyphMap> = { month: 'calendar-outline', week: 'calendar-clear-outline', day: 'square-outline', todo: 'list-outline' };
    return (
        <View style={styles.header}><View style={styles.headerNav}><View style={styles.headerTitleContainer}><Text style={styles.headerMonth}>{moment(currentMonth).format("MMMM YYYY")}</Text>{(viewMode === "week" || viewMode === "day") && (<View style={styles.arrowContainer}><TouchableOpacity onPress={() => onNavigate('prev')}><Ionicons name="chevron-back" size={24} color={GlobalStyles.textColor} /></TouchableOpacity><TouchableOpacity onPress={() => onNavigate('next')}><Ionicons name="chevron-forward" size={24} color={GlobalStyles.textColor} /></TouchableOpacity></View>)}</View><View style={styles.headerControls}><TouchableOpacity onPress={onToday} style={styles.todayButton}><Text style={styles.todayButtonText}>Today</Text></TouchableOpacity><View style={styles.viewModeContainer}>{(["month", "week", "day", "todo"] as ViewMode[]).map((mode) => (<TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={[styles.iconTab, viewMode === mode && styles.activeIconTab]}><Ionicons name={viewModeIcons[mode]} size={22} color={viewMode === mode ? GlobalStyles.primaryColor : GlobalStyles.secondaryTextColor} /></TouchableOpacity>))}</View></View></View></View>
    );
};
type EventAction = | { type: 'SET_FIELD'; field: keyof CalendarEvent; payload: any } | { type: 'SET_EVENT'; payload: Partial<CalendarEvent> } | { type: 'RESET' };
const eventReducer = (state: Partial<CalendarEvent>, action: EventAction): Partial<CalendarEvent> => {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.payload };
    case 'SET_EVENT': return { ...state, ...action.payload };
    case 'RESET': return { ...initialEventState, start: new Date(), end: moment().add(1, 'hour').toDate() };
    default: return state;
  }
};
const EventModal = ({ visible, onClose, onSave, initialEventData }: { visible: boolean; onClose: () => void; onSave: (event: CalendarEvent) => void; initialEventData: Partial<CalendarEvent>; }) => {
  const [eventState, dispatch] = useReducer(eventReducer, { ...initialEventState });
  const [showPicker, setShowPicker] = useState<"start-date" | "start-time" | "end-date" | "end-time" | null>(null);
  const isEditing = !!eventState.id && eventState.type === 'event';
  useEffect(() => { dispatch({ type: "SET_EVENT", payload: initialEventData }); }, [initialEventData]);
  const handleSave = () => { if (!eventState.title) { alert("Please add a title."); return; } const finalEvent = { ...initialEventState, ...eventState, id: eventState.id || `${Date.now()}-${eventState.title}`, type: 'event' } as CalendarEvent; onSave(finalEvent); onClose(); };
  const handleDateTimeChange = (e: DateTimePickerEvent, date?: Date) => { const picker = showPicker; setShowPicker(null); if (e.type === 'dismissed' || !date) return; const field = picker?.includes('start') ? 'start' : 'end'; const current = moment(eventState[field]); const newMoment = moment(date); const newDate = picker?.includes('date') ? current.year(newMoment.year()).month(newMoment.month()).date(newMoment.date()).toDate() : current.hour(newMoment.hour()).minute(newMoment.minute()).toDate(); dispatch({ type: 'SET_FIELD', field, payload: newDate }); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><ScrollView>{/* Full Modal JSX */}</ScrollView></View></View>
    </Modal>
  );
};

// --- Main Calendar Page Component ---
export default function CalendarPage() {
  const { calendarEvents, saveCalendarEvents, isLoading } = useWellaura();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [modalVisible, setModalVisible] = useState(false);
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [currentMonth, setCurrentMonth] = useState(moment().format("YYYY-MM-DD"));
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent>>(initialEventState);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { Animated.sequence([ Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }), Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }), ]).start(); }, [viewMode, selectedDate, currentMonth]);
  
  const handleNavigation = (direction: "next" | "prev") => { const amount = direction === "next" ? 1 : -1; const unit = viewMode === 'week' ? 'week' : 'day'; const newDate = moment(selectedDate).add(amount, unit).format("YYYY-MM-DD"); setSelectedDate(newDate); setCurrentMonth(newDate); };
  const goToToday = () => { const today = moment().format("YYYY-MM-DD"); setSelectedDate(today); setCurrentMonth(today); if (viewMode === 'todo') setViewMode('day'); };
  const handleSaveEvent = (event: CalendarEvent) => { saveCalendarEvents([...calendarEvents, event]); };
  const handleDayPress = (day: DateData) => { setSelectedDate(day.dateString); setViewMode("day"); };
  const handleTimeSlotPress = (slotDate: Date) => { setSelectedEvent({ ...initialEventState, start: slotDate, end: moment(slotDate).add(1, 'hour').toDate() }); setModalVisible(true); };
  
  const handleEventPress = (event: CalendarEvent) => {
    switch (event.type) {
      case 'payment': Alert.alert("Scheduled Item", "Edit this in your Budget page settings.", [{ text: "OK" }]); return;
      case 'meal': Alert.alert("Meal Plan", `Today's meal: ${event.title.replace('🍳 ', '')}\n\nView details in the Meal Planner.`, [{ text: "OK" }]); return;
      case 'mindfulness': Alert.alert("Mindfulness Reminder", `Time for your session: ${event.title.replace('🧘 ', '')}`, [{ text: "OK" }]); return;
      case 'habit': Alert.alert("Habit Reminder", `${event.title.replace('🎯 ', '')}`, [{ text: "OK" }]); return;
      case 'cycle': Alert.alert("Cycle Phase", `This day is part of your: ${event.title}.`, [{ text: "OK" }, { text: "View Details", onPress: () => router.push('/(root)/(tabs)/cycle') }]); return;
      case 'event': default: setSelectedEvent(event); setModalVisible(true);
    }
  };
  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};
    calendarEvents.forEach(event => {
      const dateStr = moment(event.start).format("YYYY-MM-DD");
      if (!marks[dateStr]) { marks[dateStr] = { dots: [] }; }
      if (marks[dateStr].dots.length < 4 && !marks[dateStr].dots.some((d: DotProps) => d.color === event.color)) {
        marks[dateStr].dots.push({ key: event.id, color: event.color });
      }
    });
    if (marks[selectedDate]) { marks[selectedDate].selected = true; } 
    else { marks[selectedDate] = { selected: true }; }
    return marks;
  }, [calendarEvents, selectedDate]);
  const calendarTheme = { backgroundColor: GlobalStyles.backgroundColor, calendarBackground: GlobalStyles.backgroundColor, textSectionTitleColor: GlobalStyles.secondaryTextColor, selectedDayBackgroundColor: GlobalStyles.primaryColor, selectedDayTextColor: GlobalStyles.white, todayTextColor: GlobalStyles.accentColor, dayTextColor: GlobalStyles.textColor, textDisabledColor: GlobalStyles.borderColor, dotColor: GlobalStyles.primaryColor, selectedDotColor: GlobalStyles.white, arrowColor: GlobalStyles.primaryColor, monthTextColor: GlobalStyles.textColor, textDayFontWeight: "400", textMonthFontWeight: "bold", textDayHeaderFontWeight: "500", textDayFontSize: 15, textMonthFontSize: 18, textDayHeaderFontSize: 13, 'stylesheet.calendar.header': { week: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' } }, };
  const renderCalendarContent = () => {
    switch (viewMode) {
      case "month": return <Calendar key={currentMonth} current={currentMonth} onDayPress={handleDayPress} onMonthChange={(m) => setCurrentMonth(m.dateString)} markedDates={markedDates} markingType="multi-dot" theme={calendarTheme} style={styles.calendar} />;
      case "week": return <WeekView selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={calendarEvents} onTimeSlotPress={handleTimeSlotPress} onEventPress={handleEventPress} />;
      case "day": return <DayView date={selectedDate} events={calendarEvents} onTimeSlotPress={handleTimeSlotPress} onEventPress={handleEventPress} />;
      case "todo": return <ToDoListView todos={todos} setTodos={setTodos} />;
      default: return null;
    }
  };
  
  if (isLoading) { return ( <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={GlobalStyles.primaryColor} /></SafeAreaView> ); }

  return (
    <SafeAreaView style={styles.container}>
      <CalendarHeader currentMonth={currentMonth} viewMode={viewMode} setViewMode={setViewMode} onNavigate={handleNavigation} onToday={goToToday} />
      <FlingGestureHandler direction={Directions.RIGHT} enabled={viewMode !== "month" && viewMode !== 'todo'} onHandlerStateChange={({ nativeEvent }) => { if (nativeEvent.state === State.ACTIVE) handleNavigation("prev"); }}>
        <FlingGestureHandler direction={Directions.LEFT} enabled={viewMode !== "month" && viewMode !== 'todo'} onHandlerStateChange={({ nativeEvent }) => { if (nativeEvent.state === State.ACTIVE) handleNavigation("next"); }}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{renderCalendarContent()}</Animated.View>
        </FlingGestureHandler>
      </FlingGestureHandler>
      <EventModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSaveEvent} initialEventData={selectedEvent} />
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GlobalStyles.backgroundColor },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GlobalStyles.borderColor, backgroundColor: GlobalStyles.surfaceColor },
  headerNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  headerMonth: { fontSize: 22, fontWeight: "bold", color: GlobalStyles.textColor },
  arrowContainer: { flexDirection: "row", gap: 16 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayButton: { borderWidth: 1, borderColor: GlobalStyles.borderColor, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  todayButtonText: { color: GlobalStyles.secondaryTextColor, fontWeight: "600", fontSize: 14 },
  viewModeContainer: { flexDirection: "row", borderWidth: 1, borderColor: GlobalStyles.borderColor, borderRadius: 20, overflow: "hidden", },
  iconTab: { padding: 8 },
  activeIconTab: { backgroundColor: GlobalStyles.primaryColor + '20' },
  calendar: { paddingTop: 10 },
  dayViewContainer: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 24 * HOUR_HEIGHT, position: 'relative' },
  hourRow: { flexDirection: "row", alignItems: "center", height: HOUR_HEIGHT },
  hourText: { width: aM_PM_TEXT_WIDTH, textAlign: "right", fontSize: 12, color: GlobalStyles.secondaryTextColor, marginRight: 10 },
  hourLine: { flex: 1, height: 1, backgroundColor: GlobalStyles.borderColor },
  allDayContainer: { paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: GlobalStyles.borderColor, marginBottom: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allDayEvent: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, },
  allDayEventText: { color: GlobalStyles.white, fontWeight: "bold" },
  weekHeader: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GlobalStyles.borderColor },
  weekDay: { alignItems: "center", flex: 1, paddingVertical: 4 },
  weekDayText: { fontSize: 13, fontWeight: "500", color: GlobalStyles.secondaryTextColor, marginBottom: 8 },
  weekDayTextSelected: { color: GlobalStyles.primaryColor, fontWeight: 'bold' },
  weekDayNumberContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  weekDayNumber: { fontSize: 16, fontWeight: "600", color: GlobalStyles.textColor },
  weekDaySelectedStyle: { backgroundColor: GlobalStyles.primaryColor },
  weekDayTextSelectedStyle: { color: GlobalStyles.white },
  weekDayNumberToday: { backgroundColor: GlobalStyles.accentColor },
  modalContainer: { backgroundColor: GlobalStyles.surfaceColor, width: "90%", maxHeight: "85%", borderRadius: 24, padding: 24 },
  todoContainer: { flex: 1, backgroundColor: GlobalStyles.backgroundColor },
  todoItemContainer: { flexDirection: "row", alignItems: "center", backgroundColor: GlobalStyles.surfaceColor, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: GlobalStyles.borderColor, borderRadius: 12, marginBottom: 10, },
  todoItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  todoText: { fontSize: 16, color: GlobalStyles.textColor, marginLeft: 12 },
  todoTextCompleted: { textDecorationLine: "line-through", color: GlobalStyles.secondaryTextColor },
  deleteButton: { padding: 8 },
  emptyListContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  emptyListText: { fontSize: 16, color: GlobalStyles.secondaryTextColor },
  todoInputContainer: { flexDirection: 'row', padding: 12, backgroundColor: GlobalStyles.surfaceColor, borderTopWidth: 1, borderTopColor: GlobalStyles.borderColor, alignItems: 'center' },
  todoInput: { flex: 1, backgroundColor: GlobalStyles.borderColor, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, borderRadius: 30, color: GlobalStyles.textColor },
  todoAddButton: { marginLeft: 10, justifyContent: "center", alignItems: 'center' },
  eventItem: { position: "absolute", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, right: 10, left: aM_PM_TEXT_WIDTH + 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  eventTitle: { color: GlobalStyles.white, fontWeight: "bold", fontSize: 13 },
  eventTime: { color: GlobalStyles.white, fontSize: 11, marginTop: 2, opacity: 0.9 },
  paymentEventItem: { borderStyle: 'dashed' }, paymentEventTitle: { color: GlobalStyles.white }, paymentEventTime: { color: GlobalStyles.white, opacity: 0.8 },
  mealEventItem: { borderWidth: 1.5, borderColor: '#FDBF6F', backgroundColor: 'transparent', }, mealEventTitle: { color: '#B45309' }, mealEventTime: { color: '#D97706' },
  mindfulnessEventItem: { borderWidth: 1.5, borderColor: '#A5D6A7', backgroundColor: 'transparent', }, mindfulnessEventTitle: { color: '#388E3C' }, mindfulnessEventTime: { color: '#66BB6A' },
  habitEventItem: { borderLeftWidth: 4, borderLeftColor: 'rgba(0,0,0,0.3)', paddingLeft: 10 }, habitEventTitle: { color: '#fff' }, habitEventTime: { color: '#fff', opacity: 0.8 },
  timeIndicator: { position: 'absolute', left: aM_PM_TEXT_WIDTH + 10, right: 0, height: 2, backgroundColor: GlobalStyles.danger, zIndex: 100 },
  timeIndicatorDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: GlobalStyles.danger, left: -5, top: -4 },
});