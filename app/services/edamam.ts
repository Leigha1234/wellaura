import { Alert } from 'react-native';
import { Meal } from '../types'; // Adjust path if needed

const APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID;
const APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY;
const BASE_URL = 'https://api.edamam.com/api/recipes/v2';

const ANONYMOUS_USER_ID = "wellaura-user-12345";

const transformEdamamRecipe = (hit: any): Meal => {
    const recipe = hit.recipe;
    const id = recipe.uri.split('#recipe_')[1];

    return {
        id: id,
        name: recipe.label,
        image: recipe.image,
        nutrition: {
            calories: recipe.calories,
            protein: recipe.totalNutrients.PROCNT?.quantity || 0,
            carbs: recipe.totalNutrients.CHOCDF?.quantity || 0,
            fat: recipe.totalNutrients.FAT?.quantity || 0,
        },
        ingredients: recipe.ingredients.map(ing => ({
            name: ing.food,
            baseQuantity: ing.quantity,
            unit: ing.measure || 'pcs',
            perPerson: false,
            text: ing.text,
        })) || [],
        recipe: recipe.url,
        tags: recipe.healthLabels || [],
        type: 'lunch',
    };
};

export const searchRecipes = async (settings: any, filters: string[]): Promise<Meal[]> => {
    if (!APP_ID || !APP_KEY) {
        Alert.alert("API Keys Missing", "Edamam App ID or Key is not configured in your .env file.");
        return [];
    }

    // **THE FIX IS HERE**: If no filters are selected, default to a popular search term.
    const searchQuery = filters.length > 0 ? filters.join(' ') : 'chicken';

    const queryParams = new URLSearchParams({
        type: 'public',
        app_id: APP_ID,
        app_key: APP_KEY,
        q: searchQuery,
    });
    
    const allPreferences = [...new Set([...settings.preferences, ...filters.map(f => f.toLowerCase())])];
    allPreferences.forEach(pref => queryParams.append('health', pref));
    settings.allergies.forEach(allergy => queryParams.append('health', `${allergy}-free`));

    const endpoint = `${BASE_URL}?${queryParams.toString()}`;
    console.log("Fetching Edamam recipes:", endpoint);

    try {
        const response = await fetch(endpoint, {
            headers: { 'Edamam-Account-User': ANONYMOUS_USER_ID }
        });
        const data = await response.json();
        
        if (response.ok && data.hits) {
            return data.hits.map(transformEdamamRecipe);
        } else {
            console.warn("Edamam API error:", data);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch recipes from Edamam:", error);
        return [];
    }
};

export const fetchRandomRecipes = async (settings: any, count: number = 3): Promise<Meal[]> => {
    const randomTerms = ['chicken', 'salad', 'soup', 'pasta', 'beef', 'fish'];
    const randomFilter = [randomTerms[Math.floor(Math.random() * randomTerms.length)]];
    const results = await searchRecipes(settings, randomFilter);
    return results.slice(0, count);
};

// ... (getRecipeDetails function is unchanged)