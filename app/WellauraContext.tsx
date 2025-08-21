import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { BudgetSettings, CalendarEvent, CycleData, Habit, Meal, MealPlan, MealSettings, Transaction } from './types';

// --- ASYNCSTORAGE KEYS ---
const CYCLE_DATA_KEY = '@cycle_data_v1';
const BUDGET_TRANSACTIONS_KEY = 'budget_transactions_v12';
const BUDGET_SETTINGS_KEY = 'budget_settings_v12';
const HABITS_KEY = '@habits_v2';
const HABIT_LOGS_KEY = '@habit_logs_v2'; // Updated key for new structure
const CALENDAR_EVENTS_KEY = '@calendar_events_v1';
const MEAL_PLAN_KEY = '@meal_plan_v2';
const ALL_MEALS_KEY = '@all_meals_v1';
const MEAL_SETTINGS_KEY = '@meal_settings_v1';

// --- DEFAULTS & HELPERS ---
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultMealTimes = { breakfast: "08:00", lunch: "13:00", dinner: "19:00" };
const defaultPlan: MealPlan = days.reduce((acc, day) => {
    acc[day] = {
        breakfast: { name: "", time: defaultMealTimes.breakfast, id: '', servings: 1 },
        lunch: { name: "", time: defaultMealTimes.lunch, id: '', servings: 1 },
        dinner: { name: "", time: defaultMealTimes.dinner, id: '', servings: 1 },
        snacks: [],
    };
    return acc;
}, {} as MealPlan);
const defaultMealSettings: MealSettings = { preferences: [], allergies: [], mealTimes: defaultMealTimes };
const defaultBudgetSettings: BudgetSettings = { incomeVaries: true, fixedIncome: '2000', customCategories: [], customIncomeCategories: [], budgetPeriod: 'Monthly', defaultCategoryAmounts: {}, scheduledPayments: [] };
const defaultCycleData: CycleData = { cycleStart: new Date().toISOString(), cycleLength: 28, periodDuration: 5, goal: 'None', userDueDate: null };

// --- TYPE FOR HABIT LOGS (NOW MORE DETAILED) ---
type HabitLogEntry = {
    completed?: boolean;
    progress?: number;
};
type HabitLog = Record<string, Record<string, HabitLogEntry>>;

// --- CONTEXT TYPE DEFINITION ---
interface WellauraContextType {
  isLoading: boolean;
  transactions: Transaction[]; saveTransactions: (data: Transaction[]) => Promise<void>;
  budgetSettings: BudgetSettings; saveBudgetSettings: (data: BudgetSettings) => Promise<void>;
  habits: Habit[]; saveHabits: (data: Habit[]) => Promise<void>;
  habitLogs: HabitLog;
  toggleHabitCompletion: (habitId: string, dateString: string, habitType: Habit['type']) => void;
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
  const [habitLogs, setHabitLogs] = useState<HabitLog>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(defaultPlan);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [mealSettings, setMealSettings] = useState<MealSettings>(defaultMealSettings);
  const [cycleData, setCycleData] = useState<CycleData | null>(defaultCycleData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [transData, settingsData, habitsData, logsData, eventsData, mealPlanData, allMealsData, mealSettingsData, cycleDataStr] = await Promise.all([
          AsyncStorage.getItem(BUDGET_TRANSACTIONS_KEY), AsyncStorage.getItem(BUDGET_SETTINGS_KEY),
          AsyncStorage.getItem(HABITS_KEY), AsyncStorage.getItem(HABIT_LOGS_KEY),
          AsyncStorage.getItem(CALENDAR_EVENTS_KEY), AsyncStorage.getItem(MEAL_PLAN_KEY),
          AsyncStorage.getItem(ALL_MEALS_KEY), AsyncStorage.getItem(MEAL_SETTINGS_KEY),
          AsyncStorage.getItem(CYCLE_DATA_KEY),
        ]);
        
        if (transData) setTransactions(JSON.parse(transData));
        if (settingsData) setBudgetSettings(JSON.parse(settingsData));
        if (habitsData) setHabits(JSON.parse(habitsData));
        if (logsData) setHabitLogs(JSON.parse(logsData));
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

  const saveTransactions = async (data: Transaction[]) => { setTransactions(data); await AsyncStorage.setItem(BUDGET_TRANSACTIONS_KEY, JSON.stringify(data)); };
  const saveBudgetSettings = async (data: BudgetSettings) => { setBudgetSettings(data); await AsyncStorage.setItem(BUDGET_SETTINGS_KEY, JSON.stringify(data)); };
  const saveHabits = async (data: Habit[]) => { setHabits(data); await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(data)); };
  const saveCalendarEvents = async (data: CalendarEvent[]) => { setCalendarEvents(data); await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(data)); };
  const saveAllMeals = async (data: Meal[]) => { setAllMeals(data); await AsyncStorage.setItem(ALL_MEALS_KEY, JSON.stringify(data)); };
  const saveMealSettings = async (data: MealSettings) => { setMealSettings(data); await AsyncStorage.setItem(MEAL_SETTINGS_KEY, JSON.stringify(data)); };
  const saveMealPlan = async (data: MealPlan) => { setMealPlan(data); await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(data)); };
  const saveCycleData = async (data: CycleData) => { setCycleData(data); await AsyncStorage.setItem(CYCLE_DATA_KEY, JSON.stringify(data)); };
  
  // This is the new, unified function that handles all habit types.
  const toggleHabitCompletion = (habitId: string, dateString: string, habitType: Habit['type']) => {
    setHabitLogs(currentLogs => {
        const newLogs = JSON.parse(JSON.stringify(currentLogs));
        const dayLog = newLogs[dateString] || {};
        const habitLogEntry = dayLog[habitId] || {};

        if (habitType === 'daily_boolean') {
            habitLogEntry.completed = !habitLogEntry.completed;
        } else if (habitType === 'weekly_frequency') {
            // For weekly, we toggle completion for the day. Progress can be calculated from this.
            habitLogEntry.completed = !habitLogEntry.completed;
        } else if (habitType === 'quit_habit') {
            // For quit habits, pressing the button always adds a lapse.
            habitLogEntry.progress = (habitLogEntry.progress || 0) + 1;
        }

        dayLog[habitId] = habitLogEntry;
        newLogs[dateString] = dayLog;

        AsyncStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(newLogs));
        return newLogs;
    });
  };

  const value = { isLoading, transactions, saveTransactions, budgetSettings, saveBudgetSettings, habits, saveHabits, habitLogs, toggleHabitCompletion, calendarEvents, saveCalendarEvents, mealPlan, saveMealPlan, allMeals, saveAllMeals, mealSettings, saveMealSettings, cycleData, saveCycleData };

  return (<WellauraContext.Provider value={value}>{children}</WellauraContext.Provider>);
};

export const useWellaura = () => {
  const context = useContext(WellauraContext);
  if (context === undefined) {
    throw new Error('useWellaura must be used within a WellauraProvider');
  }
  return context;
};