import { Meal } from "../../types";

// This is your new simulated AI/mock recipe database.
// It has been significantly expanded with more meals and tags.
export const MOCK_RECIPE_DATABASE: Meal[] = [
  // --- Breakfast ---
  {
    name: "Classic Oatmeal",
    type: 'breakfast',
    ingredients: [
      { name: "Rolled Oats", baseQuantity: 50, unit: "g", perPerson: true },
      { name: "Water or Milk", baseQuantity: 200, unit: "ml", perPerson: true },
      { name: "Brown Sugar", baseQuantity: 1, unit: "tsp", perPerson: true },
      { name: "Berries", baseQuantity: 0.25, unit: "cup", perPerson: true }
    ],
    nutrition: { calories: 250, protein: 8, carbs: 45, fat: 5 },
    recipe: "In a saucepan, combine oats and water/milk. Bring to a boil, then simmer for 5-7 minutes. Serve topped with brown sugar and berries.",
    tags: ['vegan', 'vegetarian', 'dairy-free', 'nut-free', 'low-calorie', 'breakfast']
  },
  {
    name: "Protein-Packed Scrambled Eggs",
    type: 'breakfast',
    ingredients: [
      { name: "Eggs", baseQuantity: 3, unit: "large", perPerson: true },
      { name: "Cottage Cheese", baseQuantity: 2, unit: "tbsp", perPerson: true },
      { name: "Spinach", baseQuantity: 1, unit: "cup", perPerson: true },
      { name: "Whole Wheat Toast", baseQuantity: 1, unit: "slice", perPerson: true }
    ],
    nutrition: { calories: 380, protein: 25, carbs: 20, fat: 20 },
    recipe: "Whisk eggs and cottage cheese. Sauté spinach in a pan until wilted. Pour in eggs and cook until softly set. Serve with toast.",
    tags: ['vegetarian', 'nut-free', 'high-protein', 'low-calorie', 'breakfast']
  },
  {
    name: "Avocado Toast with Egg",
    type: 'breakfast',
    ingredients: [
      { name: "Sourdough Bread", baseQuantity: 1, unit: "slice", perPerson: true },
      { name: "Avocado", baseQuantity: 0.5, unit: "whole", perPerson: true },
      { name: "Egg", baseQuantity: 1, unit: "large", perPerson: true },
      { name: "Red Pepper Flakes", baseQuantity: 1, unit: "pinch", perPerson: false }
    ],
    nutrition: { calories: 350, protein: 15, carbs: 30, fat: 19 },
    recipe: "Toast bread. Mash avocado on top. Top with a fried or poached egg and sprinkle with red pepper flakes.",
    tags: ['vegetarian', 'dairy-free', 'nut-free', 'low-calorie', 'breakfast']
  },
  {
    name: "Green Smoothie Bowl",
    type: 'breakfast',
    ingredients: [
      { name: "Spinach", baseQuantity: 2, unit: "cups", perPerson: true },
      { name: "Banana", baseQuantity: 1, unit: "frozen", perPerson: true },
      { name: "Protein Powder (Vanilla)", baseQuantity: 1, unit: "scoop", perPerson: true },
      { name: "Almond Milk", baseQuantity: 150, unit: "ml", perPerson: true }
    ],
    nutrition: { calories: 320, protein: 30, carbs: 40, fat: 5 },
    recipe: "Blend all ingredients until smooth. Pour into a bowl and top with granola, seeds, or fruit.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'low-calorie', 'breakfast']
  },
  {
    name: "Chia Seed Pudding",
    type: 'breakfast',
    ingredients: [
        { name: "Chia Seeds", baseQuantity: 3, unit: "tbsp", perPerson: true },
        { name: "Almond Milk", baseQuantity: 0.5, unit: "cup", perPerson: true },
        { name: "Maple Syrup", baseQuantity: 1, unit: "tsp", perPerson: true },
        { name: "Fruit", baseQuantity: 0.25, unit: "cup", perPerson: true }
    ],
    nutrition: { calories: 210, protein: 6, carbs: 25, fat: 10 },
    recipe: "Mix chia seeds, almond milk, and maple syrup. Let it sit for at least 15 minutes or overnight. Top with fruit.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-calorie', 'breakfast']
  },
  {
    name: "Breakfast Burrito",
    type: 'breakfast',
    ingredients: [
        { name: "Large Tortilla", baseQuantity: 1, unit: "", perPerson: true },
        { name: "Scrambled Eggs", baseQuantity: 2, unit: "eggs", perPerson: true },
        { name: "Black Beans", baseQuantity: 0.25, unit: "cup", perPerson: true },
        { name: "Salsa", baseQuantity: 2, unit: "tbsp", perPerson: true }
    ],
    nutrition: { calories: 420, protein: 22, carbs: 45, fat: 18 },
    recipe: "Warm the tortilla. Fill with scrambled eggs, black beans, and salsa. Roll up and enjoy.",
    tags: ['vegetarian', 'high-protein', 'breakfast']
  },
  {
    name: "Smoked Salmon Bagel",
    type: 'breakfast',
    ingredients: [
        { name: "Bagel", baseQuantity: 1, unit: "", perPerson: true },
        { name: "Cream Cheese", baseQuantity: 2, unit: "tbsp", perPerson: true },
        { name: "Smoked Salmon", baseQuantity: 50, unit: "g", perPerson: true },
        { name: "Capers", baseQuantity: 1, unit: "tsp", perPerson: true }
    ],
    nutrition: { calories: 380, protein: 18, carbs: 40, fat: 16 },
    recipe: "Toast the bagel. Spread with cream cheese, then top with smoked salmon and capers.",
    tags: ['high-protein', 'breakfast']
  },

  // --- Lunch ---
  {
    name: "Grilled Chicken Salad",
    type: 'lunch',
    ingredients: [
      { name: "Chicken Breast", baseQuantity: 150, unit: "g", perPerson: true },
      { name: "Mixed Greens", baseQuantity: 3, unit: "cups", perPerson: true },
      { name: "Cherry Tomatoes", baseQuantity: 0.5, unit: "cup", perPerson: true },
      { name: "Balsamic Vinaigrette", baseQuantity: 2, unit: "tbsp", perPerson: true }
    ],
    nutrition: { calories: 350, protein: 40, carbs: 10, fat: 18 },
    recipe: "Grill or pan-sear chicken breast. Slice and serve over mixed greens with tomatoes and vinaigrette.",
    tags: ['gluten-free', 'dairy-free', 'nut-free', 'high-protein', 'low-calorie', 'lunch']
  },
  {
    name: "Quinoa Power Bowl",
    type: 'lunch',
    ingredients: [
      { name: "Quinoa, cooked", baseQuantity: 1, unit: "cup", perPerson: true },
      { name: "Black Beans", baseQuantity: 0.5, unit: "cup", perPerson: true },
      { name: "Corn", baseQuantity: 0.5, unit: "cup", perPerson: true },
      { name: "Avocado", baseQuantity: 0.5, unit: "whole", perPerson: true }
    ],
    nutrition: { calories: 450, protein: 15, carbs: 65, fat: 18 },
    recipe: "Combine all ingredients in a bowl. Top with salsa or a lime-based dressing.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'lunch']
  },
  {
    name: "Lentil and Vegetable Soup",
    type: 'lunch',
    ingredients: [
      { name: "Brown Lentils", baseQuantity: 0.75, unit: "cup", perPerson: true },
      { name: "Carrot", baseQuantity: 1, unit: "medium", perPerson: true },
      { name: "Celery", baseQuantity: 1, unit: "stalk", perPerson: true },
      { name: "Vegetable Broth", baseQuantity: 2, unit: "cups", perPerson: true }
    ],
    nutrition: { calories: 380, protein: 18, carbs: 55, fat: 5 },
    recipe: "Sauté chopped carrot and celery. Add lentils and broth, then simmer for 25-30 minutes until lentils are tender.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'low-calorie', 'lunch']
  },
  {
    name: "Tuna Salad Sandwich",
    type: 'lunch',
    ingredients: [
        { name: "Canned Tuna", baseQuantity: 1, unit: "can", perPerson: true },
        { name: "Mayonnaise", baseQuantity: 2, unit: "tbsp", perPerson: true },
        { name: "Whole Wheat Bread", baseQuantity: 2, unit: "slices", perPerson: true }
    ],
    nutrition: { calories: 380, protein: 22, carbs: 30, fat: 18 },
    recipe: "Drain tuna and mix with mayonnaise. Serve between two slices of bread.",
    tags: ['nut-free', 'high-protein', 'low-calorie', 'lunch']
  },
  {
    name: "Caprese Salad",
    type: 'lunch',
    ingredients: [
        { name: "Tomatoes", baseQuantity: 2, unit: "large", perPerson: true },
        { name: "Fresh Mozzarella", baseQuantity: 125, unit: "g", perPerson: true },
        { name: "Fresh Basil", baseQuantity: 1, unit: "handful", perPerson: true },
        { name: "Balsamic Glaze", baseQuantity: 1, unit: "tbsp", perPerson: true }
    ],
    nutrition: { calories: 300, protein: 18, carbs: 12, fat: 20 },
    recipe: "Slice tomatoes and mozzarella. Arrange on a plate, alternating slices. Tuck in basil leaves and drizzle with balsamic glaze.",
    tags: ['vegetarian', 'gluten-free', 'nut-free', 'low-calorie', 'lunch']
  },
  {
    name: "Chicken Caesar Wrap",
    type: 'lunch',
    ingredients: [
        { name: "Cooked Chicken", baseQuantity: 100, unit: "g", perPerson: true },
        { name: "Romaine Lettuce", baseQuantity: 1, unit: "cup", perPerson: true },
        { name: "Caesar Dressing", baseQuantity: 2, unit: "tbsp", perPerson: true },
        { name: "Large Tortilla", baseQuantity: 1, unit: "", perPerson: true }
    ],
    nutrition: { calories: 450, protein: 30, carbs: 35, fat: 20 },
    recipe: "Toss chicken and lettuce with Caesar dressing. Place in a tortilla and wrap tightly.",
    tags: ['high-protein', 'lunch']
  },
  {
    name: "Sweet Potato & Black Bean Bowl",
    type: 'lunch',
    ingredients: [
        { name: "Sweet Potato", baseQuantity: 1, unit: "medium", perPerson: true },
        { name: "Black Beans", baseQuantity: 0.5, unit: "cup", perPerson: true },
        { name: "Lime Juice", baseQuantity: 1, unit: "tbsp", perPerson: true },
        { name: "Cilantro", baseQuantity: 1, unit: "sprig", perPerson: true }
    ],
    nutrition: { calories: 350, protein: 12, carbs: 70, fat: 2 },
    recipe: "Bake or microwave sweet potato until tender. Mash slightly and top with black beans, lime juice, and cilantro.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-calorie', 'lunch']
  },

  // --- Dinner ---
  {
    name: "Baked Salmon with Asparagus",
    type: 'dinner',
    ingredients: [
      { name: "Salmon Fillet", baseQuantity: 150, unit: "g", perPerson: true },
      { name: "Asparagus", baseQuantity: 1, unit: "bunch", perPerson: true },
      { name: "Lemon", baseQuantity: 0.5, unit: "whole", perPerson: true }
    ],
    nutrition: { calories: 360, protein: 34, carbs: 8, fat: 22 },
    recipe: "Place salmon and asparagus on a baking sheet. Drizzle with olive oil, salt, pepper, and lemon juice. Bake at 200°C (400°F) for 15-20 minutes.",
    tags: ['gluten-free', 'dairy-free', 'nut-free', 'high-protein', 'low-calorie', 'dinner']
  },
  {
    name: "Spaghetti Bolognese",
    type: 'dinner',
    ingredients: [
      { name: "Lean Ground Beef", baseQuantity: 125, unit: "g", perPerson: true },
      { name: "Tomato Sauce", baseQuantity: 1, unit: "cup", perPerson: true },
      { name: "Spaghetti", baseQuantity: 100, unit: "g", perPerson: true }
    ],
    nutrition: { calories: 550, protein: 30, carbs: 70, fat: 15 },
    recipe: "Brown the ground beef. Add tomato sauce and simmer for at least 15 minutes. Serve over cooked spaghetti.",
    tags: ['dairy-free', 'nut-free', 'high-protein', 'dinner']
  },
  {
    name: "Vegan Chickpea Curry",
    type: 'dinner',
    ingredients: [
      { name: "Chickpeas", baseQuantity: 1, unit: "can", perPerson: true },
      { name: "Coconut Milk", baseQuantity: 0.5, unit: "can", perPerson: true },
      { name: "Diced Tomatoes", baseQuantity: 1, unit: "can", perPerson: true },
      { name: "Curry Powder", baseQuantity: 2, unit: "tsp", perPerson: false }
    ],
    nutrition: { calories: 480, protein: 15, carbs: 60, fat: 20 },
    recipe: "Sauté onions and garlic. Add curry powder, tomatoes, chickpeas, and coconut milk. Simmer for 20 minutes. Serve with rice.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'dinner']
  },
  {
    name: "Sheet Pan Chicken Fajitas",
    type: 'dinner',
    ingredients: [
        { name: "Chicken Breast", baseQuantity: 1, unit: "whole", perPerson: true },
        { name: "Bell Peppers", baseQuantity: 2, unit: "mixed", perPerson: true },
        { name: "Onion", baseQuantity: 1, unit: "large", perPerson: true },
        { name: "Fajita Seasoning", baseQuantity: 1, unit: "tbsp", perPerson: false }
    ],
    nutrition: { calories: 400, protein: 35, carbs: 20, fat: 18 },
    recipe: "Slice chicken, peppers, and onion. Toss with oil and seasoning on a baking sheet. Bake at 200°C (400°F) for 20-25 minutes. Serve with tortillas.",
    tags: ['gluten-free', 'dairy-free', 'high-protein', 'low-calorie', 'dinner']
  },
  {
    name: "Mushroom Risotto",
    type: 'dinner',
    ingredients: [
        { name: "Arborio Rice", baseQuantity: 0.75, unit: "cup", perPerson: true },
        { name: "Mushrooms", baseQuantity: 1, unit: "cup", perPerson: true },
        { name: "Vegetable Broth", baseQuantity: 3, unit: "cups", perPerson: true },
        { name: "Parmesan Cheese", baseQuantity: 0.25, unit: "cup", perPerson: true }
    ],
    nutrition: { calories: 420, protein: 12, carbs: 75, fat: 8 },
    recipe: "Sauté mushrooms. Toast rice in the same pan, then gradually add warm broth, one ladle at a time, stirring until absorbed. Stir in parmesan.",
    tags: ['vegetarian', 'gluten-free', 'dinner']
  },
   {
    name: "Steak with Roasted Potatoes",
    type: 'dinner',
    ingredients: [
        { name: "Sirloin Steak", baseQuantity: 200, unit: "g", perPerson: true },
        { name: "Baby Potatoes", baseQuantity: 150, unit: "g", perPerson: true },
        { name: "Rosemary", baseQuantity: 1, unit: "sprig", perPerson: true }
    ],
    nutrition: { calories: 550, protein: 45, carbs: 30, fat: 28 },
    recipe: "Toss potatoes with oil, salt, pepper, and rosemary. Roast at 200°C (400°F) for 30 minutes. Pan-sear steak to desired doneness.",
    tags: ['gluten-free', 'dairy-free', 'high-protein', 'dinner']
  },
  {
    name: "Tofu Stir-fry",
    type: 'dinner',
    ingredients: [
        { name: "Firm Tofu", baseQuantity: 150, unit: "g", perPerson: true },
        { name: "Broccoli Florets", baseQuantity: 1, unit: "cup", perPerson: true },
        { name: "Soy Sauce", baseQuantity: 2, unit: "tbsp", perPerson: true },
        { name: "Rice Noodles", baseQuantity: 80, unit: "g", perPerson: true }
    ],
    nutrition: { calories: 410, protein: 20, carbs: 50, fat: 15 },
    recipe: "Press and cube tofu. Stir-fry with broccoli. Add soy sauce and serve over cooked rice noodles.",
    tags: ['vegan', 'vegetarian', 'dairy-free', 'high-protein', 'dinner']
  },

  // --- Snacks ---
  {
    name: "Apple with Peanut Butter",
    type: 'snack',
    ingredients: [
      { name: "Apple", baseQuantity: 1, unit: "medium", perPerson: true },
      { name: "Peanut Butter", baseQuantity: 2, unit: "tbsp", perPerson: true }
    ],
    nutrition: { calories: 280, protein: 8, carbs: 30, fat: 16 },
    recipe: "Slice apple and serve with peanut butter.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-calorie', 'snack']
  },
  {
    name: "Greek Yogurt",
    type: 'snack',
    ingredients: [
      { name: "Greek Yogurt", baseQuantity: 1, unit: "cup", perPerson: true }
    ],
    nutrition: { calories: 150, protein: 20, carbs: 8, fat: 4 },
    recipe: "A simple cup of Greek yogurt.",
    tags: ['vegetarian', 'gluten-free', 'nut-free', 'high-protein', 'low-calorie', 'snack']
  },
  {
    name: "Handful of Almonds",
    type: 'snack',
    ingredients: [
      { name: "Almonds", baseQuantity: 0.25, unit: "cup", perPerson: true }
    ],
    nutrition: { calories: 170, protein: 6, carbs: 6, fat: 14 },
    recipe: "A simple, healthy snack.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-calorie', 'snack']
  },
  {
    name: "Rice Cakes with Hummus",
    type: 'snack',
    ingredients: [
        { name: "Rice Cakes", baseQuantity: 2, unit: "large", perPerson: true },
        { name: "Hummus", baseQuantity: 2, unit: "tbsp", perPerson: true }
    ],
    nutrition: { calories: 150, protein: 5, carbs: 25, fat: 4 },
    recipe: "Spread hummus on rice cakes.",
    tags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'low-calorie', 'snack']
  },
  {
    name: "Cottage Cheese with Peach",
    type: 'snack',
    ingredients: [
        { name: "Cottage Cheese", baseQuantity: 0.5, unit: "cup", perPerson: true },
        { name: "Peach", baseQuantity: 1, unit: "medium", perPerson: true }
    ],
    nutrition: { calories: 160, protein: 15, carbs: 18, fat: 4 },
    recipe: "Top cottage cheese with sliced peach.",
    tags: ['vegetarian', 'gluten-free', 'nut-free', 'high-protein', 'low-calorie', 'snack']
  },
  {
    name: "Hard-Boiled Egg",
    type: 'snack',
    ingredients: [
        { name: "Egg", baseQuantity: 1, unit: "large", perPerson: true }
    ],
    nutrition: { calories: 78, protein: 6, carbs: 1, fat: 5 },
    recipe: "A single hard-boiled egg.",
    tags: ['vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'high-protein', 'low-calorie', 'snack']
  },
];
