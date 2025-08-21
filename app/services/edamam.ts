import { Alert } from 'react-native';
import { Meal } from '../types'; // Adjust path if needed

const APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID;
const APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY;
const BASE_URL = 'https://api.edamam.com/api/recipes/v2';

const ANONYMOUS_USER_ID = "wellaura-user-12345";

// Transforms Edamam data into our app's Meal format
const transformEdamamRecipe = (hit: any): Meal => {
    const recipe = hit.recipe;
    const id = recipe.uri.split('#recipe_')[1];

    return {
        id: id,
        name: recipe.label,
        image: recipe.image,
        nutrition: {
            calories: recipe.calories / recipe.yield, // Nutrition per serving
            protein: (recipe.totalNutrients.PROCNT?.quantity || 0) / recipe.yield,
            carbs: (recipe.totalNutrients.CHOCDF?.quantity || 0) / recipe.yield,
            fat: (recipe.totalNutrients.FAT?.quantity || 0) / recipe.yield,
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

    const healthFilters = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'];
    const mainQuery = filters.filter(f => !healthFilters.includes(f.toLowerCase()));
    const healthLabels = [...settings.preferences, ...filters.filter(f => healthFilters.includes(f.toLowerCase()))];

    const queryParams = new URLSearchParams({
        type: 'public',
        app_id: APP_ID,
        app_key: APP_KEY,
        q: mainQuery.length > 0 ? mainQuery.join(' ') : 'chicken',
    });
    
    healthLabels.forEach(label => queryParams.append('health', label.toLowerCase()));
    settings.allergies.forEach(allergy => queryParams.append('health', `${allergy}-free`));

    const endpoint = `${BASE_URL}?${queryParams.toString()}`;
    
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

export const getRecipeDetails = async (id: string): Promise<Meal | null> => {
    if (!APP_ID || !APP_KEY) {
        Alert.alert("API Keys Missing", "Edamam App ID or Key is not configured.");
        return null;
    }
    const fullUri = `http://www.edamam.com/ontologies/edamam.owl#recipe_${id}`;
    const endpoint = `${BASE_URL}/by-uri?app_id=${APP_ID}&app_key=${APP_KEY}&uri=${encodeURIComponent(fullUri)}`;

    try {
        const response = await fetch(endpoint, {
            headers: { 'Edamam-Account-User': ANONYMOUS_USER_ID }
        });
        const data = await response.json();
        if (response.ok && data.hits && data.hits.length > 0) {
            return transformEdamamRecipe(data.hits[0]);
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch details for recipe ${id}:`, error);
        return null;
    }
};

export const fetchRandomRecipes = async (settings: any, count: number = 3, mealType: string): Promise<Meal[]> => {
    if (!APP_ID || !APP_KEY) {
        return [];
    }

    const randomTerms = ['chicken', 'salad', 'soup', 'pasta', 'beef', 'fish', 'egg', 'rice'];
    const randomQuery = randomTerms[Math.floor(Math.random() * randomTerms.length)];

    const queryParams = new URLSearchParams({
        type: 'public',
        app_id: APP_ID,
        app_key: APP_KEY,
        q: randomQuery, // Use a random popular keyword for variety
    });
    
    // **THE FIX**: Add the mealType parameter to the API call.
    // Edamam uses "Breakfast", "Lunch", "Dinner", "Snack", "Teatime".
    const capitalizedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    queryParams.append('mealType', capitalizedMealType);

    // For random suggestions, we can be less strict with user preferences to get more results.
    // You can uncomment these lines if you want random suggestions to respect diet/allergies.
    // settings.preferences.forEach(pref => queryParams.append('health', pref));
    // settings.allergies.forEach(allergy => queryParams.append('health', `${allergy}-free`));

    const endpoint = `${BASE_URL}?${queryParams.toString()}`;
    console.log("Fetching RANDOM Edamam recipes:", endpoint);

    try {
        const response = await fetch(endpoint, { headers: { 'Edamam-Account-User': ANONYMOUS_USER_ID } });
        const data = await response.json();
        
        if (response.ok && data.hits) {
            const results = data.hits.map(transformEdamamRecipe);
            // Shuffle the results for more variety
            for (let i = results.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [results[i], results[j]] = [results[j], results[i]];
            }
            return results.slice(0, count);
        } else {
            console.warn("Edamam API error on random fetch:", data);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch random recipes from Edamam:", error);
        return [];
    }
};