import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Joe Bloggs"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="joebloggs@example.com"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={styles.input}
          placeholder="30"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          style={styles.input}
          placeholder="75"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          value={height}
          onChangeText={setHeight}
          style={styles.input}
          placeholder="180"
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
  },
  form: {
    backgroundColor: "#fff",
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
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#ffe6eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: "#f2e9f5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
