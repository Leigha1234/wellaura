import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Meal, MealPlan } from '../types'; // Adjust path if needed
import { useWellaura } from '../WellauraContext'; // Adjust path if needed

interface MealPlanContextType {
    localMealPlan: MealPlan;
    allMeals: Meal[];
    addMealToCache: (meal: Meal) => void;
    updateMeal: (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', meal: { id: string; name: string }) => void;
    updateSnack: (day: string, snackIndex: number, name: string, id: string) => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export const MealPlanProvider = ({ children }) => {
    const { 
        mealPlan: initialMealPlan, 
        allMeals: initialAllMeals, 
        saveMealPlan, 
        saveAllMeals 
    } = useWellaura();

    const [localMealPlan, setLocalMealPlan] = useState(initialMealPlan);
    const [allMeals, setAllMeals] = useState(initialAllMeals || []);

    useEffect(() => { if (localMealPlan) saveMealPlan(localMealPlan); }, [localMealPlan]);
    useEffect(() => { if (allMeals) saveAllMeals(allMeals); }, [allMeals]);

    const addMealToCache = useCallback((meal: Meal) => {
        setAllMeals(prev => prev.some(m => m.id === meal.id) ? prev : [...prev, meal]);
    }, []);

    const updateMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', meal: { id: string; name: string }) => {
        setLocalMealPlan(plan => {
            const newPlan = JSON.parse(JSON.stringify(plan));
            newPlan[day][mealType] = { ...newPlan[day][mealType], name: meal.name, id: meal.id, servings: 1};
            return newPlan;
        });
    };

    const updateSnack = (day: string, snackIndex: number, name: string, id: string) => {
        setLocalMealPlan(plan => {
            const newPlan = JSON.parse(JSON.stringify(plan));
            while(newPlan[day].snacks.length <= snackIndex) {
                newPlan[day].snacks.push({name: "", time: "15:00", servings: 1});
            }
            newPlan[day].snacks[snackIndex] = { ...newPlan[day].snacks[snackIndex], name, id, servings: 1};
            return newPlan;
        });
    };

    const value = { localMealPlan, allMeals, addMealToCache, updateMeal, updateSnack };

    return (
        <MealPlanContext.Provider value={value}>
            {children}
        </MealPlanContext.Provider>
    );
};

export const useMealPlan = () => {
    const context = useContext(MealPlanContext);
    if (context === undefined) {
        throw new Error('useMealPlan must be used within a MealPlanProvider');
    }
    return context;
};