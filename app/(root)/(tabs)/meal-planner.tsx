import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Swipeable } from 'react-native-gesture-handler';
import tinycolor from "tinycolor2";
import { useTheme } from "../../context/ThemeContext";
import { Meal, MealPlan } from "../../types";
import { useWellaura } from "../../WellauraContext";
import { MOCK_RECIPE_DATABASE } from "./MockRecipeDatabase";

// --- CONSTANTS ---
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypes = { breakfast: { icon: "cafe-outline" as const }, lunch: { icon: "restaurant-outline" as const }, dinner: { icon: "moon-outline" as const }, snack: { icon: "pizza-outline" as const }, };
const preferenceOptions = ["vegetarian", "vegan", "gluten-free"];
const DRINK_NUTRITION = {
    coffee: { calories: 5, protein: 0, carbs: 1, fat: 0 },
    tea: { calories: 2, protein: 0, carbs: 0.5, fat: 0 },
    smoothie: { calories: 180, protein: 4, carbs: 35, fat: 2 },
};

// --- API & HELPER FUNCTIONS ---
const parseAndFetchNutrition = async (text: string): Promise<Omit<Meal, 'type' | 'tags'>> => { console.log(`Parsing: "${text}"`); await new Promise(resolve => setTimeout(resolve, 1500)); let calories = 0, protein = 0, carbs = 0, fat = 0; const lowerText = text.toLowerCase(); const sliceMatch = lowerText.match(/(\d+|one|two|three)\s*slice/); let sliceMultiplier = 1; if (sliceMatch) { const countStr = sliceMatch[1]; if (countStr === 'one') sliceMultiplier = 1; else if (countStr === 'two') sliceMultiplier = 2; else if (countStr === 'three') sliceMultiplier = 3; else if (!isNaN(parseInt(countStr))) sliceMultiplier = parseInt(countStr); } if (lowerText.includes('toast') || lowerText.includes('bread')) { calories += 80 * sliceMultiplier; carbs += 15 * sliceMultiplier; } if (lowerText.includes('nutella')) { calories += 200; carbs += 22; fat += 12; protein += 2; } if (lowerText.includes('chicken')) { calories += 250; protein += 40; fat += 8; } if (lowerText.includes('beef')) { calories += 300; protein += 35; fat += 18; } if (lowerText.includes('rice')) { calories += 200; carbs += 45; } if (lowerText.includes('pasta')) { calories += 220; carbs += 43; } if (lowerText.includes('sauce')) { calories += 100; carbs += 15; fat += 3; } if (lowerText.includes('egg')) { const count = text.match(/(\d+)\s*egg/)?.[1] || 1; calories += 75 * Number(count); protein += 6 * Number(count); fat += 5 * Number(count); } if (lowerText.includes('butter')) { calories += 50; fat += 6; } if (lowerText.includes('salad')) { calories += 150; carbs += 10; fat += 10; } if (lowerText.includes('apple')) { calories += 95; carbs += 25; } if (lowerText.includes('protein shake')) { calories += 180; protein += 30; carbs += 5; } if (lowerText.includes('vodka')) { calories += 97; } if (lowerText.includes('red bull') || lowerText.includes('energy drink')) { calories += 110; carbs += 27; } if (lowerText.includes('gin')) { calories += 110; } if (lowerText.includes('tonic')) { calories += 90; carbs += 22; } if (lowerText.includes('beer') || lowerText.includes('pint')) { calories += 153; carbs += 13; } if (lowerText.includes('wine')) { calories += 125; carbs += 4; } if (calories === 0) { calories = 250; protein = 10; carbs = 20; fat = 10; } const ingredients = text.split(/,|\sand|with/).map(i => i.trim()).filter(Boolean); const name = text.split(' ').slice(0, 4).join(' '); return { name: ingredients.length > 0 ? ingredients.join(', ') : `${name}... (Logged)`, ingredients: ingredients, nutrition: { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) }, recipe: `User logged entry via text: "${text}"` }; };

// --- HELPER COMPONENTS ---
const NutritionBar = ({ label, loggedValue, plannedValue, totalCalories, color, styles }) => { const calPerGram = (label === 'Protein' || label === 'Carbs') ? 4 : 9; const loggedPercentage = totalCalories > 0 ? (loggedValue * calPerGram / totalCalories) * 100 : 0; const plannedPercentage = totalCalories > 0 ? (plannedValue * calPerGram / totalCalories) * 100 : 0; return ( <View style={styles.macroRow}><Text style={styles.macroLabel}>{label}</Text><View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${plannedPercentage}%` }]} /><View style={[styles.progressBar, { width: `${loggedPercentage}%`, backgroundColor: color, position: 'absolute' }]} /></View><Text style={styles.macroValue}>{Math.round(loggedValue)}/{Math.round(plannedValue)}g</Text></View> );};
const ShoppingListCard = ({ list, clearedItems, onAcquireItem, onUnacquireItem, onAddCustomItem, onClearHistory, title, onShare, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(false); const [showCleared, setShowCleared] = useState(false); const [newItemText, setNewItemText] = useState(""); const handleAddItem = () => { if (newItemText.trim()) { onAddCustomItem(newItemText.trim()); setNewItemText(""); } }; const handleClearHistory = () => { Alert.alert( "Clear History", "Are you sure you want to permanently delete all cleared shopping items?", [ { text: "Cancel", style: "cancel" }, { text: "Yes, Clear", onPress: onClearHistory, style: "destructive" } ] )}; return ( <View style={styles.card}><TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}><View style={styles.cardTitleRow}><TouchableOpacity style={styles.cardTitleTouchable} onPress={() => setIsExpanded(!isExpanded)}><Text style={styles.cardTitle}><Ionicons name="list-outline" size={22} color={theme.textPrimary}/> {title} ({list.length})</Text><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity>{onShare && ( <TouchableOpacity style={styles.cardActionIcon} onPress={onShare}><Ionicons name="share-social-outline" size={24} color={theme.primary}/></TouchableOpacity> )}</View></TouchableOpacity>{isExpanded && ( <View>{list.length === 0 ? (<Text style={styles.placeholderText}>Your shopping list is empty.</Text>) : ( <View style={styles.shoppingListContainer}>{list.map((item, index) => <TouchableOpacity key={index} style={styles.shoppingListItem} onPress={() => onAcquireItem(item)}><Ionicons name="ellipse-outline" size={16} color={theme.primary} style={{marginRight: 10}}/><Text style={styles.shoppingListItemText}>{item}</Text></TouchableOpacity>)}</View> )}<View style={styles.addItemContainer}><TextInput style={styles.addItemInput} placeholder="Add custom item..." value={newItemText} onChangeText={setNewItemText} onSubmitEditing={handleAddItem} placeholderTextColor={theme.textSecondary}/><TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}><Ionicons name="add-circle" size={32} color="#28a745" /></TouchableOpacity></View>{clearedItems.length > 0 && (<View style={styles.clearedItemsContainer}><View style={styles.clearedItemsHeader}><TouchableOpacity style={styles.showClearedButton} onPress={() => setShowCleared(!showCleared)}><Text style={styles.showClearedButtonText}>{showCleared ? 'Hide' : 'Show'} Cleared ({clearedItems.length})</Text><Ionicons name={showCleared ? "chevron-up-outline" : "chevron-down-outline"} size={20} color={theme.primary} style={{marginLeft: 5}} /></TouchableOpacity>{showCleared && <TouchableOpacity onPress={handleClearHistory}><Text style={styles.clearHistoryButtonText}>Clear History</Text></TouchableOpacity>}</View>{showCleared && clearedItems.map((item, index) => ( <TouchableOpacity key={`cleared-${index}`} style={styles.shoppingListItem} onPress={() => onUnacquireItem(item)}><Ionicons name="arrow-undo-outline" size={16} color={theme.textSecondary} style={{marginRight: 10}}/><Text style={styles.clearedItemText}>{item}</Text></TouchableOpacity> ))}</View>)}</View> )}</View> );};
const EditableMealRow = ({ date, dayPlan, mealType, snackIndex, loggedStatus, findMealByName, onAddLogEntry, onClearMeal, onDeleteSnackRow, onLogToggle, onSuggestMeal, onSelectMeal, onUpdateMeal, onUpdateSnack, addMealToCache, styles, theme }) => { const [activeOptions, setActiveOptions] = useState<{ key: string, options: Meal[] } | null>(null); const [isSuggesting, setIsSuggesting] = useState(false); const dayName = date.format('dddd'); const handleSuggestClick = async () => { const key = snackIndex !== undefined ? `${dayName}-${mealType}-${snackIndex}` : `${dayName}-${mealType}`; setIsSuggesting(true); setActiveOptions({ key, options: [] }); const mealChoices = onSuggestMeal(mealType, 3); setActiveOptions({ key, options: mealChoices }); setIsSuggesting(false); }; const handleOptionSelect = (meal: Meal) => { addMealToCache(meal); if (snackIndex !== undefined) { onUpdateSnack(dayName, snackIndex, meal.name); } else { onUpdateMeal(dayName, mealType as any, meal.name); } setActiveOptions(null); }; const isSnack = mealType === 'snack'; const mealItem = isSnack && snackIndex !== undefined ? dayPlan.snacks[snackIndex] : dayPlan[mealType]; if (!mealItem) return null; const key = isSnack ? `${dayName}-${mealType}-${snackIndex}` : `${dayName}-${mealType}`; const mealData = findMealByName(mealItem.name); const isLogged = isSnack ? loggedStatus?.snacks?.[snackIndex] : loggedStatus?.[mealType]; const handlePress = () => { if (mealData) { onSelectMeal(mealData, date, mealType, snackIndex); } else { onAddLogEntry(date, mealType, snackIndex); } }; return ( <View><View style={styles.mealRow}><TouchableOpacity onPress={() => onLogToggle(date, mealType, snackIndex)} style={styles.logButton} disabled={!mealItem.name}><Ionicons name={isLogged ? "checkmark-circle" : "checkmark-circle-outline"} size={28} color={isLogged ? "#28a745" : mealItem.name ? theme.textSecondary : theme.border} /></TouchableOpacity><Ionicons name={mealTypes[mealType].icon} size={24} color={theme.textSecondary} /><TouchableOpacity style={styles.mealInfo} onPress={handlePress}><Text style={styles.mealType}>{isSnack ? `Snack ${snackIndex + 1}` : mealType.charAt(0).toUpperCase() + mealType.slice(1)} - {mealItem.time}</Text><Text style={styles.mealNameText} numberOfLines={1}>{mealItem.name ? mealItem.name.replace(/(\s*\(Logged\))? - \d+$/, '') : 'Tap to log...'}</Text></TouchableOpacity><Text style={styles.mealCalories}>{mealData ? `${Math.round(mealData.nutrition.calories * (mealItem.servings || 1))} kcal` : ''}</Text><View style={styles.mealActions}><TouchableOpacity style={styles.actionButton} onPress={handleSuggestClick} disabled={isSuggesting}><Ionicons name="shuffle-outline" size={24} color={isSuggesting ? theme.textSecondary : theme.primary} /></TouchableOpacity>{mealItem.name && (<TouchableOpacity style={styles.actionButton} onPress={() => onClearMeal(date, mealType, snackIndex)}><Ionicons name="close-circle-outline" size={23} color="#dc3545" /></TouchableOpacity>)}{isSnack && <TouchableOpacity style={styles.actionButton} onPress={() => onDeleteSnackRow(dayName, snackIndex)}><Ionicons name="trash-outline" size={22} color={theme.textSecondary} /></TouchableOpacity>}</View></View>{activeOptions?.key === key && ( <View style={styles.optionsContainer}>{isSuggesting ? <ActivityIndicator color={theme.primary} /> : activeOptions.options.length > 0 ? activeOptions.options.map(option => (<TouchableOpacity key={option.name} style={styles.optionButton} onPress={() => handleOptionSelect(option)}><Text style={styles.optionText}>{option.name}</Text><Text style={styles.optionCalories}>{option.nutrition.calories} kcal</Text></TouchableOpacity>)) : <Text style={styles.noOptionsText}>No matching options found.</Text>}</View> )}</View> );};
const DayCard = ({ date, dayPlan, ...props }) => { const dayName = date.format('dddd'); return ( <View style={props.styles.card}><Text style={props.styles.dayTitle}>{dayName} <Text style={props.styles.dateSubtext}>{date.format('MMM Do')}</Text></Text><EditableMealRow date={date} dayPlan={dayPlan} mealType="breakfast" {...props} /><EditableMealRow date={date} dayPlan={dayPlan} mealType="lunch" {...props} /><EditableMealRow date={date} dayPlan={dayPlan} mealType="dinner" {...props} />{(dayPlan.snacks || []).map((_, index) => <EditableMealRow key={`snack-${index}`} date={date} dayPlan={dayPlan} mealType="snack" snackIndex={index} {...props} />)}<TouchableOpacity style={props.styles.addSnackButton} onPress={() => props.onAddSnack(dayName)}><Ionicons name="add-outline" size={20} color={props.theme.primary}/><Text style={props.styles.addSnackButtonText}>Add Snack</Text></TouchableOpacity></View> );};
const SettingsModal = ({ isVisible, onClose, mealSettings, onSaveSettings, styles, theme }) => { const [timePicker, setTimePicker] = useState<{ visible: boolean, type: 'breakfast' | 'lunch' | 'dinner' | null }>({ visible: false, type: null }); const handleTimeChange = (event, selectedDate) => { const currentPickerType = timePicker.type; setTimePicker({ visible: Platform.OS === 'ios', type: currentPickerType }); if (event.type === 'dismissed') { setTimePicker({ visible: false, type: null }); return; } if (selectedDate && currentPickerType) { const newTime = moment(selectedDate).format('HH:mm'); onSaveSettings(currentSettings => ({ ...currentSettings, mealTimes: { ...currentSettings.mealTimes, [currentPickerType]: newTime, } })); } if (Platform.OS !== 'ios') { setTimePicker({ visible: false, type: null }); } }; if (!mealSettings) { return null; } return ( <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContainer}><ScrollView><Text style={styles.modalTitle}>Settings</Text><View style={styles.settingSection}><Text style={styles.settingTitle}>Display Options</Text><View style={styles.settingRow}><Text style={styles.formLabel}>Show Weight Tracker</Text><Switch value={mealSettings.showWeightTracker ?? true} onValueChange={value => onSaveSettings(s => ({...s, showWeightTracker: value}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={mealSettings.showWeightTracker ? theme.white : theme.surface} /></View><View style={styles.settingRow}><Text style={styles.formLabel}>Show Shopping List</Text><Switch value={mealSettings.showShoppingList ?? true} onValueChange={value => onSaveSettings(s => ({...s, showShoppingList: value}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={mealSettings.showShoppingList ? theme.white : theme.surface} /></View></View><View style={styles.settingSection}><Text style={styles.settingTitle}>Default Meal Times</Text><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Breakfast</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'breakfast' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.breakfast}</Text></TouchableOpacity></View><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Lunch</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'lunch' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.lunch}</Text></TouchableOpacity></View><View style={styles.timeSettingRow}><Text style={styles.formLabel}>Dinner</Text><TouchableOpacity onPress={() => setTimePicker({ visible: true, type: 'dinner' })}><Text style={styles.timeValue}>{mealSettings.mealTimes.dinner}</Text></TouchableOpacity></View></View>{timePicker.visible && ( <View><DateTimePicker value={moment(mealSettings.mealTimes[timePicker.type], 'HH:mm').toDate()} mode="time" is24Hour={true} display="spinner" onChange={handleTimeChange} /><>{Platform.OS === 'ios' && <TouchableOpacity style={styles.iosPickerDoneButton} onPress={()=>setTimePicker({visible: false, type: null})}><Text style={styles.iosPickerDoneButtonText}>Done</Text></TouchableOpacity>}</></View> )}<View style={styles.settingSection}><Text style={styles.settingTitle}>Dietary Preferences</Text><View style={styles.preferenceContainer}>{preferenceOptions.map(option => (<TouchableOpacity key={option} style={[styles.preferenceButton, mealSettings.preferences.includes(option) && styles.preferenceButtonActive]} onPress={() => onSaveSettings(settings => ({...settings, preferences: settings.preferences.includes(option) ? settings.preferences.filter(p => p !== option) : [...settings.preferences, option]}))}><Text style={[styles.preferenceText, mealSettings.preferences.includes(option) && styles.preferenceTextActive]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text></TouchableOpacity>))}</View></View><View><Text style={styles.settingTitle}>Allergies & Intolerances</Text><TextInput placeholder="e.g., Peanut, Dairy, Gluten" style={styles.input} defaultValue={mealSettings.allergies.join(', ')} onEndEditing={(e) => onSaveSettings(settings => ({...settings, allergies: e.nativeEvent.text.split(",").map((a) => a.trim()).filter(Boolean)}))} placeholderTextColor={theme.textSecondary} /></View><View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={onClose}><Text style={styles.modalButtonText}>Done</Text></TouchableOpacity></View></ScrollView></View></View></Modal> );};
const LogMealModal = ({ isVisible, onClose, onSubmit, mealType, isParsing, styles, theme, placeholder = "e.g., 2 eggs, 1 slice of toast, and a coffee" }) => { const [text, setText] = useState(""); const title = mealType ? `Log ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}` : "Log Item"; const handleSubmit = () => { if (text.trim().length > 0) { onSubmit(text); setText(""); } }; return ( <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><View style={styles.modalContainer}><Text style={styles.modalTitle}>{title}</Text><Text style={styles.formLabel}>What did you have?</Text><TextInput style={[styles.input, styles.textArea]} placeholder={placeholder} multiline value={text} onChangeText={setText} placeholderTextColor={theme.textSecondary} /><View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose} disabled={isParsing}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSubmit} disabled={isParsing}>{isParsing ? (<ActivityIndicator color={styles.modalButtonText.color} />) : (<Text style={styles.modalButtonText}>Calculate & Log</Text>)}</TouchableOpacity></View></View></KeyboardAvoidingView></Modal> ); };
const DrinksTrackerCard = ({ drinks, onAddDrink, onRemoveDrink, onLogCustom, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(true); const commonDrinks = [ { type: 'coffee', name: 'Coffee', icon: 'cafe-outline' as const }, { type: 'tea', name: 'Tea', icon: 'leaf-outline' as const }, { type: 'smoothie', name: 'Smoothie', icon: 'nutrition-outline' as const }, ]; const getDrinkIcon = (drink) => { if (drink.type === 'custom' && drink.name.toLowerCase().includes('beer')) return 'beer'; if (drink.type === 'custom' && (drink.name.toLowerCase().includes('vodka') || drink.name.toLowerCase().includes('gin') || drink.name.toLowerCase().includes('wine'))) return 'wine'; return drink.type === 'coffee' ? 'cafe' : drink.type === 'tea' ? 'leaf' : 'nutrition'; }; return ( <View style={styles.card}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}><Ionicons name="water-outline" size={22} color={theme.textPrimary} /> Drinks Tracker</Text><TouchableOpacity style={styles.cardActionIcon} onPress={() => setIsExpanded(!isExpanded)}><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity></View>{isExpanded && ( <View><View style={styles.drinksListContainer}>{drinks.map((drink) => ( <View key={drink.id} style={styles.drinkRow}><Ionicons name={getDrinkIcon(drink)} size={24} color={drink.type === 'custom' ? '#c0392b' : theme.textSecondary} /><View style={styles.drinkInfo}><Text style={styles.drinkName}>{drink.name}</Text>{drink.nutrition && <Text style={styles.drinkCalories}>{`${drink.nutrition.calories} kcal`}</Text>}</View><TouchableOpacity onPress={() => onRemoveDrink(drink.id)} style={styles.actionButton}><Ionicons name="trash-outline" size={22} color={theme.textSecondary} /></TouchableOpacity></View> ))}{drinks.length === 0 && <Text style={styles.placeholderText}>No drinks logged today.</Text>}</View><View style={styles.addDrinkContainer}><Text style={styles.addDrinkTitle}>Log a drink:</Text><View style={styles.addDrinkButtons}>{commonDrinks.map(drink => ( <TouchableOpacity key={drink.type} style={styles.drinkButton} onPress={() => onAddDrink(drink)}><Ionicons name={drink.icon} size={24} color={theme.primary} /><Text style={styles.drinkButtonText}>{drink.name}</Text></TouchableOpacity> ))}<TouchableOpacity style={styles.drinkButton} onPress={onLogCustom}><Ionicons name="create-outline" size={24} color={theme.primary} /><Text style={styles.drinkButtonText}>Custom</Text></TouchableOpacity></View></View></View> )}</View> );};
const WeightTrackerCard = ({ currentWeight, lastWeight, onLogWeight, unit, styles, theme }) => { const [isExpanded, setIsExpanded] = useState(true); const [weightInput, setWeightInput] = useState(''); useEffect(() => { setWeightInput(''); }, [currentWeight]); const handleLog = () => { if (weightInput && !isNaN(parseFloat(weightInput))) { onLogWeight(parseFloat(weightInput)); setWeightInput(''); } else { Alert.alert("Invalid Input", "Please enter a valid number for the weight."); } }; const change = currentWeight && lastWeight ? currentWeight.weight - lastWeight.weight : 0; const changeText = change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}` : 'No change'; const changeColor = change > 0 ? '#e74c3c' : change < 0 ? '#28a745' : theme.textSecondary; return ( <View style={styles.card}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}><Ionicons name="scale-outline" size={22} color={theme.textPrimary} /> Weight Tracker</Text><TouchableOpacity style={styles.cardActionIcon} onPress={() => setIsExpanded(!isExpanded)}><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity></View>{isExpanded && ( <View><View style={styles.weightDisplayRow}><View style={styles.weightDisplayItem}><Text style={styles.weightValue}>{currentWeight ? currentWeight.weight.toFixed(1) : '-.-'}</Text><Text style={styles.weightLabel}>Current ({unit})</Text></View><View style={styles.weightDisplayItem}><Text style={[styles.weightValue, { color: changeColor }]}>{lastWeight && currentWeight ? changeText : '-'}</Text><Text style={styles.weightLabel}>Change</Text></View></View><View style={styles.logWeightContainer}><TextInput style={styles.addItemInput} placeholder={`Log today's weight in ${unit}`} value={weightInput} onChangeText={setWeightInput} keyboardType="numeric" onSubmitEditing={handleLog} placeholderTextColor={theme.textSecondary} /><TouchableOpacity style={styles.addItemButton} onPress={handleLog}><Ionicons name="add-circle" size={32} color={theme.primary} /></TouchableOpacity></View></View> )}</View> );};
const PlannerModal = ({ isVisible, onClose, weekDates, mealPlan, weeklyShoppingList, weeklyClearedItems, onAcquireItem, onUnacquireItem, onAddCustomItem, onClearHistory, monthlyTotals, cheatDays, onSelectDate, styles, theme, ...props }) => {
    const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'monthly'
    const [viewDate, setViewDate] = useState(moment());

    // --- Content for Weekly View ---
    const WeeklyView = () => {
        const weeklyTotals = useMemo(() => {
            const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            if (!mealPlan) return totals;
            weekDates.forEach(date => {
                const dayPlan = mealPlan[date.format('dddd')];
                if (!dayPlan) return;
                const meals = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...dayPlan.snacks];
                meals.forEach(mealEntry => {
                    const mealData = props.findMealByName(mealEntry.name);
                    if (mealData) {
                        const servings = mealEntry.servings || 1;
                        totals.calories += mealData.nutrition.calories * servings;
                        totals.protein += mealData.nutrition.protein * servings;
                        totals.carbs += mealData.nutrition.carbs * servings;
                        totals.fat += mealData.nutrition.fat * servings;
                    }
                });
            });
            return totals;
        }, [weekDates, mealPlan, props.findMealByName]);

        const formatMealPlanForShare = () => { let planText = "My Meal Plan for the Week:\n\n"; weekDates.forEach(date => { const dayName = date.format('dddd'); const dayPlan = mealPlan[dayName]; planText += `**${dayName}, ${date.format('MMM Do')}**\n`; planText += `B: ${dayPlan.breakfast.name || 'Not planned'}\n`; planText += `L: ${dayPlan.lunch.name || 'Not planned'}\n`; planText += `D: ${dayPlan.dinner.name || 'Not planned'}\n`; dayPlan.snacks.forEach((s, i) => { planText += `S${i+1}: ${s.name || 'Not planned'}\n`; }); planText += "\n"; }); return planText; };
        const formatNutritionForShare = (totals) => { return `Weekly Nutrition Goals:\n- Avg. Daily Calories: ${Math.round(totals.calories / 7)} kcal\n- Total Protein: ${Math.round(totals.protein)}g\n- Total Carbs: ${Math.round(totals.carbs)}g\n- Total Fat: ${Math.round(totals.fat)}g`; };
        const formatShoppingListForShare = (list) => { if (list.length === 0) return "My shopping list is empty!"; return "My Shopping List:\n- " + list.join('\n- '); };
        const handleShare = async (content) => { try { await Share.share({ message: content }); } catch (error) { Alert.alert("Error", "Could not share content."); }};
        
        return (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}><Ionicons name="document-text-outline" size={22} color={theme.textPrimary}/> Weekly Meal Plan</Text>
                        <TouchableOpacity style={styles.cardActionIcon} onPress={() => handleShare(formatMealPlanForShare())}><Ionicons name="share-social-outline" size={24} color={theme.primary}/></TouchableOpacity>
                    </View>
                    {weekDates.map(date => {
                        const dayName = date.format('dddd');
                        const dateString = date.format('YYYY-MM-DD');
                        const dailyLogStatus = props.loggedStatus[dateString];
                        return (
                            <View key={dayName} style={styles.overviewDayContainer}>
                                <Text style={styles.overviewDayTitle}>{dayName}</Text>
                                <EditableMealRow mealType="breakfast" date={date} dayPlan={mealPlan[dayName]} loggedStatus={dailyLogStatus} {...props} styles={styles} theme={theme} />
                                <EditableMealRow mealType="lunch" date={date} dayPlan={mealPlan[dayName]} loggedStatus={dailyLogStatus} {...props} styles={styles} theme={theme} />
                                <EditableMealRow mealType="dinner" date={date} dayPlan={mealPlan[dayName]} loggedStatus={dailyLogStatus} {...props} styles={styles} theme={theme} />
                                {(mealPlan[dayName].snacks || []).map((_, i) => <EditableMealRow key={`snack-${i}`} mealType="snack" snackIndex={i} date={date} dayPlan={mealPlan[dayName]} loggedStatus={dailyLogStatus} {...props} styles={styles} theme={theme} />)}
                            </View>
                        );
                    })}
                </View>
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}><Ionicons name="bar-chart-outline" size={22} color={theme.textPrimary}/> Weekly Nutrition</Text>
                        <TouchableOpacity style={styles.cardActionIcon} onPress={() => handleShare(formatNutritionForShare(weeklyTotals))}><Ionicons name="share-social-outline" size={24} color={theme.primary}/></TouchableOpacity>
                    </View>
                    <Text style={styles.weeklyCalories}>Avg. {Math.round(weeklyTotals.calories / 7) || 0} kcal / day</Text>
                    <NutritionBar loggedValue={weeklyTotals.protein} plannedValue={weeklyTotals.protein} totalCalories={weeklyTotals.calories} label="Protein" color="#3498db" styles={styles} />
                    <NutritionBar loggedValue={weeklyTotals.carbs} plannedValue={weeklyTotals.carbs} totalCalories={weeklyTotals.calories} label="Carbs" color="#f1c40f" styles={styles} />
                    <NutritionBar loggedValue={weeklyTotals.fat} plannedValue={weeklyTotals.fat} totalCalories={weeklyTotals.calories} label="Fat" color="#e74c3c" styles={styles} />
                </View>
                <ShoppingListCard list={weeklyShoppingList} clearedItems={weeklyClearedItems} onAcquireItem={onAcquireItem} onUnacquireItem={onUnacquireItem} onAddCustomItem={onAddCustomItem} onClearHistory={onClearHistory} title="This Week's Shopping List" onShare={() => handleShare(formatShoppingListForShare(weeklyShoppingList))} styles={styles} theme={theme} />
                <TouchableOpacity onPress={() => handleShare(`${formatMealPlanForShare()}\n${formatNutritionForShare(weeklyTotals)}\n\n${formatShoppingListForShare(weeklyShoppingList)}`)} style={styles.exportButtonOverall}>
                    <Ionicons name="download-outline" size={20} color={theme.white} />
                    <Text style={styles.resetText}>Export Full Week</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    // --- Content for Monthly View (Calendar) ---
    const MonthlyView = () => {
        const renderHeader = () => (
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => setViewDate(viewDate.clone().subtract(1, 'month'))} style={styles.navButton}><Ionicons name="chevron-back-outline" size={24} color={theme.primary} /></TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>{viewDate.format('MMMM YYYY')}</Text>
                <TouchableOpacity onPress={() => setViewDate(viewDate.clone().add(1, 'month'))} style={styles.navButton}><Ionicons name="chevron-forward-outline" size={24} color={theme.primary} /></TouchableOpacity>
            </View>
        );
        const renderDaysOfWeek = () => ( <View style={styles.calendarDaysOfWeek}>{moment.weekdaysShort().map(day => <Text key={day} style={styles.calendarDayOfWeekText}>{day}</Text>)}</View> );
        const renderCells = () => {
            const monthStart = viewDate.clone().startOf('month');
            const monthEnd = viewDate.clone().endOf('month');
            const startDate = monthStart.clone().startOf('week');
            const endDate = monthEnd.clone().endOf('week');
            const rows = [];
            let days = [];
            let day = startDate.clone();
            while (day.isSameOrBefore(endDate)) {
                for (let i = 0; i < 7; i++) {
                    const dateString = day.format('YYYY-MM-DD');
                    const dayTotals = monthlyTotals[dateString];
                    const isCheatDay = cheatDays[dateString];
                    const dayName = day.format('dddd');
                    const dayPlan = mealPlan[dayName];
                    days.push(
                        <TouchableOpacity 
                            key={day.toString()} 
                            onPress={() => onSelectDate(dateString)} 
                            disabled={!day.isSame(monthStart, 'month')} 
                            style={[ styles.calendarCell, !day.isSame(monthStart, 'month') && styles.calendarCellNotInMonth, isCheatDay && styles.calendarCellCheatDay ]}
                        >
                            <Text style={[styles.calendarCellDate, isCheatDay && {color: theme.white}]}>{day.format('D')}</Text>
                            {day.isSame(monthStart, 'month') && (
                                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                                    {dayTotals && <Text style={[styles.calendarCellCalorieText, isCheatDay && {color: theme.white, opacity: 0.9}]}>{`${dayTotals.calories} kcal`}</Text>}
                                    <View style={styles.mealIconsContainer}>
                                        {dayPlan?.breakfast?.name ? <Ionicons name="cafe-outline" size={10} color={isCheatDay ? theme.white : theme.textSecondary} /> : <View style={{width: 10}}/>}
                                        {dayPlan?.lunch?.name ? <Ionicons name="restaurant-outline" size={10} color={isCheatDay ? theme.white : theme.textSecondary} /> : <View style={{width: 10}}/>}
                                        {dayPlan?.dinner?.name ? <Ionicons name="moon-outline" size={10} color={isCheatDay ? theme.white : theme.textSecondary} /> : <View style={{width: 10}}/>}
                                    </View>
                                </View>
                            )}
                            {isCheatDay && <Ionicons name="bonfire-outline" size={18} color={theme.white} style={{position: 'absolute', bottom: 5, right: 5}}/>}
                        </TouchableOpacity>
                    );
                    day.add(1, 'day');
                }
                rows.push(<View key={day.toString()} style={styles.calendarRow}>{days}</View>);
                days = [];
            }
            return rows;
        };
        return (
            <ScrollView>
                <View style={{paddingBottom: 20}}>
                    {renderHeader()}
                    {renderDaysOfWeek()}
                    {renderCells()}
                </View>
            </ScrollView>
        );
    };

    return (
        <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
            <View style={styles.overviewContainer}>
                <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Planner</Text>
                    <TouchableOpacity onPress={onClose} style={styles.overviewDoneButton}>
                        <Text style={styles.overviewDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tabButton, activeTab === 'weekly' && styles.tabButtonActive]} onPress={() => setActiveTab('weekly')}>
                        <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>Week Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabButton, activeTab === 'monthly' && styles.tabButtonActive]} onPress={() => setActiveTab('monthly')}>
                        <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>Month Summary</Text>
                    </TouchableOpacity>
                </View>
                {activeTab === 'weekly' ? <WeeklyView/> : <MonthlyView/>}
            </View>
        </Modal>
    );
};
const RecipeBookModal = ({ isVisible, onClose, onSelectMeal, styles, theme }) => {
    const [searchText, setSearchText] = useState('');
    const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        mealType: [],
        dietary: [],
    });

    const filterOptions = {
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'],
        dietary: [
            { label: 'High-Protein', tag: 'high-protein' },
            { label: 'Low-Calorie', tag: 'low-calorie' },
            { label: 'Vegan', tag: 'vegan' },
            { label: 'Gluten-Free', tag: 'gluten-free' },
        ],
    };

    const filteredMeals = useMemo(() => {
        let meals = MOCK_RECIPE_DATABASE;

        if (searchText) {
            meals = meals.filter(meal => meal.name.toLowerCase().includes(searchText.toLowerCase()));
        }

        if (filters.mealType.length > 0) {
            meals = meals.filter(meal => filters.mealType.includes(meal.type));
        }

        if (filters.dietary.length > 0) {
            meals = meals.filter(meal => filters.dietary.every(filterTag => meal.tags.includes(filterTag)));
        }

        return meals.sort((a,b) => a.name.localeCompare(b.name));
    }, [searchText, filters]);

    const toggleFilter = (type: 'mealType' | 'dietary', value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            const currentFilterArray = newFilters[type];
            if (currentFilterArray.includes(value)) {
                newFilters[type] = currentFilterArray.filter(f => f !== value);
            } else {
                newFilters[type] = [...currentFilterArray, value];
            }
            return newFilters;
        });
    };
    
    return (
        <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
            <View style={styles.overviewContainer}>
                <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Recipe Book</Text>
                    <TouchableOpacity onPress={onClose} style={styles.overviewDoneButton}>
                        <Text style={styles.overviewDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.recipeSearchContainer}>
                    <View style={styles.searchBarContainer}>
                        <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={styles.searchBarIcon} />
                        <TextInput 
                            style={styles.searchBarInput}
                            placeholder="Search recipes..."
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.preferenceContainer}>
                        {filterOptions.mealType.map(f => <TouchableOpacity key={f} style={[styles.preferenceButton, filters.mealType.includes(f) && styles.preferenceButtonActive]} onPress={() => toggleFilter('mealType', f)}><Text style={[styles.preferenceText, filters.mealType.includes(f) && styles.preferenceTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text></TouchableOpacity>)}
                        {filterOptions.dietary.map(f => <TouchableOpacity key={f.tag} style={[styles.preferenceButton, filters.dietary.includes(f.tag) && styles.preferenceButtonActive]} onPress={() => toggleFilter('dietary', f.tag)}><Text style={[styles.preferenceText, filters.dietary.includes(f.tag) && styles.preferenceTextActive]}>{f.label}</Text></TouchableOpacity>)}
                    </ScrollView>
                </View>
                <FlatList
                    data={filteredMeals}
                    keyExtractor={(item, index) => item.name + index}
                    ListEmptyComponent={<Text style={styles.placeholderText}>No recipes found. Try a different search or filter!</Text>}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { marginHorizontal: 15 }]}>
                            <TouchableOpacity onPress={() => setExpandedRecipe(expandedRecipe === item.name ? null : item.name)}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={[styles.cardTitle, { marginBottom: expandedRecipe === item.name ? 10 : 20 }]}>{item.name}</Text>
                                    <Ionicons name={expandedRecipe === item.name ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} />
                                </View>
                            </TouchableOpacity>
                            {expandedRecipe === item.name && (
                                <View>
                                    <Text style={styles.recipeSectionTitle}>Nutrition (per serving)</Text>
                                    <Text style={styles.recipeText}>{`~${item.nutrition.calories} kcal | P:${item.nutrition.protein}g C:${item.nutrition.carbs}g F:${item.nutrition.fat}g`}</Text>
                                    <Text style={styles.recipeSectionTitle}>Ingredients</Text>
                                    {item.ingredients.map((ing, i) => <Text key={i} style={styles.recipeText}>{`• ${ing.baseQuantity}${ing.unit} ${ing.name}`}</Text>)}
                                    <Text style={styles.recipeSectionTitle}>Instructions</Text>
                                    <Text style={styles.recipeText}>{item.recipe}</Text>
                                    <TouchableOpacity style={styles.addSnackButton} onPress={() => onSelectMeal(item)}>
                                        <Text style={styles.addSnackButtonText}>Add to Today's Plan</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
};


// --- MAIN COMPONENT ---
export default function MealPlanner() {
  const { mealPlan: initialMealPlan, saveMealPlan, allMeals, saveAllMeals, mealSettings: initialMealSettings, saveMealSettings, isLoading } = useWellaura();
  const { theme } = useTheme();
  const styles = getDynamicStyles(theme);

  const handleSelectDateFromCalendar = (dateString: string) => { 
    setCurrentDate(moment(dateString)); 
    setPlannerModalVisible(false); 
  };

  const STORAGE_KEYS = { LOGGED_MEALS: '@Wellaura:loggedMeals', ACQUIRED_ITEMS: '@Wellaura:acquiredItems', CUSTOM_SHOPPING_ITEMS: '@Wellaura:customShoppingItems', CHEAT_DAYS: '@Wellaura:cheatDays', WEIGHT_LOG: '@Wellaura:weightLog', LOGGED_DRINKS: '@Wellaura:loggedDrinks', HABIT_WATER: '@Wellaura:habitTrackerWater', };
  const isDataLoaded = useRef(false);
  const [localMealPlan, setLocalMealPlan] = useState(initialMealPlan);
  const [localMealSettings, setLocalMealSettings] = useState(initialMealSettings);
  const [selectedMeal, setSelectedMeal] = useState<{meal: Meal, context: any} | null>(null);
  const [servings, setServings] = useState(1);
  useEffect(() => { setLocalMealPlan(initialMealPlan); }, [initialMealPlan]);
  useEffect(() => { setLocalMealSettings(initialMealSettings); }, [initialMealSettings]);
  useEffect(() => { if (localMealPlan && JSON.stringify(localMealPlan) !== JSON.stringify(initialMealPlan)) { saveMealPlan(localMealPlan); } }, [localMealPlan, initialMealPlan, saveMealPlan]);
  useEffect(() => { if (localMealSettings && JSON.stringify(localMealSettings) !== JSON.stringify(initialMealSettings)) { saveMealSettings(localMealSettings); } }, [localMealSettings, initialMealSettings, saveMealSettings]);
  useEffect(() => { if (selectedMeal) { setServings(1) } }, [selectedMeal]);
  const [loggedMeals, setLoggedMeals] = useState({});
  const [acquiredItems, setAcquiredItems] = useState(new Set<string>());
  const [customShoppingItems, setCustomShoppingItems] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(moment());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [plannerModalVisible, setPlannerModalVisible] = useState(false);
  const [recipeBookVisible, setRecipeBookVisible] = useState(false);
  const [logMealModalVisible, setLogMealModalVisible] = useState(false);
  const [logDrinkModalVisible, setLogDrinkModalVisible] = useState(false);
  const [mealToLog, setMealToLog] = useState<{date: moment.Moment, type: Meal['type'], snackIndex?: number} | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [cheatDays, setCheatDays] = useState({});
  const [weightLog, setWeightLog] = useState({});
  const [habitTrackerWater, setHabitTrackerWater] = useState({});
  const [loggedDrinks, setLoggedDrinks] = useState({});
  useEffect(() => { const loadPersistedData = async () => { try { const dataPairs = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS)); const data = dataPairs.reduce((acc, [key, value]) => { if (value) acc[key] = JSON.parse(value); return acc; }, {}); if (data[STORAGE_KEYS.LOGGED_MEALS]) setLoggedMeals(data[STORAGE_KEYS.LOGGED_MEALS]); if (data[STORAGE_KEYS.ACQUIRED_ITEMS]) setAcquiredItems(new Set(data[STORAGE_KEYS.ACQUIRED_ITEMS])); if (data[STORAGE_KEYS.CUSTOM_SHOPPING_ITEMS]) setCustomShoppingItems(data[STORAGE_KEYS.CUSTOM_SHOPPING_ITEMS]); if (data[STORAGE_KEYS.CHEAT_DAYS]) setCheatDays(data[STORAGE_KEYS.CHEAT_DAYS]); if (data[STORAGE_KEYS.WEIGHT_LOG]) setWeightLog(data[STORAGE_KEYS.WEIGHT_LOG]); if (data[STORAGE_KEYS.LOGGED_DRINKS]) setLoggedDrinks(data[STORAGE_KEYS.LOGGED_DRINKS]); if (data[STORAGE_KEYS.HABIT_WATER]) setHabitTrackerWater(data[STORAGE_KEYS.HABIT_WATER]); } catch (e) { console.error("Failed to load persisted meal planner data.", e); Alert.alert("Error", "Could not load your saved data."); } finally { isDataLoaded.current = true; } }; loadPersistedData(); }, []);
  useEffect(() => { if (!isDataLoaded.current) return; const saveData = async () => { try { const dataToSave: [string, string][] = [ [STORAGE_KEYS.LOGGED_MEALS, JSON.stringify(loggedMeals)], [STORAGE_KEYS.ACQUIRED_ITEMS, JSON.stringify(Array.from(acquiredItems))], [STORAGE_KEYS.CUSTOM_SHOPPING_ITEMS, JSON.stringify(customShoppingItems)], [STORAGE_KEYS.CHEAT_DAYS, JSON.stringify(cheatDays)], [STORAGE_KEYS.WEIGHT_LOG, JSON.stringify(weightLog)], [STORAGE_KEYS.LOGGED_DRINKS, JSON.stringify(loggedDrinks)], [STORAGE_KEYS.HABIT_WATER, JSON.stringify(habitTrackerWater)], ]; await AsyncStorage.multiSet(dataToSave); } catch (e) { console.error("Failed to save meal planner data.", e); } }; saveData(); }, [loggedMeals, acquiredItems, customShoppingItems, cheatDays, weightLog, loggedDrinks, habitTrackerWater]);
  const findMealByName = useCallback((name: string): Meal | undefined => { if (!name) return undefined; const foundInAllMeals = allMeals.find(m => m.name === name); if (foundInAllMeals) return foundInAllMeals; const foundInDb = MOCK_RECIPE_DATABASE.find(m => m.name === name); return foundInDb; }, [allMeals]);
  const calculateTotalsForDate = useCallback((dateString) => { const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }; const dayLog = loggedMeals[dateString]; const dayPlan = localMealPlan[moment(dateString).format('dddd')]; if (dayLog && dayPlan) { const addMealToTotals = (mealEntry) => { const mealData = findMealByName(mealEntry.name); if (mealData) { const mealServings = mealEntry.servings || 1; totals.calories += mealData.nutrition.calories * mealServings; totals.protein += mealData.nutrition.protein * mealServings; totals.carbs += mealData.nutrition.carbs * mealServings; totals.fat += mealData.nutrition.fat * mealServings; } }; if (dayLog.breakfast) addMealToTotals(dayPlan.breakfast); if (dayLog.lunch) addMealToTotals(dayPlan.lunch); if (dayLog.dinner) addMealToTotals(dayPlan.dinner); if (dayLog.snacks && dayPlan.snacks) { dayLog.snacks.forEach((snack, index) => { if (dayLog.snacks[index]) { addMealToTotals(snack); } });} } const currentDayDrinks = loggedDrinks[dateString] || []; currentDayDrinks.forEach(drink => { const nutrition = drink.nutrition || DRINK_NUTRITION[drink.type]; if (nutrition) { totals.calories += nutrition.calories; totals.protein += nutrition.protein; totals.carbs += nutrition.carbs; totals.fat += nutrition.fat; } }); return { calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) }; }, [loggedMeals, localMealPlan, allMeals, loggedDrinks, findMealByName]);
  const allDaysTotals = useMemo(() => { const allDates = new Set([...Object.keys(loggedMeals), ...Object.keys(loggedDrinks)]); const allTotals = {}; allDates.forEach(dateString => { allTotals[dateString] = calculateTotalsForDate(dateString); }); return allTotals; }, [loggedMeals, loggedDrinks, calculateTotalsForDate]);
  const handleSetCheatDay = () => { const dateString = currentDate.format('YYYY-MM-DD'); const isCurrentlyCheatDay = !!cheatDays[dateString]; Alert.alert(isCurrentlyCheatDay ? "Remove Cheat Day?" : "Mark as Cheat Day?", `This will mark ${currentDate.format("MMM Do")} as ${isCurrentlyCheatDay ? 'a normal day' : 'a cheat day'}.`, [ { text: "Cancel", style: "cancel"}, { text: "Confirm", onPress: () => setCheatDays(prev => ({ ...prev, [dateString]: !isCurrentlyCheatDay }))} ]); };
  const handleOpenMealModal = (meal, date, mealType, snackIndex) => { const day = date.format('dddd'); const context = { day, mealType, snackIndex }; setSelectedMeal({ meal, context }); };
  const handleUpdateServingsInPlan = () => { if (!selectedMeal || !selectedMeal.context) return; const { day, mealType, snackIndex } = selectedMeal.context; setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); if (mealType === 'snack' && snackIndex !== undefined) { newPlan[day].snacks[snackIndex].servings = servings; } else { newPlan[day][mealType].servings = servings; } return newPlan; }); Alert.alert("Plan Updated", `${selectedMeal.meal.name} servings updated to ${servings}.`); setSelectedMeal(null); };
  const handleAddDrink = (drink: {type: string, name: string}) => { const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; const newDrink = { ...drink, id: Date.now() }; return { ...currentDrinks, [dateString]: [...todayDrinks, newDrink] }; }); };
  const handleLogCustomDrink = async (text: string) => { setIsParsing(true); try { const parsedData = await parseAndFetchNutrition(text); const newDrink = { id: Date.now(), type: 'custom', name: parsedData.name, nutrition: parsedData.nutrition, }; const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; return { ...currentDrinks, [dateString]: [...todayDrinks, newDrink] }; }); } catch (error) { Alert.alert("Calculation Failed", "Couldn't determine nutrition for the drink."); } finally { setIsParsing(false); setLogDrinkModalVisible(false); } };
  const handleRemoveDrink = (drinkId: number) => { const dateString = currentDate.format('YYYY-MM-DD'); setLoggedDrinks(currentDrinks => { const todayDrinks = currentDrinks[dateString] || []; return { ...currentDrinks, [dateString]: todayDrinks.filter(d => d.id !== drinkId) }; }); };
  const handleLogWeight = (weight: number) => { const dateString = currentDate.format('YYYY-MM-DD'); const weightUnit = localMealSettings?.weightUnit || 'kg'; setWeightLog(currentLog => ({ ...currentLog, [dateString]: { weight: weight, unit: weightUnit } })); };
  const addMealToCache = (meal: Meal) => { saveAllMeals([...allMeals.filter(m => m.name !== meal.name), meal]); };
  const handleDateChange = (event: any, selectedDate?: Date) => { setDatePickerVisible(Platform.OS === 'ios'); if (selectedDate) { setCurrentDate(moment(selectedDate)); } };
  const handlePrevDay = () => setCurrentDate(currentDate.clone().subtract(1, 'day'));
  const handleNextDay = () => setCurrentDate(currentDate.clone().add(1, 'day'));
  const handleLogToggle = (date: moment.Moment, mealType: Meal['type'], snackIndex?: number) => { const dateString = date.format('YYYY-MM-DD'); setLoggedMeals(currentLogs => { const newLoggedMeals = JSON.parse(JSON.stringify(currentLogs || {})); const dayLog = newLoggedMeals[dateString] || { breakfast: false, lunch: false, dinner: false, snacks: [] }; if (mealType === 'snack' && snackIndex !== undefined) { if (!dayLog.snacks) dayLog.snacks = []; dayLog.snacks[snackIndex] = !dayLog.snacks[snackIndex]; } else if (mealType !== 'snack') { dayLog[mealType] = !dayLog[mealType]; } newLoggedMeals[dateString] = dayLog; return newLoggedMeals; }); };
  const weekDates = useMemo(() => { const startOfWeek = currentDate.clone().startOf('isoWeek'); return Array.from({ length: 7 }).map((_, i) => startOfWeek.clone().add(i, 'days')); }, [currentDate]);
  const handleOpenLogModal = (date: moment.Moment, type: Meal['type'], snackIndex?: number) => { setMealToLog({ date, type, snackIndex }); setLogMealModalVisible(true); };
  const handleLogFromText = async (text: string) => { if (!mealToLog) return; setIsParsing(true); try { const parsedData = await parseAndFetchNutrition(text); const uniqueName = `${parsedData.name} - ${Date.now()}`; const newMealObject: Meal = { ...parsedData, name: uniqueName, type: mealToLog.type, tags: ['logged', 'custom'], }; addMealToCache(newMealObject); const dayName = mealToLog.date.format('dddd'); if (mealToLog.type === 'snack' && mealToLog.snackIndex !== undefined) { updateSnack(dayName, mealToLog.snackIndex, newMealObject.name); } else { updateMeal(dayName, mealToLog.type, newMealObject.name); } handleLogToggle(mealToLog.date, mealToLog.type, mealToLog.snackIndex); } catch (error) { Alert.alert("Calculation Failed", "Couldn't determine nutrition. Please try again."); } finally { setIsParsing(false); setLogMealModalVisible(false); setMealToLog(null); } };
  const dailyLoggedTotals = useMemo(() => calculateTotalsForDate(currentDate.format('YYYY-MM-DD')), [currentDate, calculateTotalsForDate]);
  const dailyPlannedTotals = useMemo(() => { const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }; const dayPlan = localMealPlan[currentDate.format('dddd')]; if (!dayPlan) return totals; const allMealEntries = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])]; allMealEntries.forEach(mealEntry => { const mealData = findMealByName(mealEntry.name); if (mealData) { const mealServings = mealEntry.servings || 1; totals.calories += mealData.nutrition.calories * mealServings; totals.protein += mealData.nutrition.protein * mealServings; totals.carbs += mealData.nutrition.carbs * mealServings; totals.fat += mealData.nutrition.fat * mealServings; } }); return totals; }, [currentDate, localMealPlan, findMealByName]);
  const getShoppingListFromPlan = (planMeals) => { const ingredientMap = {}; planMeals.forEach(mealEntry => { if(!mealEntry?.name) return; const mealData = findMealByName(mealEntry.name); const mealServings = mealEntry.servings || 1; if (mealData?.ingredients) { mealData.ingredients.forEach(ing => { if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) { const key = `${ing.name}|${ing.unit}`; const quantity = ing.perPerson ? ing.baseQuantity * mealServings : ing.baseQuantity; ingredientMap[key] = (ingredientMap[key] || 0) + quantity; } else if (typeof ing === 'string') { const key = `${ing}|item`; ingredientMap[key] = (ingredientMap[key] || 0) + 1; } }); } }); customShoppingItems.forEach(item => { const key = `${item}|custom`; ingredientMap[key] = 1; }); return Object.entries(ingredientMap).map(([key, quantity]) => { const [name, unit] = key.split('|'); if(unit === 'custom' || unit === 'item') return name; const formattedQuantity = Number.isInteger(quantity as number) ? quantity : (quantity as number).toFixed(2).replace(/\.?0+$/, ""); return `${formattedQuantity}${unit !== 'whole' ? unit : ''} ${name}`; }).sort(); };
  const dailyMealEntries = useMemo(() => { const dayPlan = localMealPlan[currentDate.format('dddd')]; if (!dayPlan) return []; return [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])]; }, [currentDate, localMealPlan]);
  const weeklyMealEntries = useMemo(() => { let entries: any[] = []; weekDates.forEach(date => { const dayPlan = localMealPlan[date.format('dddd')]; if (dayPlan) { entries = entries.concat([dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])]); } }); return entries; }, [weekDates, localMealPlan]);
  const dailyShoppingList = useMemo(() => { const allIngredients = getShoppingListFromPlan(dailyMealEntries); return allIngredients.filter(item => !acquiredItems.has(item));}, [dailyMealEntries, customShoppingItems, acquiredItems]);
  const dailyClearedItems = useMemo(() => { const allIngredients = getShoppingListFromPlan(dailyMealEntries); return allIngredients.filter(item => acquiredItems.has(item));}, [dailyMealEntries, customShoppingItems, acquiredItems]);
  const weeklyShoppingList = useMemo(() => { const allIngredients = getShoppingListFromPlan(weeklyMealEntries); return allIngredients.filter(item => !acquiredItems.has(item));}, [weeklyMealEntries, customShoppingItems, acquiredItems]);
  const weeklyClearedItems = useMemo(() => { const allIngredients = getShoppingListFromPlan(weeklyMealEntries); return allIngredients.filter(item => acquiredItems.has(item));}, [weeklyMealEntries, customShoppingItems, acquiredItems]);
  const handleAcquireItem = (item: string) => { setAcquiredItems(prev => new Set(prev).add(item)); };
  const handleUnacquireItem = (item: string) => { setAcquiredItems(prev => { const newSet = new Set(prev); newSet.delete(item); return newSet; })};
  const handleAddCustomItem = (item: string) => { if(!customShoppingItems.includes(item)) setCustomShoppingItems(prev => [...prev, item]); };
  const handleClearShoppingHistory = () => { setAcquiredItems(new Set()); };
  const handleClearMeal = (date: moment.Moment, mealType: Meal['type'], snackIndex?: number) => { const dayName = date.format('dddd'); setLocalMealPlan(currentPlan => { const updatedPlan = JSON.parse(JSON.stringify(currentPlan)); if (mealType === 'snack' && snackIndex !== undefined) { if (updatedPlan[dayName]?.snacks?.[snackIndex]) { updatedPlan[dayName].snacks[snackIndex].name = ""; updatedPlan[dayName].snacks[snackIndex].servings = 1;} } else if (mealType !== 'snack') { if (updatedPlan[dayName]?.[mealType]) { updatedPlan[dayName][mealType].name = ""; updatedPlan[dayName][mealType].servings = 1;} } return updatedPlan; }); setLoggedMeals(currentLogs => { const dateString = date.format('YYYY-MM-DD'); if (!currentLogs[dateString]) return currentLogs; const updatedLogs = JSON.parse(JSON.stringify(currentLogs)); if (mealType === 'snack' && snackIndex !== undefined) { if (updatedLogs[dateString].snacks) { updatedLogs[dateString].snacks[snackIndex] = false; } } else if (mealType !== 'snack') { updatedLogs[dateString][mealType] = false; } return updatedLogs; }); };
  const handleDeleteSnackRow = (day: string, snackIndex: number) => { setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); newPlan[day].snacks.splice(snackIndex, 1); return newPlan; }); setLoggedMeals(currentLogs => { const newLoggedMeals = JSON.parse(JSON.stringify(currentLogs || {})); Object.keys(newLoggedMeals).forEach(dateString => { const date = moment(dateString); if (date.format('dddd') === day && newLoggedMeals[dateString]?.snacks) { newLoggedMeals[dateString].snacks.splice(snackIndex, 1); } }); return newLoggedMeals; }); };
  const updateMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', value: string) => { setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); newPlan[day][mealType] = { ...newPlan[day][mealType], name: value, servings: 1}; return newPlan; }); };
  const handleAddSnack = (day: string) => { setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); if (!newPlan[day].snacks) newPlan[day].snacks = []; newPlan[day].snacks.push({name: "", time: "15:00", servings: 1}); return newPlan; }); };
  const updateSnack = (day: string, snackIndex: number, value: string) => { setLocalMealPlan(plan => { const newPlan = JSON.parse(JSON.stringify(plan)); newPlan[day].snacks[snackIndex] = { ...newPlan[day].snacks[snackIndex], name: value, servings: 1}; return newPlan; }); };
  const clearPlan = () => { Alert.alert( "Reset Plan", "Are you sure you want to clear everything?", [ { text: "Cancel", style: "cancel" }, { text: "Yes, Reset", onPress: async () => { const clearedPlan = days.reduce((acc, day) => { acc[day] = { breakfast: {name: "", time: localMealSettings.mealTimes.breakfast, servings: 1}, lunch: {name: "", time: localMealSettings.mealTimes.lunch, servings: 1}, dinner: {name: "", time: localMealSettings.mealTimes.dinner, servings: 1}, snacks: [] }; return acc; }, {} as MealPlan); setLocalMealPlan(clearedPlan); setLoggedMeals({}); setAcquiredItems(new Set()); setCustomShoppingItems([]); setLoggedDrinks({}); setCheatDays({}); setWeightLog({}); setHabitTrackerWater({}); try { await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS)); } catch (e) { console.error("Failed to clear persisted data.", e); Alert.alert("Error", "Could not clear all saved data."); } }, style: "destructive", }, ] ); };
  const handleShareRecipe = async () => { if (!selectedMeal) return; const { meal } = selectedMeal; const { name, ingredients, recipe } = meal; const ingredientsList = ingredients.map(ing => `- ${ing.baseQuantity * servings}${ing.unit} ${ing.name}`).join('\n'); const content = `**Recipe for ${name} (${servings} serving${servings > 1 ? 's' : ''})**\n\n**Ingredients:**\n${ingredientsList}\n\n**Instructions:**\n${recipe}`; try { await Share.share({ message: content, title: `Recipe: ${name}` }); } catch (error) { Alert.alert((error as Error).message); }};
  const getMealOptions = useCallback((mealType: Meal['type'], count: number = 3) => {
    let options = MOCK_RECIPE_DATABASE.filter(meal => meal.type === mealType);
    if (localMealSettings.preferences.length > 0) {
      options = options.filter(meal => localMealSettings.preferences.every(pref => meal.tags.includes(pref.toLowerCase())) );
    }
    if (localMealSettings.allergies.length > 0) {
      const lowerCaseAllergies = localMealSettings.allergies.map(a => a.toLowerCase().trim());
      options = options.filter(meal => !lowerCaseAllergies.some(allergy => meal.tags.some(tag => tag.includes(allergy))) );
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options.slice(0, count);
  }, [localMealSettings.allergies, localMealSettings.preferences]);
  const dailyWater = useMemo(() => habitTrackerWater[currentDate.format('YYYY-MM-DD')] || 0, [currentDate, habitTrackerWater]);
  const dailyLoggedDrinks = useMemo(() => [ ...(loggedDrinks[currentDate.format('YYYY-MM-DD')] || []), ...(dailyWater > 0 ? [{ id: 'water', type: 'water', name: 'Water Intake', amount: dailyWater }] : []) ], [currentDate, loggedDrinks, dailyWater]);
  const { currentWeight, lastWeight } = useMemo(() => { const dateString = currentDate.format('YYYY-MM-DD'); const currentWeightData = weightLog[dateString] || null; const previousDates = Object.keys(weightLog).filter(d => d < dateString && weightLog[d]).sort().reverse(); const lastWeightData = previousDates.length > 0 ? weightLog[previousDates[0]] : null; return { currentWeight: currentWeightData, lastWeight: lastWeightData }; }, [currentDate, weightLog]);
  const weightUnit = localMealSettings?.weightUnit || 'kg';
  const showWeightTracker = localMealSettings?.showWeightTracker ?? true;
  const showShoppingList = localMealSettings?.showShoppingList ?? true;
  const isCheatDay = !!cheatDays[currentDate.format('YYYY-MM-DD')];

  if (!localMealPlan || isLoading) { return ( <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /><Text style={{color: theme.textSecondary}}>Loading Your Plan...</Text></View> ); }

  const dayCardProps = { findMealByName, addMealToCache, onAddLogEntry: handleOpenLogModal, onClearMeal: handleClearMeal, onDeleteSnackRow: handleDeleteSnackRow, onLogToggle: handleLogToggle, onSuggestMeal: getMealOptions, onSelectMeal: handleOpenMealModal, onUpdateMeal: updateMeal, onUpdateSnack: updateSnack, onAddSnack: handleAddSnack, styles, theme };

  const renderSwipeRightActions = () => ( <View style={styles.swipeActionContainer}><Ionicons name={isCheatDay ? "refresh-circle" : "bonfire"} size={30} color={theme.white} /><Text style={styles.swipeActionText}>{isCheatDay ? 'Undo' : 'Cheat Day'}</Text></View> );
  
  const handleAddMealFromRecipeBook = (meal: Meal) => {
    addMealToCache(meal); // Add to local cache so it can be found by name
    Alert.alert('Add to Plan', `Which meal should "${meal.name}" be for today?`, [
      { text: 'Breakfast', onPress: () => { updateMeal(currentDate.format('dddd'), 'breakfast', meal.name); setRecipeBookVisible(false); }},
      { text: 'Lunch', onPress: () => { updateMeal(currentDate.format('dddd'), 'lunch', meal.name); setRecipeBookVisible(false); }},
      { text: 'Dinner', onPress: () => { updateMeal(currentDate.format('dddd'), 'dinner', meal.name); setRecipeBookVisible(false); }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* --- ALL MODALS --- */}
      <Modal animationType="slide" transparent={true} visible={!!selectedMeal} onRequestClose={() => setSelectedMeal(null)}><View style={styles.modalBackdrop}><View style={styles.recipeModalContainer}>{selectedMeal && (<><Text style={styles.recipeTitle}>{selectedMeal.meal.name.replace(/(\s*\(Logged\))? - \d+$/, '')}</Text><ScrollView><View style={styles.servingsSelector}><Text style={styles.recipeSectionTitle}>Servings</Text><View style={styles.stepperContainer}><TouchableOpacity style={styles.stepperButton} onPress={() => setServings(s => Math.max(1, s - 1))}><Ionicons name="remove-circle-outline" size={32} color={theme.primary} /></TouchableOpacity><Text style={styles.servingsText}>{servings}</Text><TouchableOpacity style={styles.stepperButton} onPress={() => setServings(s => s + 1)}><Ionicons name="add-circle-outline" size={32} color={theme.primary} /></TouchableOpacity></View></View><Text style={styles.recipeSectionTitle}>Ingredients</Text>{selectedMeal.meal.ingredients.map((ing, i) => { if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) { const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity; const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, ""); return <Text key={i} style={styles.recipeText}>• {formattedQuantity}{ing.unit !== 'whole' ? ing.unit : ''} {ing.name}</Text> } else if (typeof ing === 'string') { return <Text key={i} style={styles.recipeText}>• {ing}</Text> } return null; })}<Text style={styles.recipeSectionTitle}>Instructions</Text><Text style={styles.recipeText}>{formatRecipe(selectedMeal.meal.recipe, selectedMeal.meal.ingredients, servings)}</Text></ScrollView><View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSelectedMeal(null)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateServingsInPlan}><Text style={styles.modalButtonText}>Update Plan</Text></TouchableOpacity></View></>)}</View></View></Modal>
      <SettingsModal isVisible={settingsModalVisible} onClose={() => setSettingsModalVisible(false)} mealSettings={localMealSettings} onSaveSettings={setLocalMealSettings} styles={styles} theme={theme} />
      {isDatePickerVisible && <DateTimePicker value={currentDate.toDate()} mode="date" display="default" onChange={handleDateChange} />}
      {mealToLog && <LogMealModal isVisible={logMealModalVisible} onClose={() => setLogMealModalVisible(false)} onSubmit={handleLogFromText} mealType={mealToLog.type} isParsing={isParsing} styles={styles} theme={theme} />}
      <LogMealModal isVisible={logDrinkModalVisible} onClose={() => setLogDrinkModalVisible(false)} onSubmit={handleLogCustomDrink} mealType={"Custom Drink"} isParsing={isParsing} styles={styles} theme={theme} placeholder="e.g., Vodka Red Bull, Large Latte" />
      <PlannerModal isVisible={plannerModalVisible} onClose={() => setPlannerModalVisible(false)} weekDates={weekDates} mealPlan={localMealPlan} weeklyShoppingList={weeklyShoppingList} weeklyClearedItems={weeklyClearedItems} onAcquireItem={handleAcquireItem} onUnacquireItem={handleUnacquireItem} onAddCustomItem={handleAddCustomItem} onClearHistory={handleClearShoppingHistory} loggedStatus={loggedMeals} monthlyTotals={allDaysTotals} cheatDays={cheatDays} onSelectDate={handleSelectDateFromCalendar} styles={styles} theme={theme} {...dayCardProps} />
      <RecipeBookModal isVisible={recipeBookVisible} onClose={() => setRecipeBookVisible(false)} onSelectMeal={handleAddMealFromRecipeBook} styles={styles} theme={theme} />

      {/* --- HEADER --- */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <View>
            <Text style={styles.headerTitle}>Daily Log</Text>
            <Text style={styles.headerSubtitle}>Plan and track your meals</Text>
          </View>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setRecipeBookVisible(true)}>
            <Ionicons name="fast-food-outline" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButton, {marginLeft: 10}]} onPress={() => setPlannerModalVisible(true)}>
            <Ionicons name="calendar-outline" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButton, {marginLeft: 10}]} onPress={() => setSettingsModalVisible(true)}>
            <Ionicons name="options-outline" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- MAIN CONTENT --- */}
      <View style={styles.dateNavigator}><TouchableOpacity onPress={handlePrevDay} style={styles.navButton}><Ionicons name="chevron-back-outline" size={24} color={theme.primary} /></TouchableOpacity><TouchableOpacity onPress={() => setDatePickerVisible(true)}><Text style={styles.dateDisplayText}>{currentDate.isSame(moment(), 'day') ? "Today" : currentDate.format('MMM Do, YYYY')}</Text></TouchableOpacity><TouchableOpacity onPress={handleNextDay} style={styles.navButton}><Ionicons name="chevron-forward-outline" size={24} color={theme.primary} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Swipeable renderRightActions={renderSwipeRightActions} onSwipeableRightOpen={handleSetCheatDay}>
          <View style={[styles.card, isCheatDay && styles.cheatDayCard]}>
            <Text style={styles.cardTitle}><Ionicons name={isCheatDay ? "bonfire-outline" : "today-outline"} size={22} color={theme.textPrimary} /> {currentDate.isSame(moment(), 'day') ? "Today's" : `${currentDate.format("dddd['s]")}`} Nutrition</Text>
            <Text style={styles.weeklyCalories}>{`${Math.round(dailyLoggedTotals.calories)} / ${Math.round(dailyPlannedTotals.calories)} kcal Logged`}</Text>
            <NutritionBar label="Protein" loggedValue={dailyLoggedTotals.protein} plannedValue={dailyPlannedTotals.protein} totalCalories={dailyPlannedTotals.calories} color="#3498db" styles={styles} />
            <NutritionBar label="Carbs"  loggedValue={dailyLoggedTotals.carbs} plannedValue={dailyPlannedTotals.carbs} totalCalories={dailyPlannedTotals.calories} color="#f1c40f" styles={styles} />
            <NutritionBar label="Fat" loggedValue={dailyLoggedTotals.fat} plannedValue={dailyPlannedTotals.fat} totalCalories={dailyPlannedTotals.calories} color="#e74c3c" styles={styles} />
          </View>
        </Swipeable>
        <DayCard date={currentDate} dayPlan={localMealPlan[currentDate.format('dddd')]} loggedStatus={loggedMeals[currentDate.format('YYYY-MM-DD')]} {...dayCardProps} />
        <DrinksTrackerCard drinks={dailyLoggedDrinks} onAddDrink={handleAddDrink} onRemoveDrink={handleRemoveDrink} onLogCustom={() => setLogDrinkModalVisible(true)} styles={styles} theme={theme} />
        {showWeightTracker && <WeightTrackerCard currentWeight={currentWeight} lastWeight={lastWeight} onLogWeight={handleLogWeight} unit={weightUnit} styles={styles} theme={theme} />}
        {showShoppingList && <ShoppingListCard list={dailyShoppingList} clearedItems={dailyClearedItems} onAcquireItem={handleAcquireItem} onUnacquireItem={handleUnacquireItem} onAddCustomItem={handleAddCustomItem} onClearHistory={handleClearShoppingHistory} title="Today's Shopping List" styles={styles} theme={theme} />}
        <TouchableOpacity onPress={clearPlan} style={styles.resetButton}><Ionicons name="refresh-outline" size={20} color={theme.white} /><Text style={styles.resetText}>Reset Full Plan & Logs</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// --- UTILITY FUNCTIONS ---
const formatRecipe = (recipe, ingredients, servings) => {
    if (!recipe) return "No instructions provided.";
    if (!ingredients || ingredients.length === 0 || typeof ingredients[0] === 'string') {
        return recipe;
    }
    let formatted = recipe;
    ingredients.forEach(ing => {
        if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) {
            const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity;
            const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, "");
            const replacement = `${formattedQuantity}${ing.unit !== 'whole' ? ing.unit : ''}`;
            formatted = formatted.replace(new RegExp(`{{${ing.name}}}`, 'g'), replacement);
        }
    });
    return formatted;
};

// --- STYLES ---
const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const onSecondaryColor = tinycolor(theme.textSecondary).isDark() ? theme.white : theme.textPrimary;
    const onAccentColor = tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary;
    const destructiveColor = '#DC2626';

    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.background },
      scrollContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50, },
      headerContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      headerButton: { backgroundColor: theme.surface, padding: 8, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
      headerTitle: { fontSize: 26, fontWeight: "bold", color: theme.textPrimary },
      headerSubtitle: { fontSize: 16, color: theme.textSecondary },
      dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, },
      navButton: { padding: 10, },
      dateDisplayText: { fontSize: 18, fontWeight: 'bold', color: theme.primary },
      card: { backgroundColor: theme.surface, borderRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, },
      cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
      cardTitleTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
      cardTitle: { fontSize: 20, fontWeight: "600", color: theme.textPrimary, flexDirection: 'row', alignItems: 'center', flex: 1, },
      cardActionIcon: { paddingLeft: 10 },
      dayTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary, marginBottom: 10, },
      dateSubtext: { fontWeight: '500', color: theme.textSecondary, fontSize: 18 },
      mealRow: { flexDirection: "row", alignItems: "center", minHeight: 60, borderBottomWidth: 1, borderBottomColor: theme.border, },
      logButton: { paddingRight: 10 },
      mealInfo: { flex: 1, marginLeft: 10, paddingVertical: 10 },
      mealType: { fontSize: 14, color: theme.textSecondary, fontWeight: '500', },
      mealNameText: { fontSize: 16, fontWeight: '600', color: theme.textPrimary, flexShrink: 1, },
      mealCalories: { fontSize: 14, color: theme.textSecondary, fontWeight: '500', marginHorizontal: 10, minWidth: 50, textAlign: 'right' },
      mealActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', },
      actionButton: { padding: 5, },
      addSnackButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 10, borderRadius: 8, },
      addSnackButtonText: { color: theme.primary, fontSize: 15, fontWeight: 'bold' },
      weeklyCalories: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20, },
      macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
      macroLabel: { width: '25%', fontSize: 14, color: theme.textSecondary, },
      progressBarContainer: { flex: 1, height: 10, backgroundColor: theme.border, borderRadius: 5, marginHorizontal: 10, justifyContent: 'center' },
      progressBar: { height: 10, borderRadius: 5, },
      macroValue: { width: '25%', textAlign: 'right', fontSize: 14, color: theme.textSecondary, },
      shoppingListContainer: { paddingTop: 10 },
      shoppingListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, },
      shoppingListItemText: { fontSize: 16, color: theme.textPrimary, },
      placeholderText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 20, fontSize: 16 },
      addItemContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
      addItemInput: { flex: 1, backgroundColor: theme.border, borderRadius: 10, padding: 10, fontSize: 16, color: theme.textPrimary, marginRight: 10 },
      addItemButton: { padding: 5 },
      resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: destructiveColor, paddingVertical: 15, borderRadius: 15, marginTop: 10, marginHorizontal: 20, shadowColor: destructiveColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, },
      resetText: { fontSize: 16, fontWeight: "bold", color: theme.white, marginLeft: 10, },
      modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', },
      modalContainer: { width: '90%', maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
      modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20, textAlign: 'center', },
      modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, gap: 15, },
      modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
      cancelButton: { backgroundColor: theme.textSecondary },
      cancelButtonText: { color: onSecondaryColor, fontSize: 16, fontWeight: 'bold' },
      saveButton: { backgroundColor: theme.primary },
      recipeModalContainer: { width: '90%', maxHeight: '80%', backgroundColor: theme.surface, borderRadius: 20, padding: 25, },
      optionsContainer: { marginTop: 8, paddingHorizontal: 10, backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, },
      overviewContainer: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? 30 : 60, },
      overviewHeader: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
      overviewTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, flex: 1, textAlign: 'center' },
      overviewDoneButton: { padding: 10, },
      overviewDoneButtonText: { fontSize: 18, color: theme.primary, fontWeight: '600' },
      overviewDayContainer: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
      overviewDayTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 5, marginLeft: 15, marginTop: 10 },
      exportButtonOverall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, paddingVertical: 15, borderRadius: 15, marginTop: 10, marginHorizontal: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, },
      preferenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 10 },
      preferenceButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.border, borderRadius: 20, },
      preferenceButtonActive: { backgroundColor: theme.primary, },
      preferenceText: { color: theme.textSecondary, fontWeight: '500', },
      preferenceTextActive: { color: onPrimaryColor, },
      formLabel: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, marginTop: 10, flex: 1 },
      modalButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: 'bold', },
      recipeTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15, textAlign: 'center', },
      recipeSectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 15, marginBottom: 5, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 5, },
      recipeText: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, },
      optionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, },
      optionText: { fontSize: 16, color: theme.textPrimary, flex: 1, paddingRight: 10, },
      optionCalories: { fontSize: 14, color: theme.textSecondary },
      noOptionsText: { textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', padding: 10 },
      timeSettingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, },
      timeValue: { fontSize: 16, fontWeight: '600', color: theme.primary, paddingVertical: 4, paddingHorizontal: 8, },
      iosPickerDoneButton: { backgroundColor: theme.primary, padding: 15, alignItems: 'center', borderRadius: 10, margin: 10, },
      iosPickerDoneButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: 'bold' },
      input: { backgroundColor: theme.border, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 10, color: theme.textPrimary },
      textArea: { height: 100, textAlignVertical: 'top' },
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
      settingSection: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 15 },
      settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, },
      swipeActionContainer: { backgroundColor: destructiveColor, justifyContent: 'center', alignItems: 'center', width: 100 },
      swipeActionText: { color: theme.white, fontWeight: '600', marginTop: 5 },
      cheatDayCard: { borderColor: destructiveColor, borderWidth: 2 },
      calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, },
      calendarMonthTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
      calendarDaysOfWeek: { flexDirection: 'row', paddingHorizontal: 5, marginBottom: 5 },
      calendarDayOfWeekText: { flex: 1, textAlign: 'center', fontWeight: 'bold', color: theme.textSecondary, fontSize: 12 },
      calendarRow: { flexDirection: 'row', paddingHorizontal: 5, marginBottom: 5, },
      calendarCell: { flex: 1, aspectRatio: 1, backgroundColor: theme.surface, margin: 3, borderRadius: 8, padding: 4, alignItems: 'center', },
      calendarCellNotInMonth: { backgroundColor: theme.background, borderWidth: 0 },
      calendarCellCheatDay: { backgroundColor: destructiveColor, },
      calendarCellDate: { fontSize: 12, fontWeight: 'bold', color: theme.textPrimary, alignSelf: 'flex-start' },
      calendarCellCalorieText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginTop: 4},
      mealIconsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginTop: 8, },
      clearedItemsContainer: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15, paddingTop: 5, },
      clearedItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10,},
      showClearedButton: { flexDirection: 'row', alignItems: 'center', },
      showClearedButtonText: { color: theme.primary, fontSize: 15, fontWeight: 'bold', },
      clearHistoryButtonText: { color: destructiveColor, fontSize: 14, fontWeight: '500' },
      clearedItemText: { fontSize: 16, color: theme.textSecondary, textDecorationLine: 'line-through' },
      servingsSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10},
      stepperContainer: { flexDirection: 'row', alignItems: 'center' },
      stepperButton: { paddingHorizontal: 10 },
      servingsText: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, marginHorizontal: 10 },
      recipeSearchContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
      tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      },
      tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginHorizontal: 5,
      },
      tabButtonActive: {
        backgroundColor: theme.primary,
      },
      tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.textSecondary,
      },
      tabTextActive: {
        color: onPrimaryColor,
      },
      searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 15,
      },
      searchBarIcon: {
        marginRight: 8,
      },
      searchBarInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: theme.textPrimary,
      },
    });
};
