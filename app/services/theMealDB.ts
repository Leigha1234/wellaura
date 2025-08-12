import { Meal } from '../types'; // Adjust path if needed

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

const transformMealDBRecipe = (meal: any): Meal => {
    // Helper to gather ingredients from the 20 separate fields in the API response
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        if (meal[`strIngredient${i}`]) {
            ingredients.push({
                name: meal[`strIngredient${i}`],
                baseQuantity: 1, // API doesn't provide quantity, so we default
                unit: meal[`strMeasure${i}`] || 'item',
                perPerson: false,
            });
        }
    }

    return {
        id: meal.idMeal,
        name: meal.strMeal,
        image: meal.strMealThumb,
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 }, // TheMealDB does not provide nutrition data
        ingredients: ingredients,
        recipe: meal.strInstructions,
        tags: [meal.strCategory, meal.strArea, ...(meal.strTags?.split(',') || [])].filter(Boolean),
        type: 'lunch', // Default type
    };
};

export const searchRecipes = async (settings: any): Promise<Meal[]> => {
    try {
        let categories = ['Seafood', 'Chicken', 'Beef', 'Pasta', 'Dessert'];
        
        if (settings.preferences.includes('vegetarian')) {
            categories = ['Vegetarian'];
        }
        if (settings.preferences.includes('vegan')) {
            categories = ['Vegan'];
        }

        const categoryPromises = categories.map(category => 
            fetch(`${BASE_URL}/filter.php?c=${category}`).then(res => res.json())
        );

        const settledResults = await Promise.allSettled(categoryPromises);
        let allMealSummaries = [];

        settledResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.meals) {
                allMealSummaries.push(...result.value.meals);
            }
        });
        
        // Shuffle for variety
        for (let i = allMealSummaries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allMealSummaries[i], allMealSummaries[j]] = [allMealSummaries[j], allMealSummaries[i]];
        }
        
        if (allMealSummaries.length > 0) {
            // Fetch details for a slice of the combined and shuffled meals
            const detailPromises = allMealSummaries.slice(0, 60).map(m => getRecipeDetails(m.idMeal));
            const detailedMeals = await Promise.all(detailPromises);
            return detailedMeals.filter(Boolean); // Filter out any nulls from failed fetches
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch from TheMealDB:", error);
        return [];
    }
};

export const getRecipeDetails = async (id: string): Promise<Meal | null> => {
    try {
        const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
        const data = await response.json();
        if (data.meals && data.meals[0]) {
            return transformMealDBRecipe(data.meals[0]);
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch details for recipe ${id}:`, error);
        return null;
    }
};

export const fetchRandomRecipes = async (count: number = 3): Promise<Meal[]> => {
    try {
        const recipePromises = Array.from({ length: count }, () => 
            fetch(`${BASE_URL}/random.php`).then(res => res.json())
        );

        const results = await Promise.all(recipePromises);
        const meals = results.map(result => transformMealDBRecipe(result.meals[0]));
        return meals;
    } catch (error) {
        console.error("Failed to fetch random recipes:", error);
        return [];
    }
};