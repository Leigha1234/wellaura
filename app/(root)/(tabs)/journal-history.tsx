// journalHistory.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

interface JournalEntry {
  date: string;
  mood: string;
  note: string;
}

export default function JournalHistory() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    loadJournalData();
  }, []);

  const loadJournalData = async () => {
    const data = await AsyncStorage.getItem("journalEntries");
    if (data) setEntries(JSON.parse(data));
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Journal History</Text>
      {entries.length === 0 ? (
        <Text style={{ marginTop: 20 }}>No entries yet.</Text>
      ) : (
        entries
          .slice()
          .reverse()
          .map((entry, index) => (
            <View key={index} style={{ padding: 10, backgroundColor: "#f4f4f4", borderRadius: 10, marginTop: 10 }}>
              <Text style={{ fontWeight: "bold" }}>{entry.date} - Mood: {entry.mood}</Text>
              <Text>{entry.note}</Text>
            </View>
          ))
      )}
    </ScrollView>
  );
}
