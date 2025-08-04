import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { BudgetSettings, CalendarEvent, CycleData, Habit, Meal, MealPlan, MealSettings, Transaction } from './types';

// --- ASYNCSTORAGE KEYS ---
const CYCLE_DATA_KEY = '@cycle_data_v1';
const BUDGET_TRANSACTIONS_KEY = 'budget_transactions_v12';
const BUDGET_SETTINGS_KEY = 'budget_settings_v12';
const HABITS_KEY = '@habits_v2';
const CALENDAR_EVENTS_KEY = '@calendar_events_v1';
const MEAL_PLAN_KEY = '@meal_plan_v2';
const ALL_MEALS_KEY = '@all_meals_v1';
const MEAL_SETTINGS_KEY = '@meal_settings_v1';

// --- DEFAULTS & HELPERS ---
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultMealTimes = { breakfast: "08:00", lunch: "13:00", dinner: "19:00" };
const defaultPlan: MealPlan = days.reduce((acc, day) => {
    acc[day] = {
        breakfast: { name: "", time: defaultMealTimes.breakfast },
        lunch: { name: "", time: defaultMealTimes.lunch },
        dinner: { name: "", time: defaultMealTimes.dinner },
        snacks: [],
    };
    return acc;
}, {} as MealPlan);
const defaultMealSettings: MealSettings = { preferences: [], allergies: [], mealTimes: defaultMealTimes };
const defaultBudgetSettings: BudgetSettings = { incomeVaries: true, fixedIncome: '2000', customCategories: [], customIncomeCategories: [], budgetPeriod: 'Monthly', defaultCategoryAmounts: {}, scheduledPayments: [] };
const defaultCycleData: CycleData = { cycleStart: new Date().toISOString(), cycleLength: 28, periodDuration: 5, goal: 'None', userDueDate: null };
const getPhaseColor = (phase: string) => {
  switch (phase) {
    case "Menstruation": return "#c2185b";
    case "Ovulation (Fertile Window)": return "#00bcd4";
    default: return "#e0e0e0";
  }
};

interface WellauraContextType {
  isLoading: boolean;
  transactions: Transaction[]; saveTransactions: (data: Transaction[]) => Promise<void>;
  budgetSettings: BudgetSettings; saveBudgetSettings: (data: BudgetSettings) => Promise<void>;
  habits: Habit[]; saveHabits: (data: Habit[]) => Promise<void>;
  calendarEvents: CalendarEvent[]; saveCalendarEvents: (data: CalendarEvent[]) => Promise<void>;
  mealPlan: MealPlan; saveMealPlan: (data: MealPlan) => Promise<void>;
  allMeals: Meal[]; saveAllMeals: (data: Meal[]) => Promise<void>;
  mealSettings: MealSettings; saveMealSettings: (data: MealSettings) => Promise<void>;
  cycleData: CycleData | null; saveCycleData: (data: CycleData) => Promise<void>;
}

const WellauraContext = createContext<WellauraContextType | undefined>(undefined);

export const WellauraProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(defaultBudgetSettings);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(defaultPlan);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [mealSettings, setMealSettings] = useState<MealSettings>(defaultMealSettings);
  const [cycleData, setCycleData] = useState<CycleData | null>(defaultCycleData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [transData, settingsData, habitsData, eventsData, mealPlanData, allMealsData, mealSettingsData, cycleDataStr] = await Promise.all([
          AsyncStorage.getItem(BUDGET_TRANSACTIONS_KEY), AsyncStorage.getItem(BUDGET_SETTINGS_KEY),
          AsyncStorage.getItem(HABITS_KEY), AsyncStorage.getItem(CALENDAR_EVENTS_KEY),
          AsyncStorage.getItem(MEAL_PLAN_KEY), AsyncStorage.getItem(ALL_MEALS_KEY),
          AsyncStorage.getItem(MEAL_SETTINGS_KEY), AsyncStorage.getItem(CYCLE_DATA_KEY),
        ]);
        
        if (transData) setTransactions(JSON.parse(transData));
        if (settingsData) setBudgetSettings(JSON.parse(settingsData));
        if (habitsData) setHabits(JSON.parse(habitsData));
        if (eventsData) setCalendarEvents(JSON.parse(eventsData).map(e => ({...e, start: new Date(e.start), end: new Date(e.end)})));
        if (mealPlanData) setMealPlan(JSON.parse(mealPlanData));
        if (allMealsData) setAllMeals(JSON.parse(allMealsData));
        if (mealSettingsData) setMealSettings(JSON.parse(mealSettingsData));
        if (cycleDataStr) setCycleData(JSON.parse(cycleDataStr));
        
      } catch (e) { console.error("Failed to load global data.", e); }
      finally { setIsLoading(false); }
    };
    loadAllData();
  }, []);

  // --- SAVE FUNCTIONS ---
  const saveTransactions = async (data: Transaction[]) => { setTransactions(data); await AsyncStorage.setItem(BUDGET_TRANSACTIONS_KEY, JSON.stringify(data)); };
  const saveBudgetSettings = async (data: BudgetSettings) => { setBudgetSettings(data); await AsyncStorage.setItem(BUDGET_SETTINGS_KEY, JSON.stringify(data)); };
  const saveHabits = async (data: Habit[]) => { setHabits(data); await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(data)); };
  const saveCalendarEvents = async (data: CalendarEvent[]) => { setCalendarEvents(data); await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(data)); };
  const saveAllMeals = async (data: Meal[]) => { setAllMeals(data); await AsyncStorage.setItem(ALL_MEALS_KEY, JSON.stringify(data)); };
  const saveMealSettings = async (newSettings: MealSettings) => { /* ... */ };
  const saveMealPlan = async (newPlan: MealPlan) => { /* ... */ };
  const saveCycleData = async (newCycleData: CycleData) => { /* ... */ };

  const value = { isLoading, transactions, saveTransactions, budgetSettings, saveBudgetSettings, habits, saveHabits, calendarEvents, saveCalendarEvents, mealPlan, saveMealPlan, allMeals, saveAllMeals, mealSettings, saveMealSettings, cycleData, saveCycleData };

  return (<WellauraContext.Provider value={value}>{children}</WellauraContext.Provider>);
};

// --- THIS HOOK INCLUDES THE CRITICAL ERROR CHECK ---
export const useWellaura = () => {
  const context = useContext(WellauraContext);
  if (context === undefined) {
    throw new Error('useWellaura must be used within a WellauraProvider');
  }
  return context;
};