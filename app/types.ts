// --- GLOBAL & CALENDAR ---
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  type: 'event' | 'payment' | 'meal' | 'mindfulness' | 'habit' | 'cycle';
  allDay?: boolean;
}

// --- BUDGET TRACKER ---
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  date: string;
  isVariable: boolean;
  budgetedAmount: number;
  actualAmount: number | null;
  isScheduled?: boolean;
}

export interface ScheduledPayment {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
  frequency: 'one-time' | 'monthly';
}

export interface BudgetSettings {
  incomeVaries?: boolean;
  fixedIncome?: string;
  customCategories?: string[];
  customIncomeCategories?: string[];
  budgetPeriod?: 'Weekly' | 'Fortnightly' | 'Monthly';
  defaultCategoryAmounts?: Record<string, string>;
  scheduledPayments?: ScheduledPayment[];
}

// --- HABIT TRACKER ---
export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'daily_boolean' | 'weekly_frequency' | 'quit_habit';
  goal?: { frequency: number; period: 'week' };
  history?: { [key: string]: { completed?: boolean; progress?: number } };
  reminderTime?: string | null;
  notificationId?: string | null;
  addToCalendar?: boolean;
}

// --- MEAL PLANNER ---
export interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  tags: string[];
  recipe: string;
}

export interface MealPlanItem {
    name: string;
    time: string; // e.g., "08:00"
}

export interface MealPlan {
    [day: string]: {
        breakfast: MealPlanItem;
        lunch: MealPlanItem;
        dinner: MealPlanItem;
        snacks: MealPlanItem[];
    };
}

export interface MealSettings {
    preferences: string[];
    allergies: string[];
    mealTimes: {
        breakfast: string;
        lunch: string;
        dinner: string;
    };
}

// --- CYCLE TRACKER ---
export interface CycleData {
  cycleStart: string; // ISO date string
  cycleLength: number;
  periodDuration: number;
  goal: 'None' | 'Pregnancy' | 'PregnantMode';
  userDueDate?: string | null;
}