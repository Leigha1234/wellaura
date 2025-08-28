import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import tinycolor from "tinycolor2";
import { days, mealTypes } from "../../../components/mealData";
import { useFavorites } from "../../context/FavoritesContext";
import { useMealPlan } from "../../context/MealPlanContext";
import { useTheme } from "../../context/ThemeContext";
import { searchRecipes } from "../../services/edamam";
import { Meal } from "../../types";

// --- FILTER OPTIONS ---
const filterOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Chicken", "Beef", "Pork", "Seafood"];

// --- HELPER COMPONENTS FOR THIS PAGE ---

const AddRecipeModal = ({ isVisible, onClose, onSave, styles, theme }) => {
    const [name, setName] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [recipe, setRecipe] = useState('');
    const [image, setImage] = useState('');
    
    const imagePlaceholders = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    ];

    const handleSave = () => {
        if (!name.trim() || !recipe.trim()) {
            Alert.alert("Missing Info", "Please provide at least a name and recipe instructions.");
            return;
        }
        const newMeal: Meal = {
            id: `custom_${Date.now()}`,
            name,
            ingredients: ingredients.split('\n').map(ing => ({ name: ing, baseQuantity: 1, unit: 'item', perPerson: false, text: ing })),
            recipe,
            image: image || imagePlaceholders[Math.floor(Math.random() * imagePlaceholders.length)],
            nutrition: { calories: 300, protein: 15, carbs: 30, fat: 12 },
            tags: ['custom'], type: 'lunch',
        };
        onSave(newMeal);
        setName(''); setIngredients(''); setRecipe(''); setImage(''); onClose();
    };

    return (
        <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Add Your Recipe</Text>
                    <TextInput style={styles.input} placeholder="Recipe Name" value={name} onChangeText={setName} placeholderTextColor={theme.textSecondary} />
                    <TextInput style={[styles.input, styles.textArea]} placeholder="Ingredients (e.g., 2 tbsp olive oil)" multiline value={ingredients} onChangeText={setIngredients} placeholderTextColor={theme.textSecondary} />
                    <TextInput style={[styles.input, styles.textArea]} placeholder="Recipe Instructions" multiline value={recipe} onChangeText={setRecipe} placeholderTextColor={theme.textSecondary} />
                    <TouchableOpacity style={styles.imagePickerButton} onPress={() => setImage(imagePlaceholders[Math.floor(Math.random() * imagePlaceholders.length)])}>
                        <Ionicons name="image-outline" size={22} color={theme.primary} />
                        <Text style={styles.imagePickerButtonText}>{image ? "Change Image" : "Add Random Image"}</Text>
                    </TouchableOpacity>
                    {image ? <Image source={{ uri: image }} style={styles.recipeModalImage} /> : null}
                    <View style={styles.modalButtonRow}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}><Text style={styles.modalButtonText}>Save Recipe</Text></TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const AddToPlanModal = ({ isVisible, onClose, onConfirm, styles, theme }) => {
    const [selectedDay, setSelectedDay] = useState(days[0]);
    const [selectedMealType, setSelectedMealType] = useState('breakfast');
    const handleConfirm = () => { onConfirm(selectedDay, selectedMealType); onClose(); };

    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}><View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Add to Meal Plan</Text>
                <Text style={styles.formLabel}>Select Day</Text>
                <View style={styles.preferenceContainer}>{days.map(day => ( <TouchableOpacity key={day} style={[styles.preferenceButton, selectedDay === day && styles.preferenceButtonActive]} onPress={() => setSelectedDay(day)}><Text style={[styles.preferenceText, selectedDay === day && styles.preferenceTextActive]}>{day.substring(0, 3)}</Text></TouchableOpacity> ))}</View>
                <Text style={styles.formLabel}>Select Meal</Text>
                 <View style={styles.preferenceContainer}>{Object.keys(mealTypes).map(type => ( <TouchableOpacity key={type} style={[styles.preferenceButton, selectedMealType === type && styles.preferenceButtonActive]} onPress={() => setSelectedMealType(type)}><Text style={[styles.preferenceText, selectedMealType === type && styles.preferenceTextActive]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text></TouchableOpacity> ))}</View>
                <View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleConfirm}><Text style={styles.modalButtonText}>Add Meal</Text></TouchableOpacity></View>
            </View></View>
        </Modal>
    );
};

const RecipeCard = ({ meal, isFavorite, onToggleFavorite, onAddToPlan, onSelectMeal, styles, theme }) => (
    <TouchableOpacity onPress={() => onSelectMeal(meal)}>
        <View style={styles.recipeCardContainer}>
            <ImageBackground source={{ uri: meal.image }} style={styles.recipeCardImage} imageStyle={{ borderRadius: 20 }}>
                <View style={styles.recipeCardOverlay} />
                <TouchableOpacity style={styles.recipeCardFavoriteButton} onPress={(e) => { e.stopPropagation(); onToggleFavorite(meal.id); }}>
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={30} color={isFavorite ? theme.accent : theme.white} />
                </TouchableOpacity>
                <View style={styles.recipeCardContent}>
                    <Text style={styles.recipeCardTitle}>{meal.name}</Text>
                    <Text style={styles.recipeCardNutrition}>
                        {Math.round(meal.nutrition.calories)} kcal · P: {Math.round(meal.nutrition.protein)}g C: {Math.round(meal.nutrition.carbs)}g F: {Math.round(meal.nutrition.fat)}g
                    </Text>
                </View>
            </ImageBackground>
            <TouchableOpacity style={styles.recipeCardAddButton} onPress={(e) => { e.stopPropagation(); onAddToPlan(meal); }}>
                <Ionicons name="add-circle" size={24} color={theme.white} />
                <Text style={styles.recipeCardAddButtonText}>Add to Plan</Text>
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);

// --- MAIN RECIPE BOOK COMPONENT ---

export default function Recipes() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);
    const { favorites, toggleFavorite } = useFavorites();
    const { allMeals, addMealToCache, updateMeal, updateSnack } = useMealPlan();
    
    const { mealSettings } = route.params;

    const [recipes, setRecipes] = useState<Meal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mealToAdd, setMealToAdd] = useState<Meal | null>(null);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    
    const settingsDependency = useMemo(() => JSON.stringify(mealSettings), [mealSettings]);
    const filtersDependency = useMemo(() => activeFilters.join(','), [activeFilters]);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        searchRecipes(mealSettings, activeFilters)
            .then(apiMeals => {
                if (isMounted) {
                    const customRecipes = allMeals.filter(m => m.tags.includes('custom'));
                    const combined = [...customRecipes, ...apiMeals];
                    const uniqueMeals = combined.filter((meal, index, self) => index === self.findIndex(m => m.id === meal.id));
                    setRecipes(uniqueMeals);
                }
            })
            .catch(error => {
                console.error("Failed to fetch recipes:", error);
                Alert.alert("Error", "Could not load recipes.");
            })
            .finally(() => { setIsLoading(false); });
        return () => { isMounted = false; };
    }, [settingsDependency, filtersDependency, allMeals]);
    
    const handleToggleFilter = (filter: string) => {
        setActiveFilters(prev => {
            const newFilters = new Set(prev);
            if (newFilters.has(filter)) { newFilters.delete(filter); } 
            else { newFilters.add(filter); }
            return Array.from(newFilters);
        });
    };

    const displayedRecipes = useMemo(() => {
        if (activeFilters.includes('Favorites')) {
            return recipes.filter(r => favorites.has(r.id));
        }
        return recipes;
    }, [recipes, favorites, activeFilters]);
    
    const handleSaveCustomRecipe = (newMeal: Meal) => { addMealToCache(newMeal); setRecipes(prev => [newMeal, ...prev]); };
    const handleAddToPlan = (meal: Meal) => { setMealToAdd(meal); };
    const handleConfirmAddToPlan = (day, mealType) => { if (!mealToAdd) return; addMealToCache(mealToAdd); if (mealType === 'snack') { onUpdateSnack(day, 0, mealToAdd.name, mealToAdd.id); } else { updateMeal(day, mealType, mealToAdd); } setMealToAdd(null); Alert.alert("Meal Added!", `${mealToAdd.name} has been added to the plan for ${day}.`); };

    return (
        <View style={styles.recipeBookContainer}>
            <AddRecipeModal isVisible={addModalVisible} onClose={() => setAddModalVisible(false)} onSave={handleSaveCustomRecipe} styles={styles} theme={theme} />
            {mealToAdd && <AddToPlanModal isVisible={!!mealToAdd} onClose={() => setMealToAdd(null)} onConfirm={handleConfirmAddToPlan} styles={styles} theme={theme} />}
            
            <Modal animationType="slide" transparent={true} visible={!!selectedMeal} onRequestClose={() => setSelectedMeal(null)}>
                <View style={styles.modalBackdrop}><View style={styles.recipeModalContainer}>
                    {selectedMeal && (<>
                      {selectedMeal.image && <Image source={{ uri: selectedMeal.image }} style={styles.recipeModalImage} />}
                      <Text style={styles.recipeTitle}>{selectedMeal.name}</Text>
                      <ScrollView>
                          <View style={styles.nutritionRow}>
                              <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{Math.round(selectedMeal.nutrition.calories)}</Text><Text style={styles.nutritionLabel}>kcal</Text></View>
                              <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{Math.round(selectedMeal.nutrition.protein)}g</Text><Text style={styles.nutritionLabel}>Protein</Text></View>
                              <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{Math.round(selectedMeal.nutrition.carbs)}g</Text><Text style={styles.nutritionLabel}>Carbs</Text></View>
                              <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{Math.round(selectedMeal.nutrition.fat)}g</Text><Text style={styles.nutritionLabel}>Fat</Text></View>
                          </View>
                          <Text style={styles.recipeSectionTitle}>Ingredients</Text>
                          {selectedMeal.ingredients.map((ing, i) => (
                              <Text key={i} style={styles.recipeText}>• {ing.text || `${ing.baseQuantity} ${ing.unit} ${ing.name}`}</Text>
                          ))}
                          <Text style={styles.recipeSectionTitle}>Instructions</Text>
                          <TouchableOpacity onPress={() => Linking.canOpenURL(selectedMeal.recipe) && Linking.openURL(selectedMeal.recipe)}>
                            <Text style={[styles.recipeText, selectedMeal.recipe.startsWith('http') && {color: theme.primary, textDecorationLine: 'underline'}]}>
                                {selectedMeal.recipe}
                            </Text>
                          </TouchableOpacity>
                      </ScrollView>
                       <View style={styles.modalButtonRow}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSelectedMeal(null)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity></View>
                    </>)}
                </View></View>
            </Modal>
            
            <View style={styles.overviewHeader}>
                <TouchableOpacity onPress={() => navigation.navigate('meal-planner')} style={styles.recipeBookBackButton}><Ionicons name="chevron-back" size={28} color={theme.primary} /></TouchableOpacity>
                <Text style={styles.overviewTitle}>Recipe Book</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.recipeBookBackButton}><Ionicons name="add" size={28} color={theme.primary} /></TouchableOpacity>
            </View>

            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                    <TouchableOpacity key="Favorites" style={[styles.preferenceButton, activeFilters.includes('Favorites') && styles.preferenceButtonActive]} onPress={() => handleToggleFilter('Favorites')}><Text style={[styles.preferenceText, activeFilters.includes('Favorites') && styles.preferenceTextActive]}>Favorites</Text></TouchableOpacity>
                    {filterOptions.map(filter => (
                        <TouchableOpacity key={filter} style={[styles.preferenceButton, activeFilters.includes(filter) && styles.preferenceButtonActive]} onPress={() => handleToggleFilter(filter)}>
                            <Text style={[styles.preferenceText, activeFilters.includes(filter) && styles.preferenceTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1 }} /> : (
                <FlatList
                    data={displayedRecipes}
                    keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
                    renderItem={({ item }) => (
                        <RecipeCard
                            meal={item}
                            isFavorite={favorites.has(item.id)}
                            onToggleFavorite={toggleFavorite}
                            onAddToPlan={handleAddToPlan}
                            onSelectMeal={setSelectedMeal}
                            styles={styles}
                            theme={theme}
                        />
                    )}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50 }}
                    ListEmptyComponent={<Text style={styles.placeholderText}>No recipes found. Try changing your filters.</Text>}
                />
            )}
        </View>
    );
}

// --- UTILITY FUNCTION ---
const formatRecipe = (recipe, ingredients, servings) => {
    // This function is less critical with Edamam but useful for custom recipes
    if (!recipe || !recipe.startsWith("Prepare")) return recipe;
    
    let formatted = recipe;
    ingredients.forEach(ing => {
        if (typeof ing === 'object' && ing.hasOwnProperty('baseQuantity')) {
            const quantity = ing.perPerson ? ing.baseQuantity * servings : ing.baseQuantity;
            const formattedQuantity = Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, "");
            const replacement = `${formattedQuantity}${ing.unit !== 'whole' && ing.unit !== 'item' ? ` ${ing.unit}` : ''}`;
            formatted = formatted.replace(new RegExp(`{{${ing.name}}}`, 'g'), replacement);
        }
    });
    return formatted;
};

// --- STYLES ---
const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    return StyleSheet.create({
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', },
        modalContainer: { width: '90%', maxHeight: '90%', backgroundColor: theme.surface, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
        modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20, textAlign: 'center', },
        formLabel: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 12, marginTop: 10, },
        preferenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, },
        preferenceButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, marginRight: 10 },
        preferenceButtonActive: { backgroundColor: theme.primary, borderColor: theme.primary },
        preferenceText: { color: theme.textSecondary, fontWeight: '500', },
        preferenceTextActive: { color: onPrimaryColor, },
        modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, gap: 15, },
        modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        cancelButton: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, },
        cancelButtonText: { color: theme.textPrimary, fontSize: 16, fontWeight: 'bold' },
        saveButton: { backgroundColor: theme.primary },
        modalButtonText: { color: onPrimaryColor, fontSize: 16, fontWeight: 'bold', },
        recipeBookContainer: { flex: 1, backgroundColor: theme.background, },
        overviewHeader: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
        overviewTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
        recipeBookBackButton: { padding: 5, },
        recipeCardContainer: { marginVertical: 10, },
        recipeCardImage: { height: 220, justifyContent: 'flex-end', borderRadius: 20, },
        recipeCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, },
        recipeCardFavoriteButton: { position: 'absolute', top: 15, right: 15, padding: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, },
        recipeCardContent: { padding: 15, },
        recipeCardTitle: { color: theme.white, fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
        recipeCardNutrition: { color: theme.white, fontSize: 14, opacity: 0.9, },
        recipeCardAddButton: { position: 'absolute', bottom: 15, right: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, },
        recipeCardAddButtonText: { color: theme.white, fontWeight: 'bold', marginLeft: 5, },
        placeholderText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 20, fontSize: 16 },
        input: { backgroundColor: theme.border, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, color: theme.textPrimary },
        textArea: { height: 100, textAlignVertical: 'top' },
        imagePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, borderRadius: 12, marginBottom: 15 },
        imagePickerButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
        recipeModalContainer: { width: '90%', maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 25 },
        recipeModalImage: { width: '100%', height: 180, borderRadius: 15, marginBottom: 15 },
        recipeTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15, textAlign: 'center' },
        recipeSectionTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 15, marginBottom: 8, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 5 },
        recipeText: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, marginBottom: 4 },
        nutritionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, borderBottomWidth: 1, paddingBottom: 15, borderColor: theme.border },
        nutritionItem: { alignItems: 'center', flex: 1 },
        nutritionValue: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
        nutritionLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
        filterBar: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border, },
    });
};