import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWellaura } from '../../WellauraContext';

// !!! IMPORTANT: Paste your free API key here !!!
const API_KEY = '168d6e5c66ac0493fa395090f70bf38b';

// --- Weather Icons ---
const weatherIcons = {
    '01d': 'sunny-outline', '01n': 'moon-outline',       // Clear sky
    '02d': 'partly-sunny-outline', '02n': 'cloudy-night-outline', // Few clouds
    '03d': 'cloud-outline', '03n': 'cloud-outline',     // Scattered clouds
    '04d': 'cloudy-outline', '04n': 'cloudy-outline',   // Broken clouds
    '09d': 'rainy-outline', '09n': 'rainy-outline',      // Shower rain
    '10d': 'rainy-outline', '10n': 'rainy-outline',      // Rain
    '11d': 'thunderstorm-outline', '11n': 'thunderstorm-outline', // Thunderstorm
    '13d': 'snow-outline', '13n': 'snow-outline',       // Snow
    '50d': 'menu-outline', '50n': 'menu-outline',       // Mist (using a generic icon)
};

// --- DYNAMIC STYLES ---
const getDynamicStyles = (theme) => StyleSheet.create({
    card: { 
        backgroundColor: theme.surface, 
        borderRadius: 20, 
        padding: 20, 
        marginTop: 20, 
        shadowColor: theme.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 15, 
        elevation: 5 
    },
    loadingContainer: { 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 150 
    },
    weatherInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 16 
    },
    temp: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: theme.textPrimary 
    },
    location: { 
        fontSize: 16, 
        color: theme.textSecondary 
    },
    suggestionBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 16, 
        paddingTop: 16, 
        borderTopWidth: 1, 
        borderTopColor: theme.border 
    },
    suggestionText: { 
        fontSize: 15, 
        color: theme.textSecondary, 
        flex: 1, 
        lineHeight: 22 
    },
});


export const WeatherWidget = ({ theme }) => {
    const router = useRouter();
    const { habits } = useWellaura();
    const [weather, setWeather] = useState(null);
    const [suggestion, setSuggestion] = useState<{ text: string, path: string } | null>(null);
    
    // Generate styles dynamically from the theme prop
    const styles = getDynamicStyles(theme);

    useEffect(() => {
        const fetchWeather = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setSuggestion({ text: 'Enable location to get weather tips.', path: null });
                return;
            }
            try {
                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
                const data = await response.json();
                setWeather(data);
            } catch (error) {
                console.error("Could not fetch weather data:", error);
            }
        };
        fetchWeather();
    }, []);

    useEffect(() => {
        if (weather && habits) {
            const mainWeather = weather.weather[0].main.toLowerCase();
            const walkHabit = habits.find(h => h.name.toLowerCase().includes('walk'));

            if (mainWeather === 'clear' || mainWeather === 'clouds') {
                if (walkHabit) {
                    setSuggestion({ text: `It's a great day for your "${walkHabit.name}" habit!`, path: '/(root)/(tabs)/habit-tracker' });
                } else {
                    setSuggestion({ text: "Enjoy the nice weather with a mindful moment outside.", path: '/(root)/(tabs)/mindfulness-page' });
                }
            } else if (mainWeather === 'rain' || mainWeather === 'drizzle' || mainWeather === 'snow') {
                setSuggestion({ text: "A rainy day is perfect for planning some cozy meals.", path: '/(root)/(tabs)/meal-planner' });
            } else {
                 setSuggestion({ text: "Check your budget to plan for the day ahead.", path: '/(root)/(tabs)/budget' });
            }
        }
    }, [weather, habits]);

    if (!weather) {
        return (
            <View style={[styles.card, styles.loadingContainer]}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }

    const iconName = weatherIcons[weather.weather[0].icon] || 'cloud-outline';

    return (
        <View style={styles.card}>
            <View style={styles.weatherInfo}>
                <Ionicons name={iconName} size={48} color={theme.textPrimary} />
                <View>
                    <Text style={styles.temp}>{Math.round(weather.main.temp)}°C</Text>
                    <Text style={styles.location}>{weather.name}</Text>
                </View>
            </View>
            {suggestion && (
                <TouchableOpacity 
                    style={styles.suggestionBox} 
                    onPress={() => suggestion.path && router.push(suggestion.path)}
                >
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                    {suggestion.path && <Ionicons name="arrow-forward" size={18} color={theme.primary} />}
                </TouchableOpacity>
            )}
        </View>
    );
};