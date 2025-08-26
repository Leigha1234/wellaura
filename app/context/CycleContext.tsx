import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

// --- TYPE DEFINITIONS ---

// Defines the structure for a single day's log entry
interface LogEntry {
    flow?: 'Light' | 'Medium' | 'Heavy' | 'Do not want to say';
    symptoms?: string[];
    activity?: string[];
    birthControl?: string[];
    sexDrive?: 'High' | 'Neutral' | 'Low' | '';
    mood?: string;
    energy?: string;
    note?: string;
    cervicalMucus?: 'Dry' | 'Sticky' | 'Creamy' | 'Egg White' | 'Watery' | '';
    basalTemp?: string;
    lhTest?: 'Negative' | 'Positive' | '';
    pregnancyTest?: 'Negative' | 'Positive' | '';
    pregWeight?: string;
    doctorVisit?: string;
    pregSymptoms?: string[];
}

// Defines the structure for all logged data
type Logs = Record<string, LogEntry>;

// Defines the possible fertility goals
type Goal = 'None' | 'Pregnancy' | 'PregnantMode';

// Defines the possible cycle phases
type CyclePhase = 
    | "Menstruation" 
    | "Follicular Phase" 
    | "Ovulation (Fertile Window)" 
    | "Luteal Phase" 
    | "Not Tracked" 
    | "Awaiting New Cycle" 
    | "Future Date";

// Defines the shape of the cycle information object
interface CycleInfo {
    lastCycleStart: string | null;
    phaseForToday: CyclePhase;
    dayOfCycle: number;
}

// Defines the shape of the context's value
interface CycleContextType {
    isLoading: boolean;
    logs: Logs;
    setLogs: React.Dispatch<React.SetStateAction<Logs>>;
    cycleLength: number;
    setCycleLength: React.Dispatch<React.SetStateAction<number>>;
    periodDuration: number;
    setPeriodDuration: React.Dispatch<React.SetStateAction<number>>;
    goal: Goal;
    setGoal: React.Dispatch<React.SetStateAction<Goal>>;
    userDueDate: string;
    setUserDueDate: React.Dispatch<React.SetStateAction<string>>;
    discreetMode: boolean;
    setDiscreetMode: React.Dispatch<React.SetStateAction<boolean>>;
    cycleInfo: CycleInfo;
    todaysInsight: string;
}

// Defines the props for the CycleProvider component
interface CycleProviderProps {
    children: ReactNode;
}

// --- HELPER FUNCTIONS (Typed) ---
const msPerDay = 86400000;
const STORAGE_KEY = '@CycleTrackerData';

const findCycleStartDate = (logs: Logs, forDate: string): string | null => {
    const loggedPeriodDays = Object.keys(logs)
        .filter(date => logs[date]?.flow && logs[date].flow !== 'None')
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (loggedPeriodDays.length === 0) return null;

    let cycleStart: string | null = null;
    for (let i = loggedPeriodDays.length - 1; i >= 0; i--) {
        const periodDay = loggedPeriodDays[i];
        if (new Date(periodDay) <= new Date(forDate)) {
            let currentDay = new Date(periodDay);
            let dayBeforeStr = new Date(currentDay.getTime() - msPerDay).toISOString().split("T")[0];

            while (logs[dayBeforeStr]?.flow && logs[dayBeforeStr].flow !== 'None') {
                currentDay.setDate(currentDay.getDate() - 1);
                dayBeforeStr = new Date(currentDay.getTime() - msPerDay).toISOString().split("T")[0];
            }
            cycleStart = currentDay.toISOString().split("T")[0];
            break;
        }
    }
    return cycleStart;
};

const getActualPeriodDuration = (logs: Logs, startDate: string | null): number => {
    let duration = 0;
    if (!startDate) return 0;
    let currentDate = new Date(startDate);
    while (logs[currentDate.toISOString().split('T')[0]]?.flow && logs[currentDate.toISOString().split('T')[0]]?.flow !== 'None') {
        duration++;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return duration > 0 ? duration : 1;
};

function getCyclePhase(logs: Logs, dateStr: string, cycleLength: number, averagePeriodDuration: number): CyclePhase {
    const startDate = findCycleStartDate(logs, dateStr);
    if (!startDate) return "Not Tracked";

    const periodDuration = getActualPeriodDuration(logs, startDate);
    const delta = Math.floor((new Date(dateStr).getTime() - new Date(startDate).getTime()) / msPerDay);
    if (delta < 0) return "Future Date";

    const cycleDay = delta + 1;
    const ovulationDay = cycleLength - 14;

    if (cycleDay <= periodDuration) return "Menstruation";
    if (cycleDay <= averagePeriodDuration && new Date(dateStr) > new Date()) return "Menstruation";
    
    if (cycleDay <= ovulationDay) return "Follicular Phase";
    if (cycleDay === ovulationDay + 1) return "Ovulation (Fertile Window)";
    if (cycleDay <= cycleLength) return "Luteal Phase";
    
    return "Awaiting New Cycle";
}

const PHASE_INSIGHTS: Record<CyclePhase, string> = {
    "Menstruation": "potential cramps, lower energy, and fatigue as your body sheds its uterine lining.",
    "Follicular Phase": "rising energy levels and an improved mood as your body prepares for ovulation.",
    "Ovulation (Fertile Window)": "peak energy, high libido, and potentially slight pelvic discomfort (mittelschmerz).",
    "Luteal Phase": "PMS symptoms like mood swings, bloating, and breast tenderness as progesterone levels rise.",
    "Not Tracked": "logging your period to get personalized insights about your cycle.",
    "Awaiting New Cycle": "your cycle to begin soon. Rest up and be kind to yourself.",
    "Future Date": "a future date in your cycle."
};

const CycleContext = createContext<CycleContextType | null>(null);

export const CycleProvider = ({ children }: CycleProviderProps) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [logs, setLogs] = useState<Logs>({});
    const [cycleLength, setCycleLength] = useState<number>(28);
    const [periodDuration, setPeriodDuration] = useState<number>(5);
    const [goal, setGoal] = useState<Goal>("None");
    const [userDueDate, setUserDueDate] = useState<string>("");
    const [discreetMode, setDiscreetMode] = useState<boolean>(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedDataString = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedDataString) {
                    const savedData = JSON.parse(savedDataString);
                    setLogs(savedData.logs || {});
                    setCycleLength(savedData.cycleLength || 28);
                    setPeriodDuration(savedData.periodDuration || 5);
                    setGoal(savedData.goal || "None");
                    setUserDueDate(savedData.userDueDate || "");
                    setDiscreetMode(savedData.discreetMode || false);
                }
            } catch (error) {
                console.error("Failed to load cycle data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const saveData = async () => {
            try {
                const dataToSave = { logs, cycleLength, periodDuration, goal, userDueDate, discreetMode };
                const dataString = JSON.stringify(dataToSave);
                await AsyncStorage.setItem(STORAGE_KEY, dataString);
            } catch (error) {
                console.error("Failed to save cycle data", error);
            }
        };
        saveData();
    }, [logs, cycleLength, periodDuration, goal, userDueDate, discreetMode, isLoading]);

    const cycleInfo: CycleInfo = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        const lastCycleStart = findCycleStartDate(logs, today);
        const phaseForToday = getCyclePhase(logs, today, cycleLength, periodDuration);
        const dayOfCycle = lastCycleStart ? Math.floor((new Date(today).getTime() - new Date(lastCycleStart).getTime()) / msPerDay) + 1 : 0;
        return { lastCycleStart, phaseForToday, dayOfCycle };
    }, [logs, cycleLength, periodDuration]);

    const todaysInsight: string = useMemo(() => {
        return PHASE_INSIGHTS[cycleInfo.phaseForToday] || "tracking your cycle to see insights.";
    }, [cycleInfo.phaseForToday]);

    const value: CycleContextType = {
        isLoading,
        logs,
        setLogs,
        cycleLength,
        setCycleLength,
        periodDuration,
        setPeriodDuration,
        goal,
        setGoal,
        userDueDate,
        setUserDueDate,
        discreetMode,
        setDiscreetMode,
        cycleInfo,
        todaysInsight,
    };

    return (
        <CycleContext.Provider value={value}>
            {children}
        </CycleContext.Provider>
    );
};

export const useCycle = (): CycleContextType => {
    const context = useContext(CycleContext);
    if (!context) {
        throw new Error("useCycle must be used within a CycleProvider");
    }
    return context;
};