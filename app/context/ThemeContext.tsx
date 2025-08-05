import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the default theme colors
const DEFAULT_COLORS = { 
    primary: '#F97E16', 
    accent: '#FACC15', 
    background: '#FFF7ED', 
    surface: '#FFFFFF', 
    textPrimary: '#1E293B', 
    textSecondary: '#64748B', 
    border: '#F1F5F9', 
    white: '#FFFFFF' 
};

const THEME_STORAGE_KEY = '@user_theme_v1';

// Define the shape of our context data
interface ThemeContextType {
    theme: typeof DEFAULT_COLORS;
    setTheme: (theme: typeof DEFAULT_COLORS) => void;
    isLoadingTheme: boolean;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create the Provider component. This is the component that will hold the state.
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState(DEFAULT_COLORS);
    const [isLoadingTheme, setIsLoadingTheme] = useState(true);

    // On app start, load the saved theme from storage
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const themeValue = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (themeValue !== null) {
                    setThemeState(JSON.parse(themeValue));
                }
            } catch (e) {
                console.error("Failed to load theme.", e);
            } finally {
                setIsLoadingTheme(false);
            }
        };
        loadTheme();
    }, []);

    // Create a new setTheme function that also saves to storage
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        try {
            AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
        } catch (e) {
            console.error("Failed to save theme.", e);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isLoadingTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Create a custom hook for easy access to the theme
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};