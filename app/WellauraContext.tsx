import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
// --- MODIFIED: Removed CycleData from imports ---
import { BudgetSettings, CalendarEvent, Habit, Meal, MealPlan, MealSettings, Transaction } from './types';

// --- ASYNCSTORAGE KEYS (Cycle Key Removed) ---
const BUDGET_TRANSACTIONS_KEY = 'budget_transactions_v12';
const BUDGET_SETTINGS_KEY = 'budget_settings_v12';
const HABITS_KEY = '@habits_v2';
const CALENDAR_EVENTS_KEY = '@calendar_events_v1';
const MEAL_PLAN_KEY = '@meal_plan_v2';
const ALL_MEALS_KEY = '@all_meals_v1';
const MEAL_SETTINGS_KEY = '@meal_settings_v1';

// --- DEFAULTS & HELPERS (Cycle Defaults and getPhaseColor Removed) ---
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


// --- MODIFIED: Removed cycleData and saveCycleData ---
interface WellauraContextType {
  isLoading: boolean;
  transactions: Transaction[]; 
  saveTransactions: (data: Transaction[]) => Promise<void>;
  budgetSettings: BudgetSettings; 
  saveBudgetSettings: (data: BudgetSettings) => Promise<void>;
  habits: Habit[]; 
  saveHabits: (data: Habit[]) => Promise<void>;
  calendarEvents: CalendarEvent[]; 
  saveCalendarEvents: (data: CalendarEvent[]) => Promise<void>;
  mealPlan: MealPlan; 
  saveMealPlan: (data: MealPlan) => Promise<void>;
  allMeals: Meal[]; 
  saveAllMeals: (data: Meal[]) => Promise<void>;
  mealSettings: MealSettings; 
  saveMealSettings: (data: MealSettings) => Promise<void>;
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
  // --- REMOVED: const [cycleData, setCycleData] = useState<CycleData | null>(defaultCycleData); ---
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // --- MODIFIED: Removed AsyncStorage.getItem(CYCLE_DATA_KEY) ---
        const [transData, settingsData, habitsData, eventsData, mealPlanData, allMealsData, mealSettingsData] = await Promise.all([
          AsyncStorage.getItem(BUDGET_TRANSACTIONS_KEY), AsyncStorage.getItem(BUDGET_SETTINGS_KEY),
          AsyncStorage.getItem(HABITS_KEY), AsyncStorage.getItem(CALENDAR_EVENTS_KEY),
          AsyncStorage.getItem(MEAL_PLAN_KEY), AsyncStorage.getItem(ALL_MEALS_KEY),
          AsyncStorage.getItem(MEAL_SETTINGS_KEY),
        ]);
        
        if (transData) setTransactions(JSON.parse(transData));
        if (settingsData) setBudgetSettings(JSON.parse(settingsData));
        if (habitsData) setHabits(JSON.parse(habitsData));
        if (eventsData) setCalendarEvents(JSON.parse(eventsData).map((e: any) => ({...e, start: new Date(e.start), end: new Date(e.end)})));
        if (mealPlanData) setMealPlan(JSON.parse(mealPlanData));
        if (allMealsData) setAllMeals(JSON.parse(allMealsData));
        if (mealSettingsData) setMealSettings(JSON.parse(mealSettingsData));
        // --- REMOVED: if (cycleDataStr) setCycleData(JSON.parse(cycleDataStr)); ---
        
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
  const saveMealSettings = async (newSettings: MealSettings) => { setMealSettings(newSettings); await AsyncStorage.setItem(MEAL_SETTINGS_KEY, JSON.stringify(newSettings))};
  const saveMealPlan = async (newPlan: MealPlan) => { setMealPlan(newPlan); await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(newPlan))};
  // --- REMOVED: const saveCycleData = async (newCycleData: CycleData) => { ... }; ---

  // --- MODIFIED: Removed cycleData and saveCycleData from the returned value ---
  const value = { isLoading, transactions, saveTransactions, budgetSettings, saveBudgetSettings, habits, saveHabits, calendarEvents, saveCalendarEvents, mealPlan, saveMealPlan, allMeals, saveAllMeals, mealSettings, saveMealSettings };

  return (<WellauraContext.Provider value={value}>{children}</WellauraContext.Provider>);
};

export const useWellaura = () => {
  const context = useContext(WellauraContext);
  if (context === undefined) {
    throw new Error('useWellaura must be used within a WellauraProvider');
  }
  return context;
};