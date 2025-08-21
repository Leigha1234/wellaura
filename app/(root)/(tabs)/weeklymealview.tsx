import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useCallback } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Meal } from "../../types";

// --- A READ-ONLY MEAL ROW COMPONENT FOR THIS VIEW ---
const MealRow = ({ mealType, mealItem, findMealById, styles }) => {
    if (!mealItem?.name) {
        return null; // Don't show empty meal slots in the overview
    }
    const mealData = findMealById(mealItem.id);
    const mealIcons = {
        breakfast: "cafe-outline",
        lunch: "restaurant-outline",
        dinner: "moon-outline",
        snack: "pizza-outline",
    };

    return (
        <View style={styles.mealRow}>
            <Ionicons name={mealIcons[mealType] || "help-outline"} size={22} color={styles.mealInfo.color} style={styles.mealIcon} />
            <Text style={styles.mealName} numberOfLines={1}>{mealItem.name}</Text>
            <Text style={styles.mealCalories}>{mealData ? `${Math.round(mealData.nutrition.calories)} kcal` : ''}</Text>
        </View>
    );
};


// --- MAIN WEEKLY VIEW COMPONENT ---

export default function WeeklyMealView() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);

    const {
        weekDates,
        mealPlan,
        allMeals,
        localMealCache = [], 
    } = route.params;

    const findMealById = useCallback((id: string): Meal | undefined => {
        if (!id) return undefined;
        return allMeals.find(m => m.id === id) || localMealCache.find(m => m.id === id);
    }, [allMeals, localMealCache]);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.navigate('meal-planner')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weekly Overview</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {weekDates.map((date, index) => {
                    const dayName = moment(date).format('dddd');
                    const dayPlan = mealPlan[dayName];
                    if (!dayPlan) return null;

                    return (
                        <View key={index} style={styles.dayCard}>
                            <Text style={styles.dayTitle}>{dayName} <Text style={styles.dateSubtext}>{moment(date).format('MMM Do')}</Text></Text>
                            <MealRow mealType="breakfast" mealItem={dayPlan.breakfast} findMealById={findMealById} styles={styles} />
                            <MealRow mealType="lunch" mealItem={dayPlan.lunch} findMealById={findMealById} styles={styles} />
                            <MealRow mealType="dinner" mealItem={dayPlan.dinner} findMealById={findMealById} styles={styles} />
                            {dayPlan.snacks?.map((snack, i) => (
                                <MealRow key={`snack-${i}`} mealType="snack" mealItem={snack} findMealById={findMealById} styles={styles} />
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};


// --- STYLES ---
const getDynamicStyles = (theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        header: {
            paddingTop: 60,
            paddingBottom: 10,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.surface,
        },
        headerTitle: {
            fontSize: 22,
            fontWeight: 'bold',
            color: theme.textPrimary,
        },
        backButton: {
            padding: 5,
        },
        scrollContainer: {
            padding: 15,
        },
        dayCard: {
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 5,
        },
        dayTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.textPrimary,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            paddingBottom: 10,
        },
        dateSubtext: {
            fontWeight: '500',
            color: theme.textSecondary,
            fontSize: 16,
        },
        mealRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        mealIcon: {
            marginRight: 15,
        },
        mealInfo: {
            color: theme.textSecondary,
        },
        mealName: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.textPrimary,
            flex: 1,
        },
        mealCalories: {
            fontSize: 14,
            color: theme.textSecondary,
            fontWeight: '500',
        }
    });
};