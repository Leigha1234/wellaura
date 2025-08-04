// lib/mealApi.js

// IMPORTANT: Replace this with your actual Spoonacular API key
const API_KEY = "9026735199f84910b8bd24829f5b0c97";
const BASE_URL = "https://api.spoonacular.com/recipes";

const transformApiData = (apiRecipe) => {
  return {
    name: apiRecipe.title,
    type: apiRecipe.dishTypes?.includes('breakfast') ? 'breakfast' :
          apiRecipe.dishTypes?.includes('lunch') || apiRecipe.dishTypes?.includes('main course') ? 'lunch' :
          apiRecipe.dishTypes?.includes('dinner') ? 'dinner' : 'snack',
    ingredients: apiRecipe.extendedIngredients.map(ing => ing.original),
    nutrition: {
      calories: Math.round(apiRecipe.nutrition?.nutrients.find(n => n.name === 'Calories')?.amount || 0),
      protein: Math.round(apiRecipe.nutrition?.nutrients.find(n => n.name === 'Protein')?.amount || 0),
      carbs: Math.round(apiRecipe.nutrition?.nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0),
      fat: Math.round(apiRecipe.nutrition?.nutrients.find(n => n.name === 'Fat')?.amount || 0),
    },
    tags: [
      ...(apiRecipe.diets || []),
      ...(apiRecipe.vegetarian ? ['vegetarian'] : []),
      ...(apiRecipe.vegan ? ['vegan'] : []),
      ...(apiRecipe.glutenFree ? ['gluten-free'] : []),
    ],
    recipe: apiRecipe.instructions || 'No instructions provided.',
  };
};

export const fetchMealOptions = async ({ mealType, preferences, allergies, count }) => {
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      type: mealType,
      diet: preferences.join(','),
      intolerances: allergies.join(','),
      number: count,
      addRecipeInformation: true,
      addRecipeNutrition: true,
      fillIngredients: true,
    });

    const response = await fetch(`${BASE_URL}/complexSearch?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Spoonacular API Error:", errorData);
      throw new Error(errorData.message || "Failed to fetch meal options.");
    }

    const data = await response.json();
    return data.results.map(transformApiData);

  } catch (error) {
    console.error("Error fetching meal options:", error);
    return [];
  }
};