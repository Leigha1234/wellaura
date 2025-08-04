import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Sample data for meal recipes
const recipes = {
  breakfast: ["Oatmeal & Berries", "Avocado Toast", "Smoothie Bowl"],
  lunch: ["Chicken Caesar Wrap", "Lentil Soup", "Sushi Rolls"],
  dinner: ["Pasta Primavera", "Stir-Fry Tofu", "Fish Tacos"],
};

// Ingredients for each recipe
const mealIngredients = {
  "Oatmeal & Berries": ["Oats", "Berries", "Almond Milk"],
  "Avocado Toast": ["Avocado", "Bread", "Lemon"],
  "Smoothie Bowl": ["Banana", "Spinach", "Almond Milk"],
  "Chicken Caesar Wrap": ["Chicken", "Wrap", "Lettuce"],
  "Lentil Soup": ["Lentils", "Carrots", "Celery"],
  "Sushi Rolls": ["Rice", "Nori", "Cucumber"],
  "Pasta Primavera": ["Pasta", "Veggies", "Olive Oil"],
  "Stir-Fry Tofu": ["Tofu", "Soy Sauce", "Broccoli"],
  "Fish Tacos": ["Fish", "Taco Shells", "Cabbage"],
};

// Nutrition data for each meal
const nutritionData = {
  "Oatmeal & Berries": { calories: 320, protein: 8, carbs: 50, fat: 9 },
  "Avocado Toast": { calories: 280, protein: 6, carbs: 30, fat: 15 },
  "Smoothie Bowl": { calories: 300, protein: 5, carbs: 35, fat: 10 },
  "Chicken Caesar Wrap": { calories: 450, protein: 30, carbs: 40, fat: 20 },
  "Lentil Soup": { calories: 350, protein: 20, carbs: 45, fat: 8 },
  "Sushi Rolls": { calories: 400, protein: 10, carbs: 60, fat: 6 },
  "Pasta Primavera": { calories: 500, protein: 15, carbs: 70, fat: 14 },
  "Stir-Fry Tofu": { calories: 420, protein: 22, carbs: 30, fat: 18 },
  "Fish Tacos": { calories: 430, protein: 28, carbs: 35, fat: 17 },
};

// Days of the week
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultPlan = days.reduce((acc, day) => {
  acc[day] = { breakfast: "", lunch: "", dinner: "" };
  return acc;
}, {} as Record<string, { breakfast: string; lunch: string; dinner: string }>);

export default function MealPlanner() {
  const [mealPlan, setMealPlan] = useState(defaultPlan);
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    loadMealPlan();
  }, []);

  const loadMealPlan = async () => {
    const data = await AsyncStorage.getItem("mealPlan");
    if (data) setMealPlan(JSON.parse(data));
  };

  const saveMealPlan = async (updatedPlan: typeof mealPlan) => {
    setMealPlan(updatedPlan);
    await AsyncStorage.setItem("mealPlan", JSON.stringify(updatedPlan));
  };

  const updateMeal = (day: string, mealType: string, value: string) => {
    const updatedPlan = {
      ...mealPlan,
      [day]: { ...mealPlan[day], [mealType]: value },
    };
    saveMealPlan(updatedPlan);
  };

  // Filter meals based on allergies
  const filterMeals = (type: keyof typeof recipes) => {
    return recipes[type].filter((meal) => {
      const ingredients = mealIngredients[meal] || [];
      return !ingredients.some((ing) =>
        allergies.some((allergy) => allergy.toLowerCase() === ing.toLowerCase())
      );
    });
  };

  const getFilteredRandomMeal = (type: keyof typeof recipes) => {
    const options = filterMeals(type);
    if (options.length === 0) return ""; // No suitable meals found
    return options[Math.floor(Math.random() * options.length)];
  };

  const generateShoppingList = () => {
    const selectedMeals = Object.values(mealPlan).flatMap((day) => [
      day.breakfast,
      day.lunch,
      day.dinner,
    ]);
    const ingredients = new Set<string>();
    selectedMeals.forEach((meal) => {
      mealIngredients[meal]?.forEach((item) => ingredients.add(item));
    });
    return Array.from(ingredients);
  };

  const calculateNutrition = () => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    Object.values(mealPlan).forEach((day) => {
      ["breakfast", "lunch", "dinner"].forEach((type) => {
        const meal = day[type];
        const info = nutritionData[meal];
        if (info) {
          totals.calories += info.calories;
          totals.protein += info.protein;
          totals.carbs += info.carbs;
          totals.fat += info.fat;
        }
      });
    });
    return totals;
  };

  const clearPlan = async () => {
    setMealPlan(defaultPlan);
    await AsyncStorage.removeItem("mealPlan");
  };

  const totals = calculateNutrition();
  const shoppingList = generateShoppingList();

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fa" }}>
      <View style={{ position: "absolute", top: 50, left: 20 }}>
        <Link href="/" asChild>
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={28} color="#1e2a3c" />
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView style={{ paddingHorizontal: 20, paddingTop: 100 }}>
        <Text style={{ fontSize: 30, fontWeight: "bold", color: "#2a2e43", marginBottom: 10 }}>
          Weekly Meal Planner
        </Text>
        <Text style={{ color: "#7a869a", marginBottom: 20 }}>
          Custom meals, nutrition & shopping list
        </Text>

        {/* Allergies input */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 5 }}>Allergies (comma-separated):</Text>
          <TextInput
            placeholder="e.g. Almond Milk, Fish"
            style={styles.input}
            onChangeText={(text) =>
              setAllergies(text.split(",").map((a) => a.trim()).filter(Boolean))
            }
          />
        </View>

        {days.map((day) => (
          <View key={day} style={styles.card}>
            <Text style={styles.day}>{day}</Text>

            {["breakfast", "lunch", "dinner"].map((type) => (
              <View key={type} style={styles.mealRow}>
                <TextInput
                  placeholder={type[0].toUpperCase() + type.slice(1)}
                  value={mealPlan[day][type]}
                  onChangeText={(text) => updateMeal(day, type, text)}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => {
                    const randomMeal = getFilteredRandomMeal(type as keyof typeof recipes);
                    updateMeal(day, type, randomMeal);
                  }}
                >
                  <Text style={styles.suggest}>Suggest</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Nutrition Summary</Text>
          <Text>Calories: {totals.calories}</Text>
          <Text>Protein: {totals.protein}g</Text>
          <Text>Carbs: {totals.carbs}g</Text>
          <Text>Fat: {totals.fat}g</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Shopping List</Text>
          {shoppingList.length === 0 ? (
            <Text style={{ color: "#999" }}>No items added yet</Text>
          ) : (
            shoppingList.map((item, index) => <Text key={index}>• {item}</Text>)
          )}
        </View>

        <TouchableOpacity onPress={clearPlan} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset All</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  day: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2a2e43",
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#f1f3f8",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: "75%",
    fontSize: 16,
    color: "#333",
  },
  suggest: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "bold",
  },
  summaryBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2a2e43",
    marginBottom: 10,
  },
  resetButton: {
    backgroundColor: "#ff6347",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
