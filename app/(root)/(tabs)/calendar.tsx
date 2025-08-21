import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { Calendar, DateData } from "react-native-calendars";
import {
  Directions,
  FlingGestureHandler,
  State,
} from "react-native-gesture-handler";
import tinycolor from "tinycolor2";
import { useMealPlan } from "../../../app/context/MealPlanContext"; // 1. Import the meal plan context
import { useTheme } from "../../../app/context/ThemeContext";
import { useWellaura } from "../../WellauraContext";
import { CalendarEvent } from "../../types";

if (Platform.OS === "android" && UIManager.getConstants().LayoutAnimation) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS ---
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
const CurrentTimeIndicator = ({ isVisible, styles }) => {
    if (!isVisible) return null;
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);
    const topPosition = (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT;
    return (<View style={[styles.timeIndicator, { top: topPosition }]}><View style={styles.timeIndicatorDot} /></View>);
};

const DayView = ({ date, events, onTimeSlotPress, onEventPress, styles, theme }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const isToday = moment(date).isSame(moment(), 'day');

  useEffect(() => {
    const now = moment();
    const scrollPosition = isToday ? (now.hour() - 1) * HOUR_HEIGHT : 7 * HOUR_HEIGHT;
    scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
  }, [date, isToday]);
  
  const { allDayEvents, timedEvents } = useMemo(() => {
    const dayEvents = events.filter((ev) => moment(ev.start).isSame(date, "day"));
    return { allDayEvents: dayEvents.filter(ev => ev.allDay), timedEvents: dayEvents.filter(ev => !ev.allDay) };
  }, [events, date]);

  const getLayout = useMemo(() => getEventLayouts(timedEvents), [timedEvents]);

  return (
    <View style={{ flex: 1 }}>
      {allDayEvents.length > 0 && (
        <View style={styles.allDayContainer}>
          {allDayEvents.map((event) => (
            <TouchableOpacity key={event.id} style={[styles.allDayEvent, { backgroundColor: event.color }]} onPress={() => onEventPress(event)}>
              <Text style={[styles.allDayEventText, { color: tinycolor(event.color || '#ffffff').isDark() ? theme.white : theme.textPrimary }]}>{event.title}</Text>
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
        <View style={styles.eventsContainer}>
            <CurrentTimeIndicator isVisible={isToday} styles={styles} />
            {timedEvents.map((event) => {
              const startMoment = moment(event.start);
              const endMoment = moment(event.end);
              const top = (startMoment.hour() + startMoment.minute() / 60) * HOUR_HEIGHT;
              const height = Math.max(20, (endMoment.diff(startMoment, "minutes") / 60) * HOUR_HEIGHT - 2);
              const { left, width } = getLayout(event);
              const isMeal = event.type === 'meal';
              const eventTextColor = tinycolor(event.color || '#ffffff').isDark() ? theme.white : theme.textPrimary;
              return (
                <TouchableOpacity key={event.id} style={[styles.eventItem, { backgroundColor: event.color, top, height, left: `${left}%`, width: `${width}%` }, isMeal && styles.mealEventItem ]} onPress={() => onEventPress(event)}>
                  <Text style={[styles.eventTitle, {color: eventTextColor}, isMeal && styles.mealEventTitle]} numberOfLines={1}>{event.title}</Text>
                  {height > 25 && (<Text style={[styles.eventTime, {color: eventTextColor, opacity: 0.8}, isMeal && styles.mealEventTime]} numberOfLines={1}>{startMoment.format("h:mm A")}</Text>)}
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
};
const WeekView = ({ selectedDate, setSelectedDate, events, onTimeSlotPress, onEventPress, styles, theme }) => {
  const weekDates = useMemo(() => { const startOfWeek = moment(selectedDate).startOf("isoWeek"); return Array.from({ length: 7 }, (_, i) => startOfWeek.clone().add(i, "days")); }, [selectedDate]);
  return (
    <View style={{ flex: 1 }}><View style={styles.weekHeader}>{weekDates.map((date) => { const dateStr = date.format("YYYY-MM-DD"); const isSelected = dateStr === selectedDate; const isToday = date.isSame(moment(), 'day'); return ( <TouchableOpacity key={dateStr} onPress={() => setSelectedDate(dateStr)} style={styles.weekDay}><Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>{date.format("ddd").toUpperCase()}</Text><View style={[styles.weekDayNumberContainer, isSelected ? styles.weekDaySelectedStyle : null, isToday && !isSelected ? styles.weekDayNumberToday : null]}><Text style={[styles.weekDayNumber, isSelected || (isToday && !isSelected) ? styles.weekDayTextSelectedStyle : null]}>{date.format("D")}</Text></View></TouchableOpacity> ); })}</View><DayView date={selectedDate} events={events} onTimeSlotPress={onTimeSlotPress} onEventPress={onEventPress} styles={styles} theme={theme} /></View>
  );
};
const ToDoListView = ({ todos, setTodos, styles, theme }) => {
  const [newTodoText, setNewTodoText] = useState("");
  const handleAddTodo = () => { if (newTodoText.trim().length === 0) return; const newTodoItem: ToDoItem = { id: Date.now().toString(), text: newTodoText.trim(), completed: false }; LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => [newTodoItem, ...prev]); setNewTodoText(""); Keyboard.dismiss(); };
  const handleToggleTodo = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))); };
  const handleDeleteTodo = (id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setTodos((prev) => prev.filter((todo) => todo.id !== id)); };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.todoContainer} keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}>
        <FlatList data={todos} keyExtractor={(item) => item.id} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          renderItem={({ item }) => (
            <View style={styles.todoItemContainer}><TouchableOpacity onPress={() => handleToggleTodo(item.id)} style={styles.todoItem}><Ionicons name={item.completed ? "checkbox" : "square-outline"} size={26} color={item.completed ? theme.textSecondary : theme.primary} /><Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>{item.text}</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDeleteTodo(item.id)} style={styles.deleteButton}><Ionicons name="trash-outline" size={24} color={'#D32F2F'} /></TouchableOpacity></View>
          )}
          ListEmptyComponent={<View style={styles.emptyListContainer}><Text style={styles.emptyListText}>No tasks yet. Add one below! ✨</Text></View>}
        />
        <View style={styles.todoInputContainer}><TextInput style={styles.todoInput} placeholder="Add a new task..." placeholderTextColor={theme.textSecondary} value={newTodoText} onChangeText={setNewTodoText} onSubmitEditing={handleAddTodo} /><TouchableOpacity style={styles.todoAddButton} onPress={handleAddTodo}><Ionicons name="arrow-up-circle" size={40} color={theme.primary} /></TouchableOpacity></View>
    </KeyboardAvoidingView>
  );
};
const CalendarHeader = ({ currentMonth, viewMode, setViewMode, onNavigate, onToday, styles, theme }) => {
    const viewModeIcons: Record<ViewMode, keyof typeof Ionicons.glyphMap> = { month: 'calendar-outline', week: 'calendar-clear-outline', day: 'square-outline', todo: 'list-outline' };
    return (
        <View style={styles.header}>
            <View style={styles.headerNav}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerMonth}>{moment(currentMonth).format("MMMM YYYY")}</Text>
                </View>
                <View style={styles.headerControls}>
                    <TouchableOpacity onPress={onToday} style={styles.todayButton}>
                        <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                    <View style={styles.viewModeContainer}>
                        {(["month", "week", "day", "todo"] as ViewMode[]).map((mode) => (
                            <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={[styles.iconTab, viewMode === mode && styles.activeIconTab]}>
                                <Ionicons name={viewModeIcons[mode]} size={22} color={viewMode === mode ? theme.primary : theme.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
};

type EventAction = | { type: 'SET_FIELD'; field: keyof CalendarEvent; payload: any } | { type: 'SET_EVENT'; payload: Partial<CalendarEvent> } | { type: 'RESET' };
const eventReducer = (state: Partial<CalendarEvent>, action: EventAction): Partial<CalendarEvent> => { switch (action.type) { case 'SET_FIELD': return { ...state, [action.field]: action.payload }; case 'SET_EVENT': return { ...state, ...action.payload }; case 'RESET': return { ...initialEventState, start: new Date(), end: moment().add(1, 'hour').toDate() }; default: return state; } };

const EventModal = ({ visible, onClose, onSave, initialEventData, styles }) => {
  const [eventState, dispatch] = useReducer(eventReducer, { ...initialEventState });
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState<"start-date" | "start-time" | "end-date" | "end-time" | null>(null);
  const colorScrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);

  const themeColors = useMemo(() => [theme.primary || '#ffffff', theme.accent || '#ffffff', tinycolor(theme.primary || '#ffffff').saturate(50).toHexString(), tinycolor(theme.accent || '#ffffff').saturate(50).toHexString()], [theme]);
  const allPresetColors = useMemo(() => [...new Set([...themeColors, ...PRESET_COLORS])], [themeColors]);

  useEffect(() => {
    const dataToUse = initialEventData || {};
    const initialColor = dataToUse.color || initialEventState.color;
    dispatch({ type: "SET_EVENT", payload: { ...initialEventState, ...dataToUse, color: initialColor }});
    setTimeout(() => {
      const initialColorIndex = allPresetColors.indexOf(initialColor);
      if (initialColorIndex !== -1 && colorScrollViewRef.current) { colorScrollViewRef.current.scrollTo({ x: initialColorIndex * 48 - (styles.modalContainer.width * 0.5) + 24, animated: true }); }
      titleInputRef.current?.focus();
    }, 100);
  }, [initialEventData, allPresetColors]);
  
  const handleSave = () => { if (!eventState.title) { Alert.alert("Please add a title."); return; } const finalEvent = { ...initialEventState, ...eventState, id: eventState.id || `${Date.now()}-${eventState.title}`, type: 'event' } as CalendarEvent; onSave(finalEvent); onClose(); };
  const handleDelete = () => { Alert.alert( "Delete Event", "Are you sure you want to delete this event?", [ { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { onSave({ ...eventState, id: eventState.id, isDeleted: true }); onClose(); } }, ], { cancelable: true } ); };
  const handleDateTimeChange = (e: DateTimePickerEvent, date?: Date) => { const picker = showPicker; setShowPicker(null); if (e.type === 'dismissed' || !date) return; const field = picker?.includes('start') ? 'start' : 'end'; const current = moment(eventState[field]); const newMoment = moment(date); const newDate = picker?.includes('date') ? current.year(newMoment.year()).month(newMoment.month()).date(newMoment.date()).toDate() : current.hour(newMoment.hour()).minute(newMoment.minute()).toDate(); dispatch({ type: 'SET_FIELD', field, payload: newDate }); };
  const toggleAllDay = () => { dispatch({ type: 'SET_FIELD', field: 'allDay', payload: !eventState.allDay }); };
  const isEditing = !!eventState.id && eventState.id.length > 15;
  const isAllDay = eventState.allDay;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close-circle-outline" size={32} color={theme.textSecondary} /></TouchableOpacity><Text style={styles.modalTitle}>{isEditing ? "Edit Event" : "Add Event"}</Text><TouchableOpacity onPress={handleSave} style={styles.saveButton}><Ionicons name="checkmark-circle-outline" size={32} color={theme.primary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View style={styles.inputGroup}><Text style={styles.label}>Title</Text><TextInput ref={titleInputRef} style={styles.textInput} placeholder="Add title" placeholderTextColor={theme.textSecondary} value={eventState.title} onChangeText={text => dispatch({ type: 'SET_FIELD', field: 'title', payload: text })} maxLength={100} /></View>
              <View style={[styles.allDayContainer, { marginBottom: 12, paddingVertical: 0 }]}><Text style={styles.label}>All-day event</Text><TouchableOpacity onPress={toggleAllDay}><Ionicons name={isAllDay ? "toggle-sharp" : "toggle-outline"} size={36} color={isAllDay ? theme.primary : theme.textSecondary} /></TouchableOpacity></View>
              {!isAllDay && (
                <>
                  <View style={styles.inputGroup}><Text style={styles.label}>Starts</Text><View style={styles.dateTimeRow}><TouchableOpacity onPress={() => setShowPicker("start-date")} style={styles.dateTimePicker}><Ionicons name="calendar-outline" size={20} color={theme.primary} /><Text style={styles.dateText}>{moment(eventState.start).format("ddd, MMM D, YYYY")}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPicker("start-time")} style={styles.dateTimePicker}><Ionicons name="time-outline" size={20} color={theme.primary} /><Text style={styles.dateText}>{moment(eventState.start).format("h:mm A")}</Text></TouchableOpacity></View></View>
                  <View style={styles.inputGroup}><Text style={styles.label}>Ends</Text><View style={styles.dateTimeRow}><TouchableOpacity onPress={() => setShowPicker("end-date")} style={styles.dateTimePicker}><Ionicons name="calendar-outline" size={20} color={theme.primary} /><Text style={styles.dateText}>{moment(eventState.end).format("ddd, MMM D, YYYY")}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPicker("end-time")} style={styles.dateTimePicker}><Ionicons name="time-outline" size={20} color={theme.primary} /><Text style={styles.dateText}>{moment(eventState.end).format("h:mm A")}</Text></TouchableOpacity></View></View>
                </>
              )}
              {showPicker && ( <DateTimePicker value={moment(eventState[showPicker.includes('start') ? 'start' : 'end']).toDate()} mode={showPicker.includes('date') ? "date" : "time"} display={Platform.OS === 'ios' ? "spinner" : "default"} onChange={handleDateTimeChange} /> )}
              <View style={styles.colorPickerContainer}><Text style={styles.label}>Choose Color</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} ref={colorScrollViewRef} contentContainerStyle={{ paddingVertical: 4 }}>{allPresetColors.map(color => ( <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color, borderWidth: eventState.color === color ? 3 : 0 }]} onPress={() => dispatch({ type: 'SET_FIELD', field: 'color', payload: color })}/> ))}</ScrollView></View>
              <View style={styles.inputGroup}><Text style={styles.label}>Notes (Optional)</Text><TextInput style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Add notes" placeholderTextColor={theme.textSecondary} value={eventState.notes} onChangeText={text => dispatch({ type: 'SET_FIELD', field: 'notes', payload: text })} multiline /></View>
              {isEditing && ( <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonContainer}><Ionicons name="trash-outline" size={24} color={theme.error} /><Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Event</Text></TouchableOpacity> )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};


// --- Main Calendar Page Component ---
export default function CalendarPage() {
  const { calendarEvents, saveCalendarEvents, isLoading } = useWellaura();
  const { theme } = useTheme();
  const { localMealPlan, findMealById } = useMealPlan();
  const styles = getDynamicStyles(theme);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [modalVisible, setModalVisible] = useState(false);
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [currentMonth, setCurrentMonth] = useState(moment().format("YYYY-MM-DD"));
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent>>(initialEventState);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const mealEvents = useMemo(() => {
    if (!localMealPlan) return [];
    
    const events: CalendarEvent[] = [];
    const startOfWeek = moment(selectedDate).startOf('isoWeek');

    for (let i = 0; i < 7; i++) {
        const date = startOfWeek.clone().add(i, 'days');
        const dayName = date.format('dddd');
        const dayPlan = localMealPlan[dayName];

        if (dayPlan) {
            Object.keys(dayPlan).forEach(mealType => {
                const meals = Array.isArray(dayPlan[mealType]) ? dayPlan[mealType] : [dayPlan[mealType]];
                
                meals.forEach((meal, index) => {
                    if (meal && meal.id) {
                        const mealDetails = findMealById(meal.id);
                        if (mealDetails) {
                            const mealTime = moment(meal.time, "HH:mm");
                            const start = date.clone().hour(mealTime.hour()).minute(mealTime.minute()).toDate();
                            const end = moment(start).add(1, 'hour').toDate();
                            
                            events.push({
                                id: `meal_${dayName}_${mealType}_${index}`,
                                title: `🍳 ${meal.name}`,
                                start,
                                end,
                                color: '#FDBF6F',
                                type: 'meal',
                            });
                        }
                    }
                });
            });
        }
    }
    return events;
  }, [localMealPlan, findMealById, selectedDate]);
  
  const allVisibleEvents = useMemo(() => {
    return [...calendarEvents, ...mealEvents];
  }, [calendarEvents, mealEvents]);

  
  useEffect(() => { Animated.sequence([ Animated.timing(fadeAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }), Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }), ]).start(); }, [viewMode, selectedDate, currentMonth, fadeAnim]);
  
  const handleNavigation = (direction: "next" | "prev") => { const amount = direction === "next" ? 1 : -1; const unit = viewMode === 'week' ? 'week' : 'day'; const newDate = moment(selectedDate).add(amount, unit).format("YYYY-MM-DD"); setSelectedDate(newDate); setCurrentMonth(newDate); };
  const goToToday = () => { const today = moment().format("YYYY-MM-DD"); setSelectedDate(today); setCurrentMonth(today); if (viewMode === 'todo') setViewMode('day'); };
  const handleSaveEvent = (event: CalendarEvent) => {
    if (event.isDeleted) {
      saveCalendarEvents(calendarEvents.filter(e => e.id !== event.id));
    } else {
      saveCalendarEvents([...calendarEvents.filter(e => e.id !== event.id), event]);
    }
  };
  const handleDayPress = (day: DateData) => { setSelectedDate(day.dateString); setViewMode("day"); };
  const handleTimeSlotPress = (slotDate: Date) => { setSelectedEvent({ ...initialEventState, start: slotDate, end: moment(slotDate).add(1, 'hour').toDate(), color: theme.primary }); setModalVisible(true); };
  
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
    allVisibleEvents.forEach(event => {
      const dateStr = moment(event.start).format("YYYY-MM-DD");
      if (!marks[dateStr]) { marks[dateStr] = { dots: [] }; }
      if (marks[dateStr].dots.length < 4 && !marks[dateStr].dots.some((d: DotProps) => d.color === event.color)) {
        marks[dateStr].dots.push({ key: event.id, color: event.color });
      }
    });
    if (marks[selectedDate]) { marks[selectedDate].selected = true; } 
    else { marks[selectedDate] = { selected: true }; }
    return marks;
  }, [allVisibleEvents, selectedDate]);
  
  const calendarTheme = {
    backgroundColor: theme.background, calendarBackground: theme.background,
    textSectionTitleColor: theme.textSecondary, selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: tinycolor(theme.primary || '#ffffff').isDark() ? theme.white : theme.textPrimary,
    todayTextColor: theme.accent, dayTextColor: theme.textPrimary,
    textDisabledColor: theme.border, dotColor: theme.primary,
    selectedDotColor: tinycolor(theme.primary || '#ffffff').isDark() ? theme.white : theme.textPrimary,
    arrowColor: theme.primary, monthTextColor: theme.textPrimary,
    textDayFontWeight: "400", textMonthFontWeight: "bold", textDayHeaderFontWeight: "500",
    textDayFontSize: 15, textMonthFontSize: 18, textDayHeaderFontSize: 13,
    'stylesheet.calendar.header': { week: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' } },
  };
  
  const renderCalendarContent = () => {
    switch (viewMode) {
      case "month": return <Calendar key={currentMonth} current={currentMonth} onDayPress={handleDayPress} onMonthChange={(m) => setCurrentMonth(m.dateString)} markedDates={markedDates} markingType="multi-dot" theme={calendarTheme} style={styles.calendar} />;
      case "week": return <WeekView selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={allVisibleEvents} onTimeSlotPress={handleTimeSlotPress} onEventPress={handleEventPress} styles={styles} theme={theme} />;
      case "day": return <DayView date={selectedDate} events={allVisibleEvents} onTimeSlotPress={handleTimeSlotPress} onEventPress={handleEventPress} styles={styles} theme={theme} />;
      case "todo": return <ToDoListView todos={todos} setTodos={setTodos} styles={styles} theme={theme} />;
      default: return null;
    }
  };
  
  if (isLoading) { return ( <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color={theme.primary} /></SafeAreaView> ); }

  return (
    <SafeAreaView style={styles.container}>
      <CalendarHeader currentMonth={currentMonth} viewMode={viewMode} setViewMode={setViewMode} onNavigate={handleNavigation} onToday={goToToday} styles={styles} theme={theme} />
      <FlingGestureHandler direction={Directions.RIGHT} enabled={viewMode !== "month" && viewMode !== 'todo'} onHandlerStateChange={({ nativeEvent }) => { if (nativeEvent.state === State.ACTIVE) handleNavigation("prev"); }}>
        <FlingGestureHandler direction={Directions.LEFT} enabled={viewMode !== "month" && viewMode !== 'todo'} onHandlerStateChange={({ nativeEvent }) => { if (nativeEvent.state === State.ACTIVE) handleNavigation("next"); }}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{renderCalendarContent()}</Animated.View>
        </FlingGestureHandler>
      </FlingGestureHandler>
      <EventModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSaveEvent} initialEventData={selectedEvent} styles={styles} />
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const getDynamicStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
  headerNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerMonth: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary },
  arrowContainer: { flexDirection: "row", gap: 16 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayButton: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  todayButtonText: { color: theme.textSecondary, fontWeight: "600", fontSize: 14 },
  viewModeContainer: { flexDirection: "row", borderWidth: 1, borderColor: theme.border, borderRadius: 20, overflow: "hidden", },
  iconTab: { padding: 8 },
  activeIconTab: { backgroundColor: tinycolor(theme.primary || '#ffffff').setAlpha(0.15).toRgbString() },
  calendar: { paddingTop: 10 },
  dayViewContainer: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 24 * HOUR_HEIGHT, position: 'relative' },
  hourRow: { flexDirection: "row", alignItems: "center", height: HOUR_HEIGHT },
  hourText: { width: aM_PM_TEXT_WIDTH, textAlign: "right", fontSize: 12, color: theme.textSecondary, marginRight: 10 },
  hourLine: { flex: 1, height: 1, backgroundColor: theme.border },
  allDayContainer: { paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allDayEvent: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, },
  allDayEventText: { fontWeight: "bold" },
  weekHeader: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  weekDay: { alignItems: "center", flex: 1, paddingVertical: 4 },
  weekDayText: { fontSize: 13, fontWeight: "500", color: theme.textSecondary, marginBottom: 8 },
  weekDayTextSelected: { color: theme.primary, fontWeight: 'bold' },
  weekDayNumberContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  weekDayNumber: { fontSize: 16, fontWeight: "600", color: theme.textPrimary },
  weekDaySelectedStyle: { backgroundColor: theme.primary },
  weekDayTextSelectedStyle: { color: tinycolor(theme.primary || '#ffffff').isDark() ? theme.white : theme.textPrimary },
  weekDayNumberToday: { backgroundColor: theme.accent },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: theme.surface, width: "90%", maxHeight: "85%", borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, flex: 1, textAlign: 'center' },
  modalContent: { paddingHorizontal: 4 },
  closeButton: { padding: 4 },
  saveButton: { padding: 4 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 8 },
  textInput: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textPrimary
  },
  allDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  dateTimePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flex: 1, minWidth: 130 },
  dateText: { marginLeft: 8, fontSize: 15, color: theme.textPrimary },
  colorPickerContainer: { marginBottom: 20 },
  colorOption: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 4, borderColor: theme.textPrimary, borderWidth: 0 },
  customColorButton: { borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center'},
  deleteButtonContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 10, borderRadius: 12, backgroundColor: tinycolor(theme.error || '#ff0000').setAlpha(0.1).toRgbString() },
  deleteButtonText: { marginLeft: 8, fontSize: 16, fontWeight: 'bold' },
  todoContainer: { flex: 1, backgroundColor: theme.background },
  todoItemContainer: { flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border, borderRadius: 12, marginBottom: 10, },
  todoItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  todoText: { fontSize: 16, color: theme.textPrimary, marginLeft: 12 },
  todoTextCompleted: { textDecorationLine: "line-through", color: theme.textSecondary },
  deleteButton: { padding: 8 },
  emptyListContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  emptyListText: { fontSize: 16, color: theme.textSecondary },
  todoInputContainer: { flexDirection: 'row', padding: 12, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center' },
  todoInput: { flex: 1, backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, borderRadius: 30, color: theme.textPrimary },
  todoAddButton: { marginLeft: 10, justifyContent: "center", alignItems: 'center' },
  eventsContainer: {
    position: 'absolute',
    left: aM_PM_TEXT_WIDTH + 15,
    right: 10,
    top: 0,
    bottom: 0,
  },
  eventItem: {
    position: "absolute", 
    borderRadius: 4, 
    paddingHorizontal: 6, 
    paddingVertical: 4, 
    marginHorizontal: 1,
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.1)', 
    overflow: 'hidden'
  },
  eventTitle: { fontWeight: "bold", fontSize: 13 },
  eventTime: { fontSize: 11, marginTop: 2 },
  mealEventItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FDBF6F',
    backgroundColor: tinycolor('#FDBF6F').setAlpha(0.2).toRgbString(),
  },
  mealEventTitle: {
    color: theme.textPrimary,
  },
  mealEventTime: {
    color: theme.textSecondary,
  },
  timeIndicator: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#D32F2F', zIndex: 100 },
  timeIndicatorDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F', left: -5, top: -4 },
});