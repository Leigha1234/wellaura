import { Alert } from 'react-native';
import { Meal } from '../types'; // Adjust path if needed

const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

// Utility to add a timeout to any fetch request
const fetchWithTimeout = (url: string, timeout = 10000): Promise<Response> => {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
};

// Transforms Spoonacular data into our app's Meal format
const transformSpoonacularRecipe = (recipe: any): Meal => {
    return {
        id: recipe.id.toString(),
        name: recipe.title,
        image: recipe.image,
        nutrition: {
            calories: recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0,
            protein: recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0,
            carbs: recipe.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0,
            fat: recipe.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 0,
        },
        ingredients: recipe.extendedIngredients?.map(ing => ({
            name: ing.nameClean || ing.name,
            baseQuantity: ing.amount,
            unit: ing.unit,
            perPerson: false,
        })) || [],
        recipe: recipe.instructions?.replace(/<[^>]*>/g, '') || 'No instructions provided.',
        tags: [
            ...(recipe.diets || []),
            recipe.vegetarian ? 'vegetarian' : '',
            recipe.vegan ? 'vegan' : '',
            recipe.glutenFree ? 'gluten-free' : '',
            recipe.dairyFree ? 'dairy-free' : '',
        ].filter(Boolean),
        type: 'lunch',
    };
};

// Searches for recipes with advanced filtering
export const searchRecipes = async (settings: any, filters: string[], count: number = 20): Promise<Meal[]> => {
    if (!API_KEY) {
        Alert.alert("API Key Missing", "Spoonacular API Key is not configured in your .env file.");
        return [];
    }

    const allPreferences = [...new Set([...settings.preferences, ...filters.map(f => f.toLowerCase())])];
    const diet = allPreferences.join(',');
    const intolerances = settings.allergies.join(',');

    const queryParams = new URLSearchParams({
        apiKey: API_KEY,
        number: count.toString(),
        addRecipeNutrition: 'true',
        diet,
        intolerances,
    });

    const endpoint = `${BASE_URL}/recipes/complexSearch?${queryParams.toString()}`;
    console.log("Fetching Spoonacular recipes:", endpoint);

    try {
        const response = await fetchWithTimeout(endpoint);
        const data = await response.json();

        if (!response.ok || data.status === 'failure') {
            console.error("Spoonacular API Error:", data.message);
            Alert.alert("API Error", `Could not fetch recipes: ${data.message || 'Check daily quota.'}`);
            return [];
        }

        if (data.results && data.results.length > 0) {
            return data.results.map(transformSpoonacularRecipe);
        } else {
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch recipes:", error);
        return []; 
    }
};

// Gets full details for a single recipe
export const getRecipeDetails = async (id: string): Promise<Meal | null> => {
    if (!API_KEY) return null;
    const endpoint = `${BASE_URL}/recipes/${id}/information?apiKey=${API_KEY}&includeNutrition=true`;
    try {
        const response = await fetchWithTimeout(endpoint);
        if (!response.ok) throw new Error("Failed to fetch details.");
        const data = await response.json();
        return transformSpoonacularRecipe(data);
    } catch (error) {
        console.error(`Failed to fetch details for recipe ${id}:`, error);
        return null;
    }
};

// Gets random recipes for the shuffle button
export const fetchRandomRecipes = async (settings: any, count: number = 3): Promise<Meal[]> => {
    if (!API_KEY) {
        Alert.alert("API Key Missing", "Spoonacular API Key is not configured.");
        return [];
    }
    const diet = settings.preferences.join(',');
    const intolerances = settings.allergies.join(',');
    
    const queryParams = new URLSearchParams({
        apiKey: API_KEY,
        number: count.toString(),
        limitLicense: 'true',
        tags: diet, // Use diet preferences as tags for random search
    });

    const endpoint = `${BASE_URL}/recipes/random?${queryParams.toString()}`;
    
    try {
        const response = await fetchWithTimeout(endpoint);
        const data = await response.json();

        if (data.recipes && data.recipes.length > 0) {
            // Random endpoint already includes full details
            return data.recipes.map(transformSpoonacularRecipe);
        } else {
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch random recipes:", error);
        return [];
    }
};