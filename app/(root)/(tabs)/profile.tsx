import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import tinycolor from "tinycolor2";
import { useTheme } from "../../context/ThemeContext"; // Adjust the import path as necessary

export default function Profile() {
  const { theme } = useTheme();
  const styles = getDynamicStyles(theme);

  const [name, setName] = useState("Joe Bloggs");
  const [email, setEmail] = useState("joebloggs@example.com");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("75");
  const [height, setHeight] = useState("180");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedName = await AsyncStorage.getItem("profile_name");
      const storedEmail = await AsyncStorage.getItem("profile_email");
      const storedAge = await AsyncStorage.getItem("profile_age");
      const storedWeight = await AsyncStorage.getItem("profile_weight");
      const storedHeight = await AsyncStorage.getItem("profile_height");

      if (storedName) setName(storedName);
      if (storedEmail) setEmail(storedEmail);
      if (storedAge) setAge(storedAge);
      if (storedWeight) setWeight(storedWeight);
      if (storedHeight) setHeight(storedHeight);
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem("profile_name", name);
      await AsyncStorage.setItem("profile_email", email);
      await AsyncStorage.setItem("profile_age", age);
      await AsyncStorage.setItem("profile_weight", weight);
      await AsyncStorage.setItem("profile_height", height);
      Alert.alert("Success", "Profile saved!");
    } catch (err) {
      Alert.alert("Error", "Failed to save profile.");
      console.error(err);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "You have been logged out."); // Placeholder logic
  };

  return (
    <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Profile</Text>

        <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Joe Bloggs"
            placeholderTextColor={theme.textSecondary}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="joebloggs@example.com"
            keyboardType="email-address"
            placeholderTextColor={theme.textSecondary}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
            value={age}
            onChangeText={setAge}
            style={styles.input}
            placeholder="30"
            keyboardType="numeric"
            placeholderTextColor={theme.textSecondary}
            />

            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
            value={weight}
            onChangeText={setWeight}
            style={styles.input}
            placeholder="75"
            keyboardType="numeric"
            placeholderTextColor={theme.textSecondary}
            />

            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
            value={height}
            onChangeText={setHeight}
            style={styles.input}
            placeholder="180"
            keyboardType="numeric"
            placeholderTextColor={theme.textSecondary}
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
        </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const onAccentColor = tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary;

    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            padding: 20,
            paddingBottom: 40,
        },
        title: {
            fontSize: 28,
            fontWeight: "bold",
            textAlign: "center",
            marginVertical: 20,
            color: theme.textPrimary,
        },
        form: {
            backgroundColor: theme.surface,
            padding: 16,
            borderRadius: 10,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 3,
        },
        label: {
            fontSize: 16,
            fontWeight: "600",
            marginTop: 10,
            marginBottom: 4,
            color: theme.textSecondary,
        },
        input: {
            backgroundColor: theme.border,
            borderRadius: 6,
            padding: 12,
            fontSize: 16,
            color: theme.textPrimary,
        },
        saveButton: {
            marginTop: 20,
            backgroundColor: theme.primary,
            padding: 12,
            borderRadius: 8,
            alignItems: "center",
        },
        saveButtonText: {
            color: onPrimaryColor,
            fontSize: 16,
            fontWeight: "600",
        },
        logoutButton: {
            marginTop: 16,
            backgroundColor: theme.accent,
            padding: 12,
            borderRadius: 8,
            alignItems: "center",
        },
        logoutButtonText: {
            color: onAccentColor,
            fontSize: 16,
            fontWeight: "600",
        },
    });
};