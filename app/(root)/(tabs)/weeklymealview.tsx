import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import tinycolor from "tinycolor2";
import { mealTypes } from "../../../components/mealData";
import { useTheme } from "../../context/ThemeContext";
import { Meal } from "../../types";

// --- REUSABLE COMPONENTS ---

const EditableMealRow = ({ date, dayPlan, mealType, snackIndex, loggedStatus, findMealByName, onAddLogEntry, onClearMeal, onDeleteSnackRow, onLogToggle, onSuggestMeal, onSelectMeal, onUpdateMeal, onUpdateSnack, addMealToCache, styles, theme }) => {
    const [activeOptions, setActiveOptions] = useState<{ key: string, options: Meal[] } | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const dayName = date.format('dddd');

    const handleSuggestClick = async () => {
        const key = snackIndex !== undefined ? `${dayName}-${mealType}-${snackIndex}` : `${dayName}-${mealType}`;
        setIsSuggesting(true);
        setActiveOptions({ key, options: [] });
        const mealChoices = await onSuggestMeal(mealType, 3);
        setActiveOptions({ key, options: mealChoices });
        setIsSuggesting(false);
    };

    const handleOptionSelect = (meal: Meal) => {
        addMealToCache(meal);
        if (snackIndex !== undefined) {
            onUpdateSnack(dayName, snackIndex, meal.name);
        } else {
            onUpdateMeal(dayName, mealType as any, meal.name);
        }
        setActiveOptions(null);
    };

    const isSnack = mealType === 'snack';
    const mealItem = isSnack && snackIndex !== undefined ? dayPlan.snacks[snackIndex] : dayPlan[mealType];
    if (!mealItem) return null;

    const key = isSnack ? `${dayName}-${mealType}-${snackIndex}` : `${dayName}-${mealType}`;
    const mealData = findMealByName(mealItem.name);
    const isLogged = isSnack ? loggedStatus?.[date.format('YYYY-MM-DD')]?.snacks?.[snackIndex] : loggedStatus?.[date.format('YYYY-MM-DD')]?.[mealType];

    const handlePress = () => {
        if (mealData) {
            onSelectMeal(mealData, date, mealType, snackIndex);
        } else {
            onAddLogEntry(date, mealType, snackIndex);
        }
    };

    return (
        <View>
            <View style={styles.mealRow}>
                <TouchableOpacity onPress={() => onLogToggle(date, mealType, snackIndex)} style={styles.logButton} disabled={!mealItem.name}>
                    <Ionicons name={isLogged ? "checkmark-circle" : "checkmark-circle-outline"} size={28} color={isLogged ? "#28a745" : mealItem.name ? theme.textSecondary : theme.border} />
                </TouchableOpacity>
                <Ionicons name={mealTypes[mealType].icon} size={24} color={theme.textSecondary} />
                <TouchableOpacity style={styles.mealInfo} onPress={handlePress}>
                    <Text style={styles.mealType}>{isSnack ? `Snack ${snackIndex + 1}` : mealType.charAt(0).toUpperCase() + mealType.slice(1)} - {mealItem.time}</Text>
                    <Text style={styles.mealNameText} numberOfLines={1}>{mealItem.name || 'Tap to add...'}</Text>
                </TouchableOpacity>
                <Text style={styles.mealCalories}>{mealData ? `${Math.round(mealData.nutrition.calories * (mealItem.servings || 1))} kcal` : ''}</Text>
                <View style={styles.mealActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleSuggestClick} disabled={isSuggesting}>
                        <Ionicons name="shuffle-outline" size={24} color={isSuggesting ? theme.textSecondary : theme.primary} />
                    </TouchableOpacity>
                    {mealItem.name && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => onClearMeal(date, mealType, snackIndex)}>
                            <Ionicons name="close-circle-outline" size={23} color="#dc3545" />
                        </TouchableOpacity>
                    )}
                    {isSnack && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => onDeleteSnackRow(dayName, snackIndex)}>
                            <Ionicons name="trash-outline" size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {activeOptions?.key === key && (
                <View style={styles.optionsContainer}>
                    {isSuggesting ? <ActivityIndicator color={theme.primary} /> : activeOptions.options.length > 0 ?
                        activeOptions.options.map(option => (
                            <TouchableOpacity key={option.name} style={styles.optionButton} onPress={() => handleOptionSelect(option)}>
                                <Text style={styles.optionText}>{option.name}</Text>
                                <Text style={styles.optionCalories}>{option.nutrition.calories} kcal</Text>
                            </TouchableOpacity>
                        )) : <Text style={styles.noOptionsText}>No matching options found.</Text>}
                </View>
            )}
        </View>
    );
};

const ShoppingListCard = ({ list, clearedItems, onAcquireItem, onUnacquireItem, onAddCustomItem, onClearHistory, title, onShare, styles, theme }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showCleared, setShowCleared] = useState(false);
    const [newItemText, setNewItemText] = useState("");
    const handleAddItem = () => { if (newItemText.trim()) { onAddCustomItem(newItemText.trim()); setNewItemText(""); } };
    const handleClearHistory = () => { Alert.alert( "Clear History", "Are you sure you want to permanently delete all cleared shopping items?", [ { text: "Cancel", style: "cancel" }, { text: "Yes, Clear", onPress: onClearHistory, style: "destructive" } ] )};
    return ( <View style={styles.card}><TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}><View style={styles.cardTitleRow}><TouchableOpacity style={styles.cardTitleTouchable} onPress={() => setIsExpanded(!isExpanded)}><Text style={styles.cardTitle}><Ionicons name="list-outline" size={22} color={theme.textPrimary}/> {title} ({list.length})</Text><Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} /></TouchableOpacity>{onShare && ( <TouchableOpacity style={styles.cardActionIcon} onPress={onShare}><Ionicons name="share-social-outline" size={24} color={theme.primary}/></TouchableOpacity> )}</View></TouchableOpacity>{isExpanded && ( <View>{list.length === 0 && clearedItems.length === 0 ? (<Text style={styles.placeholderText}>Your shopping list is empty.</Text>) : ( <View style={styles.shoppingListContainer}>{list.map((item, index) => <TouchableOpacity key={index} style={styles.shoppingListItem} onPress={() => onAcquireItem(item)}><Ionicons name="ellipse-outline" size={16} color={theme.primary} style={{marginRight: 10}}/><Text style={styles.shoppingListItemText}>{item}</Text></TouchableOpacity>)}</View> )}<View style={styles.addItemContainer}><TextInput style={styles.addItemInput} placeholder="Add custom item..." value={newItemText} onChangeText={setNewItemText} onSubmitEditing={handleAddItem} placeholderTextColor={theme.textSecondary}/><TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}><Ionicons name="add-circle" size={32} color="#28a745" /></TouchableOpacity></View>{clearedItems.length > 0 && (<View style={styles.clearedItemsContainer}><View style={styles.clearedItemsHeader}><TouchableOpacity style={styles.showClearedButton} onPress={() => setShowCleared(!showCleared)}><Text style={styles.showClearedButtonText}>{showCleared ? 'Hide' : 'Show'} Cleared ({clearedItems.length})</Text><Ionicons name={showCleared ? "chevron-up-outline" : "chevron-down-outline"} size={20} color={theme.primary} style={{marginLeft: 5}} /></TouchableOpacity>{showCleared && <TouchableOpacity onPress={handleClearHistory}><Text style={styles.clearHistoryButtonText}>Clear History</Text></TouchableOpacity>}</View>{showCleared && clearedItems.map((item, index) => ( <TouchableOpacity key={`cleared-${index}`} style={styles.shoppingListItem} onPress={() => onUnacquireItem(item)}><Ionicons name="arrow-undo-outline" size={16} color={theme.textSecondary} style={{marginRight: 10}}/><Text style={styles.clearedItemText}>{item}</Text></TouchableOpacity> ))}</View>)}</View> )}</View> );
};


// --- MAIN WEEKLY VIEW COMPONENT ---

export default function WeeklyMealView() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);
    
    const { weekDates, mealPlan, mealSettings, favorites, loggedStatus, findMealByName, addMealToCache, onUpdateMeal, onUpdateSnack, onAddSnack, onClearMeal, onDeleteSnackRow, onLogToggle, onSuggestMeal, onSelectMeal, onToggleFavorite } = route.params;

    const [acquiredItems, setAcquiredItems] = useState(new Set<string>());
    const [customShoppingItems, setCustomShoppingItems] = useState<string[]>([]);
    
    const handleAcquireItem = (item: string) => { setAcquiredItems(prev => new Set(prev).add(item)); };
    const handleUnacquireItem = (item: string) => { setAcquiredItems(prev => { const newSet = new Set(prev); newSet.delete(item); return newSet; })};
    const handleAddCustomItem = (item: string) => { if(!customShoppingItems.includes(item)) setCustomShoppingItems(prev => [...prev, item]); };
    const handleClearShoppingHistory = () => { setAcquiredItems(new Set()); };

    const getShoppingListFromPlan = useCallback((mealEntries) => {
        const ingredientMap = {};
        mealEntries.forEach(mealEntry => {
            if(!mealEntry?.name) return;
            const mealData = findMealByName(mealEntry.name);
            if (!mealData?.ingredients) return;
            const mealServings = mealEntry.servings || 1;
            mealData.ingredients.forEach(ing => {
                if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) {
                    const key = `${ing.name}|${ing.unit}`;
                    const quantity = ing.perPerson ? ing.baseQuantity * mealServings : ing.baseQuantity;
                    ingredientMap[key] = (ingredientMap[key] || 0) + quantity;
                }
            });
        });
        return Object.entries(ingredientMap).map(([key, quantity]) => {
            const [name, unit] = key.split('|');
            const formattedQuantity = Number.isInteger(quantity as number) ? quantity : (quantity as number).toFixed(2).replace(/\.?0+$/, "");
            return `${formattedQuantity}${unit !== 'whole' ? ` ${unit}` : ''} ${name}`;
        }).sort();
    }, [findMealByName]);

    const weeklyMealEntries = useMemo(() => {
        let entries = [];
        weekDates.forEach(date => {
            const dayPlan = mealPlan[date.format('dddd')];
            if (dayPlan) {
                entries = entries.concat([dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...(dayPlan.snacks || [])]);
            }
        });
        return entries;
    }, [weekDates, mealPlan]);

    const fullWeeklyShoppingList = useMemo(() => [...getShoppingListFromPlan(weeklyMealEntries), ...customShoppingItems].sort(), [weeklyMealEntries, customShoppingItems, getShoppingListFromPlan]);
    const weeklyShoppingList = useMemo(() => fullWeeklyShoppingList.filter(item => !acquiredItems.has(item)), [fullWeeklyShoppingList, acquiredItems]);
    const weeklyClearedItems = useMemo(() => fullWeeklyShoppingList.filter(item => acquiredItems.has(item)), [fullWeeklyShoppingList, acquiredItems]);

    const editableRowProps = { loggedStatus, findMealByName, addMealToCache, onAddLogEntry: () => Alert.alert("Log Meal", "Please log meals from the daily view."), onClearMeal, onDeleteSnackRow, onLogToggle, onSuggestMeal, onSelectMeal, onUpdateMeal, onUpdateSnack, onAddSnack, styles, theme };

    return (
        <View style={styles.overviewContainer}>
            <View style={styles.overviewHeader}>
                <TouchableOpacity onPress={() => navigation.navigate('meal-planner')} style={styles.recipeBookBackButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.overviewTitle}>Weekly Plan</Text>
                <View style={{width: 40}} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <TouchableOpacity 
                    style={styles.exportButtonOverall} 
                    onPress={() => navigation.navigate('recipes', {
                        mealSettings: mealSettings,
                        favorites: favorites,
                        onToggleFavorite: onToggleFavorite,
                        onUpdateMeal: onUpdateMeal,
                        onUpdateSnack: onUpdateSnack,
                        addMealToCache: addMealToCache,
                    })}
                >
                    <Ionicons name="book-outline" size={20} color={theme.white} />
                    <Text style={styles.resetText}>Open Recipe Book</Text>
                </TouchableOpacity>

                <ShoppingListCard 
                    list={weeklyShoppingList} 
                    clearedItems={weeklyClearedItems} 
                    onAcquireItem={handleAcquireItem}
                    onUnacquireItem={handleUnacquireItem}
                    onAddCustomItem={handleAddCustomItem}
                    onClearHistory={handleClearShoppingHistory}
                    title="This Week's Shopping List" 
                    styles={styles} 
                    theme={theme} 
                />

                {weekDates.map(date => {
                    const dayName = date.format('dddd');
                    const dayPlan = mealPlan[dayName];
                    if (!dayPlan) return null;

                    return (
                        <View key={dayName} style={styles.card}>
                            <Text style={styles.dayTitle}>{dayName} <Text style={styles.dateSubtext}>{date.format('MMM Do')}</Text></Text>
                            <EditableMealRow date={date} dayPlan={dayPlan} mealType="breakfast" {...editableRowProps} />
                            <EditableMealRow date={date} dayPlan={dayPlan} mealType="lunch" {...editableRowProps} />
                            <EditableMealRow date={date} dayPlan={dayPlan} mealType="dinner" {...editableRowProps} />
                            {(dayPlan.snacks || []).map((_, index) => 
                                <EditableMealRow key={`${date.format('YYYYMMDD')}-snack-${index}`}  date={date} dayPlan={dayPlan} mealType="snack" snackIndex={index} {...editableRowProps} />
                            )}
                            <TouchableOpacity style={styles.addSnackButton} onPress={() => onAddSnack(dayName)}>
                                <Ionicons name="add-outline" size={20} color={theme.primary}/>
                                <Text style={styles.addSnackButtonText}>Add Snack</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

// --- STYLES ---
const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const destructiveColor = '#DC2626';
    return StyleSheet.create({
        overviewContainer: { flex: 1, backgroundColor: theme.background },
        scrollContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50 },
        overviewHeader: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
        overviewTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
        recipeBookBackButton: { padding: 5 },
        card: { backgroundColor: theme.surface, borderRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
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
        exportButtonOverall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, paddingVertical: 15, borderRadius: 15, marginHorizontal: 5, marginBottom: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, },
        resetText: { fontSize: 16, fontWeight: "bold", color: onPrimaryColor, marginLeft: 10, },
        cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        cardTitleTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
        cardTitle: { fontSize: 20, fontWeight: "600", color: theme.textPrimary, marginBottom: 20, flexDirection: 'row', alignItems: 'center', flex: 1 },
        cardActionIcon: { marginBottom: 20, paddingLeft: 10 },
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
        placeholderText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },
    });
};