import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Meal, MealPlan } from '../types'; // Adjust path if needed
import { useWellaura } from '../WellauraContext'; // Adjust path if needed

interface MealPlanContextType {
    localMealPlan: MealPlan;
    setLocalMealPlan: React.Dispatch<React.SetStateAction<MealPlan>>;
    allMeals: Meal[];
    addMealToCache: (meal: Meal) => void;
    updateMeal: (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', meal: Meal) => void;
    updateSnack: (day: string, snackIndex: number, name: string, id: string) => void;
    findMealById: (id: string) => Meal | undefined; // Add this function type
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

    useEffect(() => {
        if (initialMealPlan) setLocalMealPlan(initialMealPlan);
        if (initialAllMeals) setAllMeals(initialAllMeals);
    }, [initialMealPlan, initialAllMeals]);

    useEffect(() => { if (localMealPlan) saveMealPlan(localMealPlan); }, [localMealPlan]);
    useEffect(() => { if (allMeals) saveAllMeals(allMeals); }, [allMeals]);

    const addMealToCache = useCallback((meal: Meal) => {
        setAllMeals(prev => prev.some(m => m.id === meal.id) ? prev : [...prev, meal]);
    }, []);
    
    // Define the findMealById function
    const findMealById = useCallback((id: string): Meal | undefined => {
        return allMeals.find(m => m.id === id);
    }, [allMeals]);

    const updateMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner', meal: Meal) => {
        setLocalMealPlan(plan => {
            const newPlan = JSON.parse(JSON.stringify(plan));
            newPlan[day][mealType] = { ...newPlan[day][mealType], name: meal.name, id: meal.id, servings: 1};
            return newPlan;
        });
    };

    const updateSnack = (day: string, snackIndex: number, name: string, id: string) => {
        setLocalMealPlan(plan => {
            const newPlan = JSON.parse(JSON.stringify(plan));
            if (!newPlan[day].snacks) {
                newPlan[day].snacks = [];
            }
            while(newPlan[day].snacks.length <= snackIndex) {
                newPlan[day].snacks.push({name: "", time: "15:00", servings: 1, id: ''});
            }
            newPlan[day].snacks[snackIndex] = { ...newPlan[day].snacks[snackIndex], name, id, servings: 1};
            return newPlan;
        });
    };

    const value = { 
        localMealPlan, 
        setLocalMealPlan,
        allMeals, 
        addMealToCache, 
        updateMeal, 
        updateSnack,
        findMealById // Expose the function through the context
    };

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