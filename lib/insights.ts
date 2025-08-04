import moment from 'moment';
import { CycleData, Habit, Transaction } from '../types';

// Helper to get data from the last 7 days
const filterLast7Days = (items: { date: string }[]) => {
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day');
    return items.filter(item => moment(item.date).isAfter(sevenDaysAgo));
};

export const generateWeeklyInsights = (habits: Habit[], transactions: Transaction[], cycleData: CycleData | null) => {
    const insights: string[] = [];

    // --- 1. Habit Insight ---
    const dailyHabits = habits.filter(h => h.type === 'daily_boolean');
    if (dailyHabits.length > 0) {
        const habit = dailyHabits[0]; // Analyze the first daily habit for simplicity
        let completedCount = 0;
        for (let i = 0; i < 7; i++) {
            const dayStr = moment().subtract(i, 'days').format('YYYY-MM-DD');
            if (habit.history?.[dayStr]?.completed) {
                completedCount++;
            }
        }
        if (completedCount > 0) {
            insights.push(`You completed your "${habit.name}" habit ${completedCount} times in the last 7 days.`);
        }
    }

    // --- 2. Budget Insight ---
    const recentTransactions = filterLast7Days(transactions);
    if (recentTransactions.length > 0) {
        const spendingByCategory = recentTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.budgetedAmount;
                return acc;
            }, {} as Record<string, number>);

        const topCategory = Object.keys(spendingByCategory).sort((a, b) => spendingByCategory[b] - spendingByCategory[a])[0];
        if (topCategory) {
            insights.push(`Your top spending category this week was "${topCategory}", with £${spendingByCategory[topCategory].toFixed(2)} spent.`);
        }
    }

    // --- 3. Cycle Insight ---
    if (cycleData && cycleData.cycleStart) {
        const cycleDay = moment().diff(moment(cycleData.cycleStart), 'days') % cycleData.cycleLength;
        if (cycleDay >= 0 && cycleDay < cycleData.periodDuration) {
            insights.push("You're currently in your period phase. Remember to be kind to yourself and rest if you need to.");
        }
    }
    
    return insights;
};