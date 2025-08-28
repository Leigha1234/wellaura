import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useCallback, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Meal } from "../../types";

// Note: Ensure DRINK_NUTRITION is correctly imported or defined if needed
const DRINK_NUTRITION = { coffee: { calories: 5, protein: 0, carbs: 1, fat: 0 }, tea: { calories: 2, protein: 0, carbs: 0.5, fat: 0 }, smoothie: { calories: 180, protein: 4, carbs: 35, fat: 2 },};

// --- MAIN CALENDAR VIEW COMPONENT ---
export default function MonthlyMealView() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);

    const {
        monthlyTotals,
        cheatDays,
        mealPlan,
        loggedMeals,
        loggedDrinks,
        allMeals,
        localMealCache = [],
    } = route.params;

    const findMealById = useCallback((id: string): Meal | undefined => {
        if (!id) return undefined;
        return allMeals.find(m => m.id === id) || localMealCache.find(m => m.id === id);
    }, [allMeals, localMealCache]);

    const [viewDate, setViewDate] = useState(moment());
    const [selectedDateString, setSelectedDateString] = useState < string | null > (moment().format('YYYY-MM-DD'));

    const selectedDayDetails = useMemo(() => {
        if (!selectedDateString) return null;
        
        const dayTotals = monthlyTotals[selectedDateString];
        if (!dayTotals) {
             const recentDayWithData = Object.keys(monthlyTotals).sort().reverse().find(date => monthlyTotals[date]);
             if (recentDayWithData && recentDayWithData !== selectedDateString) {
                setSelectedDateString(recentDayWithData);
             }
             return null;
        }

        const dayLog = loggedMeals[selectedDateString] || {};
        const dayPlan = mealPlan[moment(selectedDateString).format('dddd')];
        const dayDrinks = loggedDrinks[selectedDateString] || [];
        const items = [];

        if (dayPlan) {
            const processMeal = (mealType: string, index?: number) => {
                const isSnack = mealType === 'snack';
                let mealEntry;

                if (isSnack && index !== undefined) {
                    if (dayLog.snacks?.[index]) mealEntry = dayPlan.snacks?.[index];
                } else if (!isSnack) {
                    if (dayLog[mealType]) mealEntry = dayPlan[mealType];
                }

                if (mealEntry?.id) {
                    const mealData = findMealById(mealEntry.id);
                    if (mealData) {
                         items.push({
                            type: 'meal',
                            name: mealEntry.name,
                            servings: mealEntry.servings || 1,
                            nutrition: mealData.nutrition,
                        });
                    }
                }
            };
            processMeal('breakfast');
            processMeal('lunch');
            processMeal('dinner');
            if (dayPlan.snacks) {
              dayPlan.snacks.forEach((_, index) => processMeal('snack', index));
            }
        }

        (dayDrinks || []).forEach(drink => {
            const nutrition = drink.nutrition || DRINK_NUTRITION[drink.type];
            if (nutrition) {
                items.push({ type: 'drink', name: drink.name, nutrition, servings: 1 });
            }
        });

        return { items, totals: dayTotals };
    }, [selectedDateString, loggedMeals, mealPlan, loggedDrinks, findMealById, monthlyTotals]);

    const renderHeader = () => (
        <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setViewDate(viewDate.clone().subtract(1, 'month'))} style={styles.navButton}>
                <Ionicons name="chevron-back-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthTitle}>{viewDate.format('MMMM YYYY')}</Text>
            <TouchableOpacity onPress={() => setViewDate(viewDate.clone().add(1, 'month'))} style={styles.navButton}>
                <Ionicons name="chevron-forward-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderDaysOfWeek = () => (
        <View style={styles.calendarDaysOfWeek}>
            {moment.weekdaysShort().map(day => <Text key={day} style={styles.calendarDayOfWeekText}>{day}</Text>)}
        </View>
    );

    const renderCells = () => {
        const monthStart = viewDate.clone().startOf('month');
        const monthEnd = viewDate.clone().endOf('month');
        const startDate = monthStart.clone().startOf('week');
        const endDate = monthEnd.clone().endOf('week');
        const rows = [];
        let days = [];
        let day = startDate.clone();
        while (day.isBefore(endDate)) {
            for (let i = 0; i < 7; i++) {
                const dateString = day.format('YYYY-MM-DD');
                const dayTotals = monthlyTotals[dateString];
                const isCheatDay = cheatDays[dateString];
                const isSelected = selectedDateString === dateString;
                days.push(
                    <TouchableOpacity
                        key={day.toString()}
                        onPress={() => setSelectedDateString(dateString)}
                        disabled={!day.isSame(monthStart, 'month')}
                        style={[
                            styles.calendarCell,
                            !day.isSame(monthStart, 'month') && styles.calendarCellNotInMonth,
                            isCheatDay && styles.calendarCellCheatDay,
                            isSelected && styles.calendarCellSelected
                        ]}
                    >
                        <Text style={[styles.calendarCellDate, isCheatDay && { color: theme.white }]}>{day.format('D')}</Text>
                        {day.isSame(monthStart, 'month') && dayTotals && (
                            <Text style={[styles.calendarCellCalorieText, isCheatDay && { color: theme.white, opacity: 0.9 }]}>
                                {dayTotals.calories} kcal
                            </Text>
                        )}
                        {isCheatDay && <Ionicons name="bonfire-outline" size={18} color={theme.white} style={{ position: 'absolute', bottom: 5, right: 5 }} />}
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
        <View style={styles.overviewContainer}>
            <View style={styles.overviewHeader}>
                 <TouchableOpacity onPress={() => navigation.navigate('meal-planner')} style={styles.recipeBookBackButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.overviewTitle}>Monthly Summary</Text>
                <View style={{width: 40}} />
            </View>
            <ScrollView>
                <View style={{ paddingBottom: 20 }}>
                    {renderHeader()}
                    {renderDaysOfWeek()}
                    {renderCells()}
                    {selectedDayDetails && (
                        <View style={styles.calendarDetailContainer}>
                            <Text style={styles.calendarDetailTitle}>Details for {moment(selectedDateString).format('MMMM Do, YYYY')}</Text>
                            {selectedDayDetails.items.length > 0 ? selectedDayDetails.items.map((item, index) => {
                                // Calculate totals per item, accounting for servings
                                const totalNutrition = {
                                    calories: Math.round(item.nutrition.calories * (item.servings || 1)),
                                    protein: Math.round(item.nutrition.protein * (item.servings || 1)),
                                    carbs: Math.round(item.nutrition.carbs * (item.servings || 1)),
                                    fat: Math.round(item.nutrition.fat * (item.servings || 1)),
                                };
                                return (
                                <View key={index} style={styles.calendarDetailMealRow}>
                                    <Ionicons name={item.type === 'meal' ? 'restaurant-outline' : 'water-outline'} size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                                    <View style={styles.calendarDetailInfo}>
                                        <Text style={styles.calendarDetailMealName} numberOfLines={1}>{item.name.replace(/(\s*\(Logged\))? - \d+$/, '')}</Text>
                                        <Text style={styles.calendarDetailMealSubText}>
                                            P: {totalNutrition.protein}g, C: {totalNutrition.carbs}g, F: {totalNutrition.fat}g
                                        </Text>
                                    </View>
                                    <Text style={styles.calendarDetailMealNutrition}>{totalNutrition.calories} kcal</Text>
                                </View>
                            )}) : <Text style={styles.placeholderText}>No items logged for this day.</Text>}
                            <View style={styles.calendarDetailTotalRow}>
                                <Text style={styles.calendarDetailTotalLabel}>Total</Text>
                                <Text style={styles.calendarDetailTotalNutrition}>
                                    Cal: {selectedDayDetails.totals.calories}, P: {selectedDayDetails.totals.protein}g, C: {selectedDayDetails.totals.carbs}g, F: {selectedDayDetails.totals.fat}g
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

// --- STYLES ---
const getDynamicStyles = (theme) => {
    const destructiveColor = '#DC2626';

    return StyleSheet.create({
        overviewContainer: { flex: 1, backgroundColor: theme.background },
        overviewHeader: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
        overviewTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
        recipeBookBackButton: { padding: 5 },
        calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, },
        calendarMonthTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
        navButton: { padding: 10 },
        calendarDaysOfWeek: { flexDirection: 'row', paddingHorizontal: 5, marginBottom: 5 },
        calendarDayOfWeekText: { flex: 1, textAlign: 'center', fontWeight: 'bold', color: theme.textSecondary, fontSize: 12 },
        calendarRow: { flexDirection: 'row', paddingHorizontal: 5, marginBottom: 5, },
        calendarCell: { flex: 1, aspectRatio: 1, backgroundColor: theme.surface, margin: 3, borderRadius: 8, padding: 4, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.border },
        calendarCellNotInMonth: { backgroundColor: theme.background, borderWidth: 0 },
        calendarCellCheatDay: { backgroundColor: destructiveColor, borderColor: destructiveColor },
        calendarCellSelected: { borderWidth: 2, borderColor: theme.primary, },
        calendarCellDate: { fontSize: 12, fontWeight: 'bold', color: theme.textPrimary, alignSelf: 'flex-start' },
        calendarCellCalorieText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
        calendarDetailContainer: { marginHorizontal: 15, marginTop: 20, backgroundColor: theme.surface, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: theme.border },
        calendarDetailTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 10, },
        calendarDetailMealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border, },
        calendarDetailInfo: { flex: 1, marginRight: 8, },
        calendarDetailMealName: { fontSize: 15, color: theme.textPrimary, fontWeight: '600' },
        calendarDetailMealSubText: { fontSize: 12, color: theme.textSecondary, paddingTop: 2 },
        calendarDetailMealNutrition: { fontSize: 15, color: theme.textSecondary, fontWeight: '500' },
        calendarDetailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 5, },
        calendarDetailTotalLabel: { fontSize: 16, color: theme.textPrimary, fontWeight: 'bold', },
        calendarDetailTotalNutrition: { fontSize: 14, color: theme.textSecondary, flex: 1, textAlign: 'right', },
        placeholderText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 20, fontSize: 16 },
    });
};