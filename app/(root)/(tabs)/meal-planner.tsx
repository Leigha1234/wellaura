import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from 'react-native-gesture-handler';
import GestureRecognizer from 'react-native-swipe-gestures';
import tinycolor from "tinycolor2";
import { useFavorites } from "../../context/FavoritesContext";
import { useMealPlan } from "../../context/MealPlanContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchRandomRecipes, getRecipeDetails } from "../../services/edamam";
import { Meal } from "../../types";
import { useWellaura } from "../../WellauraContext";

// --- CONSTANTS ---
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypes = { breakfast: { icon: "cafe-outline" as const }, lunch: { icon: "restaurant-outline" as const }, dinner: { icon: "moon-outline" as const }, snack: { icon: "pizza-outline" as const }, };
const DRINK_NUTRITION = { coffee: { calories: 5, protein: 0, carbs: 1, fat: 0 }, tea: { calories: 2, protein: 0, carbs: 0.5, fat: 0 }, smoothie: { calories: 180, protein: 4, carbs: 35, fat: 2 },};
const preferenceOptions = ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"];

// --- NUTRITION PARSING FUNCTION ---
const parseAndFetchNutrition = async (text: string): Promise<Partial<Meal>> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    const lowerText = text.toLowerCase();
    if (lowerText.includes("toast") || lowerText.includes("bread")) { calories += 80; carbs += 15; }
    if (lowerText.includes("egg")) { const count = lowerText.match(/(\d+)\s*egg/)?.[1] || 1; calories += 75 * Number(count); protein += 6 * Number(count); fat += 5 * Number(count); }
    if (lowerText.includes("chicken")) { calories += 250; protein += 40; fat += 8; }
    if (lowerText.includes("protein shake")) { calories += 180; protein += 30; carbs += 5; }
    if (lowerText.includes("pizza")) { calories += 285; protein += 12; carbs += 36; fat += 10; }
    if (lowerText.includes("salad")) { calories += 150; protein += 5; carbs += 10; fat += 8; }
    if (calories === 0) { calories = 250; protein = 10; carbs = 20; fat = 10; }
    const ingredients = text.split(/,|\sand|with/).map(s => ({ name: s.trim(), text: s.trim() })).filter(Boolean);
    const name = text.split(" ").slice(0, 4).join(" ");
    return { name: `${name}... (Logged)`, ingredients, nutrition: { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) }, recipe: `User logged entry: "${text}"` };
};

// --- HELPER COMPONENTS ---
const HeaderMenu = ({ onOpenCalendar, onOpenOverview, onOpenSettings, styles, theme }) => {
    const [visible, setVisible] = useState(false);
    return ( <View><TouchableOpacity style={styles.headerButton} onPress={() => setVisible(true)}><Ionicons name="ellipsis-vertical" size={26} color={theme.textPrimary} /></TouchableOpacity><Modal visible={visible} transparent={true} animationType="fade" onRequestClose={() => setVisible(false)}><TouchableOpacity style={styles.menuBackdrop} onPress={() => setVisible(false)}><View style={styles.menuContainer}><TouchableOpacity style={styles.menuItem} onPress={() => { setVisible(false); onOpenCalendar(); }}><Ionicons name="grid-outline" size={22} color={theme.textSecondary} /><Text style={styles.menuItemText}>Monthly View</Text></TouchableOpacity><TouchableOpacity style={styles.menuItem} onPress={() => { setVisible(false); onOpenOverview(); }}><Ionicons name="calendar-outline" size={22} color={theme.textSecondary} /><Text style={styles.menuItemText}>Weekly View</Text></TouchableOpacity><TouchableOpacity style={styles.menuItem} onPress={() => { setVisible(false); onOpenSettings(); }}><Ionicons name="options-outline" size={22} color={theme.textSecondary} /><Text style={styles.menuItemText}>Settings</Text></TouchableOpacity></View></TouchableOpacity></Modal></View> );
};

const NutritionBar = ({ label, loggedValue, plannedValue, totalCalories, color, styles }) => { const calPerGram = (label === 'Protein' || label === 'Carbs') ? 4 : 9; const loggedPercentage = totalCalories > 0 ? (loggedValue * calPerGram / totalCalories) * 100 : 0; const plannedPercentage = 100; return ( <View style={styles.macroRow}><Text style={styles.macroLabel}>{label}</Text><View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${plannedPercentage}%`, backgroundColor: tinycolor(color).setAlpha(0.2).toString() }]} /><View style={[styles.progressBar, { width: `${loggedPercentage}%`, backgroundColor: color, position: 'absolute' }]} /></View><Text style={styles.macroValue}>{Math.round(loggedValue)}/{Math.round(plannedValue)}g</Text></View> );};
const ShoppingListCard = ({ list, clearedItems, onAcquireItem, onUnacquireItem, onAddCustomItem, onClearHistory, title, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(false); const [showCleared, setShowCleared] = useState(false); const [newItemText, setNewItemText] = useState(""); const handleAddItem = () => { if (newItemText.trim()) { onAddCustomItem(newItemText.trim()); setNewItemText(""); } }; const handleClearHistory = () => { Alert.alert( "Clear History", "Are you sure you want to permanently delete all cleared shopping items?", [ { text: "Cancel", style: "cancel" }, { text: "Yes, Clear", onPress: onClearHistory, style: "destructive" } ] )}; return ( <View style={styles.card}><TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}><View style={styles.cardTitleRow}><TouchableOpacity style={styles.cardTitleTouchable} onPress={() => setIsExpanded(!isExpanded)}><Text style={styles.cardTitle}><Ionicons name="list-outline" size={22} color={theme.textPrimary}/> {title} ({list.length})</Text><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity></View></TouchableOpacity>{isExpanded && ( <View>{list.length === 0 && clearedItems.length === 0 ? (<Text style={styles.placeholderText}>Your shopping list is empty.</Text>) : ( <View style={styles.shoppingListContainer}>{list.map((item, index) => <TouchableOpacity key={index} style={styles.shoppingListItem} onPress={() => onAcquireItem(item)}><Ionicons name="ellipse-outline" size={16} color={theme.primary} style={{marginRight: 10}}/><Text style={styles.shoppingListItemText}>{item}</Text></TouchableOpacity>)}</View> )}<View style={styles.addItemContainer}><TextInput style={styles.addItemInput} placeholder="Add custom item..." value={newItemText} onChangeText={setNewItemText} onSubmitEditing={handleAddItem} placeholderTextColor={theme.textSecondary}/><TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}><Ionicons name="add-circle" size={32} color="#28a745" /></TouchableOpacity></View>{clearedItems.length > 0 && (<View style={styles.clearedItemsContainer}><View style={styles.clearedItemsHeader}><TouchableOpacity style={styles.showClearedButton} onPress={() => setShowCleared(!showCleared)}><Text style={styles.showClearedButtonText}>{showCleared ? 'Hide' : 'Show'} Cleared ({clearedItems.length})</Text><Ionicons name={showCleared ? "chevron-up-outline" : "chevron-down-outline"} size={20} color={theme.primary} style={{marginLeft: 5}} /></TouchableOpacity>{showCleared && <TouchableOpacity onPress={handleClearHistory}><Text style={styles.clearHistoryButtonText}>Clear History</Text></TouchableOpacity>}</View>{showCleared && clearedItems.map((item, index) => ( <TouchableOpacity key={`cleared-${index}`} style={styles.shoppingListItem} onPress={() => onUnacquireItem(item)}><Ionicons name="arrow-undo-outline" size={16} color={theme.textSecondary} style={{marginRight: 10}}/><Text style={styles.clearedItemText}>{item}</Text></TouchableOpacity> ))}</View>)}</View> )}</View> );};
const EditableMealRow = ({ date, dayPlan, mealType, snackIndex, loggedStatus, findMealById, onAddLogEntry, onClearMeal, onDeleteSnackRow, onLogToggle, onSuggestMeal, onSelectMeal, onUpdateMeal, onUpdateSnack, addMealToCache, styles, theme }) => { const [activeOptions, setActiveOptions] = useState<{ key: string, options: Meal[] } | null>(null); const [isSuggesting, setIsSuggesting] = useState(false); const dayName = date.format('dddd'); const handleSuggestClick = async () => { const key = snackIndex !== undefined ? `${dayName}-${mealType}-${snackIndex}` : `${dayName}-${mealType}`; setIsSuggesting(true); setActiveOptions({ key, options: [] }); const mealChoices = await onSuggestMeal(mealType as string, 3); setActiveOptions({ key, options: mealChoices }); setIsSuggesting(false); }; const handleOptionSelect = (meal: Meal) => { addMealToCache(meal); if (snackIndex !== undefined) { onUpdateSnack(dayName, snackIndex, meal.name, meal.id); } else { onUpdateMeal(dayName, mealType as any, meal); } setActiveOptions(null); }; const isSnack = mealType === 'snack'; const mealItem = isSnack && snackIndex !== undefined ? dayPlan.snacks[snackIndex] : dayPlan[mealType]; if (!mealItem) return null; const mealData = findMealById(mealItem.id); const isLogged = isSnack ? loggedStatus?.[date.format('YYYY-MM-DD')]?.snacks?.[snackIndex] : loggedStatus?.[date.format('YYYY-MM-DD')]?.[mealType]; const handlePress = () => { if (mealData) { onSelectMeal(mealData, date, mealType, snackIndex); } else { onAddLogEntry(date, mealType, snackIndex); } }; return ( <View><View style={styles.mealRow}><TouchableOpacity onPress={() => onLogToggle(date, mealType, snackIndex)} style={styles.logButton} disabled={!mealItem.name}><Ionicons name={isLogged ? "checkmark-circle" : "checkmark-circle-outline"} size={28} color={isLogged ? "#28a745" : mealItem.name ? theme.textSecondary : theme.border} /></TouchableOpacity><Ionicons name={mealTypes[mealType].icon} size={24} color={theme.textSecondary} /><TouchableOpacity style={styles.mealInfo} onPress={handlePress}><Text style={styles.mealType}>{isSnack ? `Snack ${snackIndex + 1}` : mealType.charAt(0).toUpperCase() + mealType.slice(1)} - {mealItem.time}</Text><Text style={styles.mealNameText} numberOfLines={1}>{mealItem.name ? mealItem.name.replace(/^Recipe: /i, '') : 'Tap to add...'}</Text></TouchableOpacity><Text style={styles.mealCalories}>{mealData ? `${Math.round(mealData.nutrition.calories * (mealItem.servings || 1))} kcal` : ''}</Text><View style={styles.mealActions}><TouchableOpacity style={styles.actionButton} onPress={handleSuggestClick} disabled={isSuggesting}><Ionicons name="shuffle-outline" size={24} color={isSuggesting ? theme.textSecondary : theme.primary} /></TouchableOpacity>{mealItem.name && (<TouchableOpacity style={styles.actionButton} onPress={() => onClearMeal(date, mealType, snackIndex)}><Ionicons name="close-circle-outline" size={23} color="#dc3545" /></TouchableOpacity>)}{isSnack && <TouchableOpacity style={styles.actionButton} onPress={() => onDeleteSnackRow(dayName, snackIndex)}><Ionicons name="trash-outline" size={22} color={theme.textSecondary} /></TouchableOpacity>}</View></View>{activeOptions?.key === `${dayName}-${mealType}-${snackIndex}` || activeOptions?.key === `${dayName}-${mealType}` ? ( <View style={styles.optionsContainer}>{isSuggesting ? <ActivityIndicator color={theme.primary} /> : activeOptions.options.length > 0 ? activeOptions.options.map(option => (<TouchableOpacity key={option.id} style={styles.optionButton} onPress={() => handleOptionSelect(option)}><Text style={styles.optionText}>{option.name.replace(/^Recipe: /i, '')}</Text><Text style={styles.optionCalories}>{Math.round(option.nutrition.calories)} kcal</Text></TouchableOpacity>)) : <Text style={styles.noOptionsText}>No matching options found.</Text>}</View> ) : null}</View> );};
const DayCard = ({ date, dayPlan, ...props }) => { const dayName = date.format('dddd'); return ( <View style={props.styles.card}><Text style={props.styles.dayTitle}>{dayName} <Text style={props.styles.dateSubtext}>{date.format('MMM Do')}</Text></Text><EditableMealRow date={date} dayPlan={dayPlan} mealType="breakfast" {...props} /><EditableMealRow date={date} dayPlan={dayPlan} mealType="lunch" {...props} /><EditableMealRow date={date} dayPlan={dayPlan} mealType="dinner" {...props} />{(dayPlan.snacks || []).map((_, index) => <EditableMealRow key={`${date.format('YYYYMMDD')}-snack-${index}`} date={date} dayPlan={dayPlan} mealType="snack" snackIndex={index} {...props} />)}<TouchableOpacity style={props.styles.addSnackButton} onPress={() => props.onAddSnack(dayName)}><Ionicons name="add-outline" size={20} color={props.theme.primary}/><Text style={props.styles.addSnackButtonText}>Add Snack</Text></TouchableOpacity></View> );};
const SettingsModal = ({ isVisible, onClose, mealSettings, onSaveSettings, onResetPlan, styles, theme }) => { const [timePicker, setTimePicker] = useState<{ visible: boolean, type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null }>({ visible: false, type: null }); const handleTimeChange = (event, selectedDate) => { const currentPickerType = timePicker.type; setTimePicker({ visible: Platform.OS === 'ios', type: currentPickerType }); if (event.type === 'dismissed') { setTimePicker({ visible: false, type: null }); return; } if (selectedDate && currentPickerType) { const newTime = moment(selectedDate).format('HH:mm'); onSaveSettings(currentSettings => ({ ...currentSettings, mealTimes: { ...currentSettings.mealTimes, [currentPickerType]: newTime, } })); } if (Platform.OS !== 'ios') { setTimePicker({ visible: false, type: null }); } }; if (!mealSettings) { return null; } return ( <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContainer}><ScrollView><Text style={styles.modalTitle}>Settings</Text><View style={styles.settingSection}><Text style={styles.settingTitle}>Display Options</Text><View style={styles.settingRow}><Text style={styles.formLabel}>Show Weight Tracker</Text><Switch value={mealSettings.showWeightTracker ?? true} onValueChange={value => onSaveSettings(s => ({...s, showWeightTracker: value}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={mealSettings.showWeightTracker ? theme.white : theme.surface} /></View><View style={styles.settingRow}><Text style={styles.formLabel}>Show Shopping List</Text><Switch value={mealSettings.showShoppingList ?? true} onValueChange={value => onSaveSettings(s => ({...s, showShoppingList: value}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={mealSettings.showShoppingList ? theme.white : theme.surface} /></View></View><View style={styles.settingSection}><Text style={styles.settingTitle}>Default Meal Times</Text><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Breakfast</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'breakfast' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.breakfast}</Text></TouchableOpacity></View><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Lunch</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'lunch' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.lunch}</Text></TouchableOpacity></View><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Dinner</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'dinner' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.dinner}</Text></TouchableOpacity></View><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Snack</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'snack' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.snack}</Text></TouchableOpacity></View></View>{timePicker.visible && ( <View><DateTimePicker value={moment(mealSettings.mealTimes[timePicker.type], 'HH:mm').toDate()} mode="time" is24Hour={true} display="spinner" onChange={handleTimeChange} /><>{Platform.OS === 'ios' && <TouchableOpacity style={styles.iosPickerDoneButton} onPress={()=>setTimePicker({visible: false, type: null})}><Text style={styles.iosPickerDoneButtonText}>Done</Text></TouchableOpacity>}</></View> )}<View style={styles.settingSection}><Text style={styles.settingTitle}>Dietary Preferences</Text><View style={styles.preferenceContainer}>{preferenceOptions.map(option => (<TouchableOpacity key={option} style={[styles.preferenceButton, mealSettings.preferences.includes(option) && styles.preferenceButtonActive]} onPress={() => onSaveSettings(settings => ({...settings, preferences: settings.preferences.includes(option) ? settings.preferences.filter(p => p !== option) : [...settings.preferences, option]}))}><Text style={[styles.preferenceText, mealSettings.preferences.includes(option) && styles.preferenceTextActive]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text></TouchableOpacity>))}</View></View><View style={styles.settingSection}><Text style={styles.settingTitle}>Allergies & Intolerances</Text><TextInput placeholder="e.g., Peanut, Dairy, Gluten" style={styles.input} defaultValue={mealSettings.allergies.join(', ')} onEndEditing={(e) => onSaveSettings(settings => ({...settings, allergies: e.nativeEvent.text.split(",").map((a) => a.trim()).filter(Boolean)}))} placeholderTextColor={theme.textSecondary} /></View><View style={styles.settingSection}><Text style={styles.settingTitle}>Data Management</Text><TouchableOpacity style={styles.resetButton} onPress={onResetPlan}><Ionicons name="refresh-outline" size={20} color={theme.white} /><Text style={styles.resetText}>Reset Full Plan & Logs</Text></TouchableOpacity></View><View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={onClose}><Text style={styles.modalButtonText}>Done</Text></TouchableOpacity></View></ScrollView></View></View></Modal> );};
const LogMealModal = ({ isVisible, onClose, onSubmit, mealType, isParsing, styles, theme, placeholder = "e.g., 2 eggs, 1 slice of toast, and a coffee" }) => { const [text, setText] = useState(""); const title = mealType ? `Log ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}` : "Log Item"; const handleSubmit = () => { if (text.trim().length > 0) { onSubmit(text); setText(""); } }; return ( <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><View style={styles.modalContainer}><Text style={styles.modalTitle}>{title}</Text><Text style={styles.formLabel}>What did you have?</Text><TextInput style={[styles.input, styles.textArea]} placeholder={placeholder} multiline value={text} onChangeText={setText} placeholderTextColor={theme.textSecondary} /><View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose} disabled={isParsing}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSubmit} disabled={isParsing}>{isParsing ? (<ActivityIndicator color={styles.modalButtonText.color} />) : (<Text style={styles.modalButtonText}>Calculate & Log</Text>)}</TouchableOpacity></View></View></KeyboardAvoidingView></Modal> ); };
const DrinksTrackerCard = ({ drinks, onAddDrink, onRemoveDrink, onLogCustom, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(true); const commonDrinks = [ { type: 'coffee', name: 'Coffee', icon: 'cafe-outline' as const }, { type: 'tea', name: 'Tea', icon: 'leaf-outline' as const }, { type: 'smoothie', name: 'Smoothie', icon: 'nutrition-outline' as const }, ]; const getDrinkIcon = (drink) => { if (drink.type === 'custom' && drink.name.toLowerCase().includes('beer')) return 'beer'; if (drink.type === 'custom' && (drink.name.toLowerCase().includes('vodka') || drink.name.toLowerCase().includes('gin') || drink.name.toLowerCase().includes('wine'))) return 'wine'; return drink.type === 'coffee' ? 'cafe' : drink.type === 'tea' ? 'leaf' : 'nutrition'; }; return ( <View style={styles.card}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}><Ionicons name="water-outline" size={22} color={theme.textPrimary} /> Drinks Tracker</Text><TouchableOpacity style={styles.cardActionIcon} onPress={() => setIsExpanded(!isExpanded)}><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity></View>{isExpanded && ( <View><View style={styles.drinksListContainer}>{drinks.map((drink) => ( <View key={drink.id} style={styles.drinkRow}><Ionicons name={getDrinkIcon(drink)} size={24} color={drink.type === 'custom' ? '#c0392b' : theme.textSecondary} /><View style={styles.drinkInfo}><Text style={styles.drinkName}>{drink.name}</Text>{drink.nutrition && <Text style={styles.drinkCalories}>{drink.nutrition.calories} kcal</Text>}</View><TouchableOpacity onPress={() => onRemoveDrink(drink.id)} style={styles.actionButton}><Ionicons name="trash-outline" size={22} color={theme.textSecondary} /></TouchableOpacity></View> ))}{drinks.length === 0 && <Text style={styles.placeholderText}>No drinks logged today.</Text>}</View><View style={styles.addDrinkContainer}><Text style={styles.addDrinkTitle}>Log a drink:</Text><View style={styles.addDrinkButtons}>{commonDrinks.map(drink => ( <TouchableOpacity key={drink.type} style={styles.drinkButton} onPress={() => onAddDrink(drink)}><Ionicons name={drink.icon} size={24} color={theme.primary} /><Text style={styles.drinkButtonText}>{drink.name}</Text></TouchableOpacity> ))}<TouchableOpacity style={styles.drinkButton} onPress={onLogCustom}><Ionicons name="create-outline" size={24} color={theme.primary} /><Text style={styles.drinkButtonText}>Custom</Text></TouchableOpacity></View></View></View> )}</View> );};
const WeightTrackerCard = ({ currentWeight, lastWeight, onLogWeight, unit, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(true); const [weightInput, setWeightInput] = useState(''); useEffect(() => { setWeightInput(''); }, [currentWeight]); const handleLog = () => { if (weightInput && !isNaN(parseFloat(weightInput))) { onLogWeight(parseFloat(weightInput)); setWeightInput(''); } else { Alert.alert("Invalid Input", "Please enter a valid number for the weight."); } }; const change = currentWeight && lastWeight ? currentWeight.weight - lastWeight.weight : 0; const changeText = change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}` : 'No change'; const changeColor = change > 0 ? '#e74c3c' : change < 0 ? '#28a745' : theme.textSecondary; return ( <View style={styles.card}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}><Ionicons name="scale-outline" size={22} color={theme.textPrimary} /> Weight Tracker</Text><TouchableOpacity style={styles.cardActionIcon} onPress={() => setIsExpanded(!isExpanded)}><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity></View>{isExpanded && ( <View><View style={styles.weightDisplayRow}><View style={styles.weightDisplayItem}><Text style={styles.weightValue}>{currentWeight ? currentWeight.weight.toFixed(1) : '-.-'}</Text><Text style={styles.weightLabel}>Current ({unit})</Text></View><View style={styles.weightDisplayItem}><Text style={[styles.weightValue, { color: changeColor }]}>{lastWeight && currentWeight ? changeText : '-'}</Text><Text style={styles.weightLabel}>Change</Text></View></View><View style={styles.logWeightContainer}><TextInput style={styles.addItemInput} placeholder={`Log today's weight in ${unit}`} value={weightInput} onChangeText={setWeightInput} keyboardType="numeric" onSubmitEditing={handleLog} placeholderTextColor={theme.textSecondary} /><TouchableOpacity style={styles.addItemButton} onPress={handleLog}><Ionicons name="add-circle" size={32} color={theme.primary} /></TouchableOpacity></View></View> )}</View> );};

// --- MAIN MEAL PLANNER COMPONENT ---

export default function MealPlanner() {
  const navigation = useNavigation();
  const { mealSettings: initialMealSettings, saveMealSettings, isLoading } = useWellaura();
  const { theme } = useTheme();
  const { favorites } = useFavorites();
  const { localMealPlan, setLocalMealPlan, allMeals, addMealToCache, updateMeal, updateSnack } = useMealPlan();
  const styles = getDynamicStyles(theme);

  const [localMealSettings, setLocalMealSettings] = useState(initialMealSettings);
  const [selectedMeal, setSelectedMeal] = useState<{meal: Meal, context: any} | null>(null);
  const [servings, setServings] = useState(1);
  const [currentDate, setCurrentDate] = useState(moment());
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [logMealModalVisible, setLogMealModalVisible] = useState(false);
  const [logDrinkModalVisible, setLogDrinkModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [loggedMeals, setLoggedMeals] = useState({});
  const [loggedDrinks, setLoggedDrinks] = useState({});
  const [weightLog, setWeightLog] = useState({ [moment().subtract(2, 'day').format('YYYY-MM-DD')]: { weight: 75.5, unit: 'kg' }, [moment().subtract(1, 'day').format('YYYY-MM-DD')]: { weight: 75.1, unit: 'kg' } });
  const [cheatDays, setCheatDays] = useState({ [moment().subtract(3, 'day').format('YYYY-MM-DD')]: true });
  const [mealToLog, setMealToLog] = useState<{date: moment.Moment, type: Meal['type'], snackIndex?: number} | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [acquiredItems, setAcquiredItems] = useState(new Set<string>());
  const [customShoppingItems, setCustomShoppingItems] = useState<string[]>([]);
  
  useEffect(() => { setLocalMealSettings(initialMealSettings); }, [initialMealSettings]);
  useEffect(() => { if (localMealSettings) saveMealSettings(localMealSettings); }, [localMealSettings]);
  useEffect(() => { if (selectedMeal) { setServings(selectedMeal.context?.servings || 1); } }, [selectedMeal]);

  const findMealById = useCallback((id: string): Meal | undefined => allMeals.find(m => m.id === id), [allMeals]);
  
  const handleAddSnack = (day: string) => { setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); if (!newPlan[day].snacks) newPlan[day].snacks = []; newPlan[day].snacks.push({name: "", id: '', time: "15:00", servings: 1}); return newPlan; }); };
  const getMealOptions = useCallback(async (mealType: string, count: number = 3): Promise<Meal[]> => {
    const meals = await fetchRandomRecipes(localMealSettings, count, mealType);
    meals.forEach(meal => addMealToCache(meal));
    return meals;
  }, [localMealSettings, addMealToCache]);
  const handleOpenLogModal = (date: moment.Moment, type: Meal['type'], snackIndex?: number) => { setMealToLog({ date, type, snackIndex }); setLogMealModalVisible(true); };
  const handleLogToggle = (date: moment.Moment, mealType: Meal['type'], snackIndex?: number) => { const dateString = date.format('YYYY-MM-DD'); setLoggedMeals(currentLogs => { const newLogs = JSON.parse(JSON.stringify(currentLogs)); const dayLog = newLogs[dateString] || { breakfast: false, lunch: false, dinner: false, snacks: [] }; if (mealType === 'snack' && snackIndex !== undefined) { if(!dayLog.snacks) dayLog.snacks = []; dayLog.snacks[snackIndex] = !dayLog.snacks[snackIndex]; } else if (mealType !== 'snack') { dayLog[mealType] = !dayLog[mealType]; } newLogs[dateString] = dayLog; return newLogs; }); };
  
  const handleLogFromText = async (text: string) => {
    if (!mealToLog) return;
    setIsParsing(true);
    try {
      const parsedData = await parseAndFetchNutrition(text);
      const newMealObject: Meal = {
        id: `custom_${Date.now()}`,
        name: parsedData.name || "Logged Meal",
        type: mealToLog.type,
        tags: ['logged', 'custom'],
        image: '',
        nutrition: parsedData.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: parsedData.ingredients || [],
        recipe: parsedData.recipe || '',
      };
      addMealToCache(newMealObject);
      const dayName = mealToLog.date.format('dddd');
      if (mealToLog.type === 'snack' && mealToLog.snackIndex !== undefined) {
        updateSnack(dayName, mealToLog.snackIndex, newMealObject.name, newMealObject.id);
      } else {
        updateMeal(dayName, mealToLog.type as any, newMealObject);
      }
      handleLogToggle(mealToLog.date, mealToLog.type, mealToLog.snackIndex);
    } catch (error) {
      Alert.alert("Calculation Failed", "Couldn't determine nutrition. Please try again.");
    } finally {
      setIsParsing(false);
      setLogMealModalVisible(false);
      setMealToLog(null);
    }
  };

  const handleAddDrink = (drink: {type: string, name: string}) => { const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; const newDrink = { ...drink, id: Date.now() }; return { ...currentDrinks, [dateString]: [...todayDrinks, newDrink] }; }); };
  const handleLogCustomDrink = async (text: string) => { setIsParsing(true); try { const parsedData = await parseAndFetchNutrition(text); const newDrink = { id: Date.now(), type: 'custom', name: parsedData.name, nutrition: parsedData.nutrition, }; const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; return { ...currentDrinks, [dateString]: [...todayDrinks, newDrink] }; }); } catch (error) { Alert.alert("Calculation Failed", "Couldn't determine nutrition for the drink."); } finally { setIsParsing(false); setLogDrinkModalVisible(false); } };
  const handleRemoveDrink = (drinkId: number) => { const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; return { ...currentDrinks, [dateString]: todayDrinks.filter(d => d.id !== drinkId) }; }); };
  const handleLogWeight = (weight: number) => { const dateString = currentDate.format('YYYY-MM-DD'); const weightUnit = localMealSettings?.weightUnit || 'kg'; setWeightLog(currentLog => ({ ...currentLog, [dateString]: { weight: weight, unit: weightUnit } })); };
  const handlePrevDay = () => setCurrentDate(currentDate.clone().subtract(1, 'day'));
  const handleNextDay = () => setCurrentDate(currentDate.clone().add(1, 'day'));
  const handleOpenMealModal = async (mealSummary, date, mealType, snackIndex) => {
      let fullMealDetails = findMealById(mealSummary.id);
      if (!fullMealDetails?.recipe || !fullMealDetails.recipe.startsWith('http')) {
          const fetchedMeal = await getRecipeDetails(mealSummary.id);
          if (fetchedMeal) {
              addMealToCache(fetchedMeal);
              fullMealDetails = fetchedMeal;
          }
      }
      if (fullMealDetails) {
        const day = date.format('dddd');
        const mealEntry = mealType === 'snack' && snackIndex !== undefined ? localMealPlan[day].snacks[snackIndex] : localMealPlan[day][mealType];
        const context = { day, mealType, snackIndex, servings: mealEntry?.servings || 1 };
        setSelectedMeal({ meal: fullMealDetails, context });
      }
  };
  const handleUpdateServingsInPlan = () => { if (!selectedMeal || !selectedMeal.context) return; const { day, mealType, snackIndex } = selectedMeal.context; setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); if (mealType === 'snack' && snackIndex !== undefined) { newPlan[day].snacks[snackIndex].servings = servings; } else { newPlan[day][mealType].servings = servings; } return newPlan; }); Alert.alert("Servings Updated", `${selectedMeal.meal.name} servings updated to ${servings} in your plan.`); setSelectedMeal(null); };
  const handleAcquireItem = (item: string) => { setAcquiredItems(prev => new Set(prev).add(item)); };
  const handleUnacquireItem = (item: string) => { setAcquiredItems(prev => { const newSet = new Set(prev); newSet.delete(item); return newSet; })};
  const handleAddCustomItem = (item: string) => { if(!customShoppingItems.includes(item)) setCustomShoppingItems(prev => [...prev, item]); };
  const handleClearShoppingHistory = () => { setAcquiredItems(new Set()); };
  
  const calculateTotalsForDate = useCallback((dateString) => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dayLog = loggedMeals[dateString];
    const dayPlan = localMealPlan[moment(dateString).format('dddd')];
    if (dayLog && dayPlan) {
        const addMealToTotals = (mealEntry, isLogged) => {
            if (!isLogged || !mealEntry?.id) return;
            const mealData = findMealById(mealEntry.id);
            if (mealData) {
                const servings = mealEntry.servings || 1;
                totals.calories += mealData.nutrition.calories * servings;
                totals.protein += mealData.nutrition.protein * servings;
                totals.carbs += mealData.nutrition.carbs * servings;
                totals.fat += mealData.nutrition.fat * servings;
            }
        };
        addMealToTotals(dayPlan.breakfast, dayLog.breakfast);
        addMealToTotals(dayPlan.lunch, dayLog.lunch);
        addMealToTotals(dayPlan.dinner, dayLog.dinner);
        if (dayLog.snacks && dayPlan.snacks) {
            dayPlan.snacks.forEach((snack, index) => addMealToTotals(snack, dayLog.snacks[index]));
        }
    }
    const currentDayDrinks = loggedDrinks[dateString] || [];
    currentDayDrinks.forEach(drink => {
        const nutrition = drink.nutrition || DRINK_NUTRITION[drink.type];
        if (nutrition) {
            totals.calories += nutrition.calories;
            totals.protein += nutrition.protein;
            totals.carbs += nutrition.carbs;
            totals.fat += nutrition.fat;
        }
    });
    return { calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) };
  }, [loggedMeals, localMealPlan, allMeals, loggedDrinks, findMealById]);

  const allDaysTotals = useMemo(() => {
    const allDates = new Set([...Object.keys(loggedMeals), ...Object.keys(loggedDrinks)]);
    const allTotals = {};
    allDates.forEach(dateString => {
        allTotals[dateString] = calculateTotalsForDate(dateString);
    });
    return allTotals;
  }, [loggedMeals, loggedDrinks, calculateTotalsForDate]);

  const dailyLoggedTotals = useMemo(() => calculateTotalsForDate(currentDate.format('YYYY-MM-DD')), [currentDate, calculateTotalsForDate]);
  
  const dailyPlannedTotals = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dayPlan = localMealPlan[currentDate.format('dddd')];
    if (!dayPlan) return totals;
    const allMealEntries = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])];
    allMealEntries.forEach(mealEntry => {
        if (!mealEntry?.id) return;
        const mealData = findMealById(mealEntry.id);
        if (mealData) {
            const mealServings = mealEntry.servings || 1;
            totals.calories += mealData.nutrition.calories * mealServings;
            totals.protein += mealData.nutrition.protein * mealServings;
            totals.carbs += mealData.nutrition.carbs * mealServings;
            totals.fat += mealData.nutrition.fat * mealServings;
        }
    });
    return { calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) };
  }, [currentDate, localMealPlan, findMealById]);

  const getShoppingListFromPlan = useCallback((mealEntries) => {
    const ingredientMap = {};
    mealEntries.forEach(mealEntry => {
        if (!mealEntry?.id) return;
        const mealData = findMealById(mealEntry.id);
        if (!mealData?.ingredients) return;
        const mealServings = mealEntry.servings || 1;
        mealData.ingredients.forEach(ing => {
            if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) {
                const key = `${ing.name}|${ing.unit}`;
                const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity;
                ingredientMap[key] = (ingredientMap[key] || 0) + quantity;
            }
        });
    });
    return Object.entries(ingredientMap).map(([key, quantity]) => {
        const [name, unit] = key.split('|');
        const formattedQuantity = Number.isInteger(quantity as number) ? quantity : (quantity as number).toFixed(2).replace(/\.?0+$/, "");
        return `${formattedQuantity}${unit !== 'whole' ? ` ${unit}` : ''} ${name}`;
    }).sort();
  }, [findMealById]);

  const dailyMealEntries = useMemo(() => { const dayPlan = localMealPlan[currentDate.format('dddd')]; if (!dayPlan) return []; return [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])]; }, [currentDate, localMealPlan]);
  const fullDailyShoppingList = useMemo(() => [...getShoppingListFromPlan(dailyMealEntries), ...customShoppingItems].sort(), [dailyMealEntries, customShoppingItems, getShoppingListFromPlan]);
  const dailyShoppingList = useMemo(() => fullDailyShoppingList.filter(item => !acquiredItems.has(item)), [fullDailyShoppingList, acquiredItems]);
  const dailyClearedItems = useMemo(() => fullDailyShoppingList.filter(item => acquiredItems.has(item)), [fullDailyShoppingList, acquiredItems]);
  const dailyLoggedDrinks = useMemo(() => loggedDrinks[currentDate.format('YYYY-MM-DD')] || [], [loggedDrinks, currentDate]);
  const { currentWeight, lastWeight } = useMemo(() => { const dateString = currentDate.format('YYYY-MM-DD'); const currentWeightData = weightLog[dateString] || null; const previousDates = Object.keys(weightLog).filter(d => d < dateString && weightLog[d]).sort().reverse(); const lastWeightData = previousDates.length > 0 ? weightLog[previousDates[0]] : null; return { currentWeight: currentWeightData, lastWeight: lastWeightData }; }, [currentDate, weightLog]);
  const weekDates = useMemo(() => { const startOfWeek = currentDate.clone().startOf('isoWeek'); return Array.from({ length: 7 }).map((_, i) => startOfWeek.clone().add(i, 'days')); }, [currentDate]);
  const isCheatDay = !!cheatDays[currentDate.format('YYYY-MM-DD')];
  const showWeightTracker = localMealSettings?.showWeightTracker ?? true;
  const showShoppingList = localMealSettings?.showShoppingList ?? true;
  const weightUnit = localMealSettings?.weightUnit || 'kg';

  if (isLoading || !localMealPlan) { 
      return ( <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /><Text style={{color: theme.textSecondary}}>Loading Your Plan...</Text></View> );
  }

  const dayCardProps = { findMealById, addMealToCache, onAddLogEntry: handleOpenLogModal, onClearMeal: () => {}, onDeleteSnackRow: () => {}, onLogToggle: handleLogToggle, onSuggestMeal: getMealOptions, onSelectMeal: handleOpenMealModal, onUpdateMeal: updateMeal, onUpdateSnack: updateSnack, onAddSnack: handleAddSnack, styles, theme, loggedStatus: loggedMeals };
  const renderSwipeRightActions = () => ( <View style={styles.swipeActionContainer}><Ionicons name={isCheatDay ? "refresh-circle" : "bonfire"} size={30} color={theme.white} /><Text style={styles.swipeActionText}>{isCheatDay ? 'Undo' : 'Cheat Day'}</Text></View> );
  const gestureConfig = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80,
  };
  
  return (
    <View style={styles.container}>
      <SettingsModal isVisible={settingsModalVisible} onClose={() => setSettingsModalVisible(false)} mealSettings={localMealSettings} onSaveSettings={setLocalMealSettings} styles={styles} theme={theme} />
      <LogMealModal isVisible={logMealModalVisible} onClose={() => setLogMealModalVisible(false)} onSubmit={handleLogFromText} mealType={mealToLog?.type} isParsing={isParsing} styles={styles} theme={theme} />
      <LogMealModal isVisible={logDrinkModalVisible} onClose={() => setLogDrinkModalVisible(false)} onSubmit={handleLogCustomDrink} mealType={"Custom Drink"} isParsing={isParsing} styles={styles} theme={theme} placeholder="e.g., Vodka Red Bull, Large Latte" />
      
      <Modal animationType="slide" transparent={true} visible={!!selectedMeal} onRequestClose={() => setSelectedMeal(null)}>
        <View style={styles.modalBackdrop}><View style={styles.recipeModalContainer}>
            {selectedMeal && (<>
              {selectedMeal.meal.image && <Image source={{ uri: selectedMeal.meal.image }} style={styles.recipeModalImage} />}
              <Text style={styles.recipeTitle}>{selectedMeal.meal.name}</Text>
              <ScrollView>
                  <View style={styles.servingsSelector}><Text style={styles.recipeSectionTitle}>Servings</Text><View style={styles.stepperContainer}><TouchableOpacity style={styles.stepperButton} onPress={() => setServings(s => Math.max(1, s - 1))}><Ionicons name="remove-circle-outline" size={32} color={theme.primary} /></TouchableOpacity><Text style={styles.servingsText}>{servings}</Text><TouchableOpacity style={styles.stepperButton} onPress={() => setServings(s => s + 1)}><Ionicons name="add-circle-outline" size={32} color={theme.primary} /></TouchableOpacity></View></View>
                  <Text style={styles.recipeSectionTitle}>Ingredients</Text>
                  {selectedMeal.meal.ingredients.map((ing, i) => { const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity; const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, ""); return <Text key={i} style={styles.recipeText}>• {formattedQuantity}{ing.unit !== 'whole' ? ` ${ing.unit}` : ''} {ing.name}</Text> })}
                  <Text style={styles.recipeSectionTitle}>Instructions</Text>
                  <Text style={styles.recipeText}>{formatRecipe(selectedMeal.meal.recipe, selectedMeal.meal.ingredients, servings)}</Text>
              </ScrollView>
               <View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSelectedMeal(null)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateServingsInPlan}><Text style={styles.modalButtonText}>Update Servings</Text></TouchableOpacity></View>
            </>)}
        </View></View>
      </Modal>

      <View style={styles.headerContainer}>
        <View><Text style={styles.headerTitle}>Your Daily Log</Text><Text style={styles.headerSubtitle}>Plan and track one day at a time</Text></View>
        <View style={styles.headerActionsContainer}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('recipes', { mealSettings: localMealSettings })}><Ionicons name="book-outline" size={26} color={theme.textPrimary} /></TouchableOpacity>
            <HeaderMenu onOpenCalendar={() => navigation.navigate('monthlymealview', { monthlyTotals: allDaysTotals, cheatDays, mealPlan: localMealPlan, loggedMeals, loggedDrinks, allMeals, findMealById })} onOpenOverview={() => navigation.navigate('weeklymealview', { weekDates, mealPlan: localMealPlan, mealSettings: localMealSettings, loggedStatus: loggedMeals, allMeals, findMealById, onSuggestMeal: getMealOptions, onSelectMeal: handleOpenMealModal, })} onOpenSettings={() => setSettingsModalVisible(true)} styles={styles} theme={theme}/>
        </View>
      </View>
      
      <View style={styles.dateNavigator}><TouchableOpacity onPress={handlePrevDay} style={styles.navButton}><Ionicons name="chevron-back-outline" size={24} color={theme.primary} /></TouchableOpacity><TouchableOpacity onPress={() => setDatePickerVisible(true)}><Text style={styles.dateDisplayText}>{currentDate.isSame(moment(), 'day') ? "Today" : currentDate.format('MMM Do, YYYY')}</Text></TouchableOpacity><TouchableOpacity onPress={handleNextDay} style={styles.navButton}><Ionicons name="chevron-forward-outline" size={24} color={theme.primary} /></TouchableOpacity></View>
      
      <GestureRecognizer
        onSwipeLeft={handleNextDay}
        onSwipeRight={handlePrevDay}
        config={gestureConfig}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Swipeable renderRightActions={renderSwipeRightActions}><View style={[styles.card, isCheatDay && styles.cheatDayCard]}><Text style={styles.cardTitle}><Ionicons name={isCheatDay ? "bonfire-outline" : "today-outline"} size={22} color={theme.textPrimary} /> {currentDate.isSame(moment(), 'day') ? "Today's" : `${currentDate.format("dddd['s]")}`} Nutrition</Text><Text style={styles.weeklyCalories}>{Math.round(dailyLoggedTotals.calories)} / {Math.round(dailyPlannedTotals.calories)} kcal Logged</Text><NutritionBar label="Protein" loggedValue={dailyLoggedTotals.protein} plannedValue={dailyPlannedTotals.protein} totalCalories={dailyPlannedTotals.calories} color="#3498db" styles={styles} /><NutritionBar label="Carbs"  loggedValue={dailyLoggedTotals.carbs} plannedValue={dailyPlannedTotals.carbs} totalCalories={dailyPlannedTotals.calories} color="#f1c40f" styles={styles} /><NutritionBar label="Fat" loggedValue={dailyLoggedTotals.fat} plannedValue={dailyPlannedTotals.fat} totalCalories={dailyPlannedTotals.calories} color="#e74c3c" styles={styles} /></View></Swipeable>
            <DayCard date={currentDate} dayPlan={localMealPlan[currentDate.format('dddd')]} {...dayCardProps} />
            <DrinksTrackerCard drinks={dailyLoggedDrinks} onAddDrink={handleAddDrink} onRemoveDrink={handleRemoveDrink} onLogCustom={() => setLogDrinkModalVisible(true)} styles={styles} theme={theme} />
            {showWeightTracker && <WeightTrackerCard currentWeight={currentWeight} lastWeight={lastWeight} onLogWeight={handleLogWeight} unit={weightUnit} styles={styles} theme={theme} />}
            {showShoppingList && <ShoppingListCard list={dailyShoppingList} clearedItems={dailyClearedItems} onAcquireItem={handleAcquireItem} onUnacquireItem={handleUnacquireItem} onAddCustomItem={handleAddCustomItem} onClearHistory={handleClearShoppingHistory} title="Today's Shopping List" styles={styles} theme={theme} />}
        </ScrollView>
      </GestureRecognizer>
    </View>
  );
}

// --- UTILITY FUNCTIONS ---
const formatRecipe = (recipe, ingredients, servings) => { if (!recipe) return "No instructions provided."; if (!ingredients || ingredients.length === 0) { return recipe; } let formatted = recipe; ingredients.forEach(ing => { if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) { const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity; const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, ""); const replacement = `${formattedQuantity}${ing.unit !== 'whole' ? ` ${ing.unit}` : ''}`; formatted = formatted.replace(new RegExp(`{{${ing.name}}}`, 'g'), replacement); } }); return formatted; };

// --- FULL STYLESHEET ---
const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const destructiveColor = '#DC2626';
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      scrollContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50 },
      headerContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border },
      headerTitle: { fontSize: 26, fontWeight: "bold", color: theme.textPrimary },
      headerSubtitle: { fontSize: 16, color: theme.textSecondary },
      headerActionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
      headerButton: { backgroundColor: theme.surface, padding: 8, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
      menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
      menuContainer: { position: 'absolute', top: 110, right: 15, backgroundColor: theme.surface, borderRadius: 12, padding: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8, width: 220 },
      menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
      menuItemText: { fontSize: 16, color: theme.textPrimary, marginLeft: 15 },
      dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, },
      navButton: { padding: 10 },
      dateDisplayText: { fontSize: 18, fontWeight: 'bold', color: theme.primary },
      card: { backgroundColor: theme.surface, borderRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
      cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      cardTitleTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
      cardTitle: { fontSize: 20, fontWeight: "600", color: theme.textPrimary, marginBottom: 20, flexDirection: 'row', alignItems: 'center', flex: 1 },
      cardActionIcon: { marginBottom: 20, paddingLeft: 10 },
      dayTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary, marginBottom: 10 },
      dateSubtext: { fontWeight: '500', color: theme.textSecondary, fontSize: 18 },
      mealRow: { flexDirection: "row", alignItems: "center", minHeight: 60, borderBottomWidth: 1, borderBottomColor: theme.border },
      logButton: { paddingRight: 10 },
      mealInfo: { flex: 1, marginLeft: 10, paddingVertical: 10 },
      mealType: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
      mealNameText: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, flexShrink: 1 },
      mealCalories: { fontSize: 14, color: theme.textSecondary, fontWeight: '500', marginHorizontal: 10, minWidth: 50, textAlign: 'right' },
      mealActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
      actionButton: { padding: 5 },
      addSnackButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 10, borderRadius: 8 },
      addSnackButtonText: { color: theme.primary, fontSize: 15, fontWeight: 'bold' },
      optionsContainer: { marginTop: 8, paddingHorizontal: 10, backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
      optionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
      optionText: { fontSize: 16, color: theme.textPrimary, flex: 1, paddingRight: 10 },
      optionCalories: { fontSize: 14, color: theme.textSecondary },
      noOptionsText: { textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', padding: 10 },
      weeklyCalories: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20 },
      macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
      macroLabel: { width: '25%', fontSize: 14, color: theme.textSecondary },
      progressBarContainer: { flex: 1, height: 10, backgroundColor: theme.border, borderRadius: 5, marginHorizontal: 10, justifyContent: 'center' },
      progressBar: { height: 10, borderRadius: 5 },
      macroValue: { width: '25%', textAlign: 'right', fontSize: 14, color: theme.textSecondary },
      modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
      modalContainer: { width: '90%', maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
      modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20, textAlign: 'center' },
      modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, gap: 15 },
      modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
      cancelButton: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
      cancelButtonText: { color: theme.textPrimary, fontSize: 16, fontWeight: 'bold' },
      saveButton: { backgroundColor: theme.primary },
      modalButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: 'bold' },
      formLabel: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, marginTop: 10 },
      input: { backgroundColor: theme.border, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 10, color: theme.textPrimary },
      textArea: { height: 100, textAlignVertical: 'top' },
      recipeModalContainer: { width: '90%', maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 25 },
      recipeModalImage: { width: '100%', height: 180, borderRadius: 15, marginBottom: 15 },
      recipeTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15, textAlign: 'center' },
      recipeSectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 15, marginBottom: 8, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 5 },
      recipeText: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, marginBottom: 4 },
      servingsSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10},
      stepperContainer: { flexDirection: 'row', alignItems: 'center' },
      stepperButton: { paddingHorizontal: 10 },
      servingsText: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, marginHorizontal: 10 },
      settingSection: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 15 },
      settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
      timeSettingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, },
      timeValue: { fontSize: 16, fontWeight: '600', color: theme.primary, paddingVertical: 4, paddingHorizontal: 8, },
      iosPickerDoneButton: { backgroundColor: theme.primary, padding: 15, alignItems: 'center', borderRadius: 10, margin: 10, },
      iosPickerDoneButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: 'bold' },
      preferenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
      preferenceButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.border, borderRadius: 20, },
      preferenceButtonActive: { backgroundColor: theme.primary },
      preferenceText: { color: theme.textSecondary, fontWeight: '500' },
      preferenceTextActive: { color: onPrimaryColor },
      placeholderText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },
      swipeActionContainer: { backgroundColor: destructiveColor, justifyContent: 'center', alignItems: 'center', width: 100 },
      swipeActionText: { color: theme.white, fontWeight: '600', marginTop: 5 },
      cheatDayCard: { borderColor: destructiveColor, borderWidth: 2 },
      resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: destructiveColor, paddingVertical: 15, borderRadius: 15, marginTop: 10 },
      resetText: { fontSize: 16, fontWeight: "bold", color: theme.white, marginLeft: 10, },
      shoppingListContainer: { paddingTop: 10 },
      shoppingListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, },
      shoppingListItemText: { fontSize: 16, color: theme.textPrimary, },
      addItemContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
      addItemInput: { flex: 1, backgroundColor: theme.border, borderRadius: 10, padding: 10, fontSize: 16, color: theme.textPrimary, marginRight: 10 },
      addItemButton: { padding: 5 },
      clearedItemsContainer: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15, paddingTop: 5, },
      clearedItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10,},
      showClearedButton: { flexDirection: 'row', alignItems: 'center', },
      showClearedButtonText: { color: theme.primary, fontSize: 15, fontWeight: 'bold', },
      clearHistoryButtonText: { color: destructiveColor, fontSize: 14, fontWeight: '500' },
      clearedItemText: { fontSize: 16, color: theme.textSecondary, textDecorationLine: 'line-through' },
      drinkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border, minHeight: 50, },
      drinkInfo: { flex: 1, marginLeft: 15, justifyContent: 'center', },
      drinkName: { fontSize: 16, color: theme.textPrimary, fontWeight: '500', flexShrink: 1, },
      drinkCalories: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
      drinksListContainer: { marginTop: 5, minHeight: 50, },
      addDrinkContainer: { marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
      addDrinkTitle: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 10, textAlign: 'center' },
      addDrinkButtons: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' },
      drinkButton: { alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: theme.background, minWidth: 70, marginBottom: 10, },
      drinkButtonText: { marginTop: 5, fontSize: 12, color: theme.primary, fontWeight: '600' },
      weightDisplayRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingVertical: 10, marginBottom: 10, },
      weightDisplayItem: { alignItems: 'center', },
      weightValue: { fontSize: 28, fontWeight: 'bold', color: theme.textPrimary, },
      weightLabel: { fontSize: 14, color: theme.textSecondary, marginTop: 4, },
      logWeightContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
    });
};