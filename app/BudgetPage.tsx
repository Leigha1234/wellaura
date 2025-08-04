import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PieChart from "react-native-pie-chart";
import * as Progress from "react-native-progress";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BudgetPage() {
  const router = useRouter();

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("1000");
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem("transactions");
      if (data) setTransactions(JSON.parse(data));
    };
    load();

    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const save = async (data) => {
    setTransactions(data);
    await AsyncStorage.setItem("transactions", JSON.stringify(data));
  };

  const addTransaction = () => {
    const parsed = parseFloat(amount);
    if (!category || isNaN(parsed)) {
      Alert.alert("Enter valid category and amount");
      return;
    }

    const newItem = {
      category,
      amount: parsed,
      date: new Date().toISOString(),
    };

    const updated = [...transactions, newItem];
    save(updated);
    setCategory("");
    setAmount("");
  };

  const deleteTransaction = (index) => {
    const updated = [...transactions];
    updated.splice(index, 1);
    save(updated);
  };

  const getThisMonthTransactions = () => {
    const now = new Date();
    return transactions.filter((t) => {
      const date = new Date(t.date || new Date());
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  };

  const thisMonthTransactions = getThisMonthTransactions();
  const totalSpentThisMonth = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const budgetLimit = parseFloat(monthlyBudget) || 0;
  const budgetExceeded = totalSpentThisMonth > budgetLimit;
  const progress = Math.min(totalSpentThisMonth / budgetLimit, 1);

  const filteredTransactions =
    filter === "All"
      ? transactions
      : transactions.filter((t) => t.category === filter);

  const categoryTotals = transactions.reduce((acc, { category, amount }) => {
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  const validCategories = Object.keys(categoryTotals).filter(
    (cat) => getCategoryColor(cat) !== "#9E9E9E"
  );

  const chartData = {
    categories: validCategories,
    values: validCategories.map((cat) => categoryTotals[cat]),
    colors: validCategories.map(getCategoryColor),
  };

  const renderTransactionItem = ({ item, index }) => (
    <View style={styles.transactionRow}>
      <Text style={styles.transactionText}>
        {item.category}: £{item.amount.toFixed(2)}
      </Text>
      <TouchableOpacity onPress={() => deleteTransaction(index)}>
        <Text style={styles.deleteText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>💷 Budget Planner</Text>

            <View style={styles.budgetSection}>
              <Text style={styles.sectionTitle}>Monthly Budget</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Set Monthly Budget"
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
              />
              <Text style={{ fontSize: 16 }}>
                Total Spent:{" "}
                <Text style={{ fontWeight: "bold" }}>
                  £{totalSpentThisMonth.toFixed(2)}
                </Text>
              </Text>
              <Progress.Bar
                progress={progress}
                width={null}
                height={15}
                borderRadius={6}
                color={budgetExceeded ? "#d32f2f" : "#4CAF50"}
                unfilledColor="#e0e0e0"
                style={{ marginVertical: 8 }}
              />
              <Text style={{ color: budgetExceeded ? "#d32f2f" : "#4CAF50", fontWeight: "bold" }}>
                {budgetExceeded
                  ? "⚠️ Over Budget!"
                  : `Remaining: £${(budgetLimit - totalSpentThisMonth).toFixed(2)}`}
              </Text>
            </View>

            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder="Category (e.g., Food)"
                value={category}
                onChangeText={setCategory}
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <TouchableOpacity style={styles.button} onPress={addTransaction}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>

         

            <View style={styles.filterRow}>
              {["All", ...new Set(transactions.map((t) => t.category))].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterButton, filter === cat && styles.filterActive]}
                  onPress={() => setFilter(cat)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === cat ? { color: "#fff" } : { color: "#000" },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          

            <Text style={styles.sectionTitle}>Transactions</Text>
            <FlatList
              data={filteredTransactions}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderTransactionItem}
              scrollEnabled={false}
            />
          </ScrollView>

          {keyboardVisible && (
            <TouchableOpacity
              onPress={Keyboard.dismiss}
              style={styles.keyboardDismissIcon}
            >
              <Ionicons name="chevron-down" size={32} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getCategoryColor = (category) => {
  const colors = {
    Rent: "#F44336",
    Food: "#FFC107",
    Salary: "#4CAF50",
    Entertainment: "#9C27B0",
    Utilities: "#03A9F4",
  };
  return colors[category] || "#9E9E9E";
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f0f8ff",
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#2E7D32",
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginVertical: 10,
  },
  transactionRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionText: {
    fontSize: 16,
  },
  deleteText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  filterActive: {
    backgroundColor: "#4CAF50",
  },
  filterText: {
    fontWeight: "600",
  },
  budgetSection: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  keyboardDismissIcon: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 20,
  },
});
