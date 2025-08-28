import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated, // <-- Import Animated
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
// --- Add Gesture Handler imports ---
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import tinycolor from "tinycolor2";

import { useTheme } from '../../../app/context/ThemeContext';
import { useWellaura } from '../../WellauraContext';
import { BudgetSettings, CalendarEvent, ScheduledPayment, Transaction } from '../../types';

// --- CONSTANTS ---
const CATEGORY_COLORS: Record<string, string> = { Food: '#FFB74D', Shopping: '#BA68C8', Transport: '#4FC3F7', Housing: '#F06292', Utilities: '#4DB6AC', Entertainment: '#7986CB', Other: '#9E9E9E', Salary: '#28A745' };
const DEFAULT_EXPENSE_CATEGORIES = ["Food", "Shopping", "Transport", "Housing", "Utilities", "Entertainment"];
const DEFAULT_INCOME_CATEGORIES = ["Salary"];
type BudgetPeriod = 'Weekly' | 'Fortnightly' | 'Monthly';
type HistoryFilter = 'All' | 'Income' | 'Expense' | string;

// --- Date Helper Functions ---
const getStartOfWeek = (date: Date): Date => { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const startOfWeek = new Date(d.setDate(diff)); startOfWeek.setHours(0, 0, 0, 0); return startOfWeek; };
const getFortnightOfYear = (date: Date): number => { const startOfYear = new Date(date.getFullYear(), 0, 1); const diff = date.getTime() - startOfYear.getTime(); const oneDay = 1000 * 60 * 60 * 24; return Math.floor(Math.floor(diff / oneDay) / 14); };


// --- Main App Component ---
export default function BudgetPage() {
    const { transactions, saveTransactions, budgetSettings, saveBudgetSettings, calendarEvents, saveCalendarEvents, isLoading } = useWellaura();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);

    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const [isSpendingVisible, setSpendingVisible] = useState(false);
    
    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [isVariableExpense, setIsVariableExpense] = useState(false);

    useEffect(() => {
        const generateScheduledTransactions = () => {
            const now = moment();
            const scheduledPayments = budgetSettings.scheduledPayments || [];
            let newTransactions: Transaction[] = [];

            scheduledPayments.forEach(payment => {
                if (payment.frequency === 'monthly') {
                    const paymentDay = moment(payment.date).date();
                    let lastPaymentDate = now.clone().date(paymentDay);
                    if (now.date() < paymentDay) {
                        lastPaymentDate.subtract(1, 'month');
                    }
                    const transactionId = `scheduled-${payment.id}-${lastPaymentDate.format('YYYY-MM')}`;
                    const alreadyExists = transactions.some(t => t.id === transactionId);

                    if (!alreadyExists) {
                        newTransactions.push({
                            id: transactionId, type: payment.type, category: payment.category,
                            date: lastPaymentDate.toISOString(), isVariable: false, budgetedAmount: payment.amount,
                            actualAmount: payment.amount, isScheduled: true,
                        });
                    }
                }
            });

            if (newTransactions.length > 0) {
                const combined = [...transactions, ...newTransactions];
                saveTransactions(combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        };
        if (!isLoading) { generateScheduledTransactions(); }
    }, [isLoading, budgetSettings.scheduledPayments, saveTransactions, transactions]);

    const activeCategories = useMemo(() => { if (transactionType === 'income') return [...DEFAULT_INCOME_CATEGORIES, ...(budgetSettings.customIncomeCategories || [])]; return [...DEFAULT_EXPENSE_CATEGORIES, ...(budgetSettings.customCategories || [])]; }, [transactionType, budgetSettings.customCategories, budgetSettings.customIncomeCategories]);
    useEffect(() => { if (!budgetSettings.incomeVaries && transactionType === 'income') { setTransactionType('expense'); } }, [budgetSettings.incomeVaries, transactionType]);
    useEffect(() => { if (transactionType === 'expense' && category) { const defaultAmount = (budgetSettings.defaultCategoryAmounts || {})[category]; if (defaultAmount) { setAmount(defaultAmount); } else { setAmount(''); } } else { setAmount(''); } }, [category, transactionType, budgetSettings.defaultCategoryAmounts]);
    const thisPeriodTransactions = useMemo(() => { const now = new Date(); const currentYear = now.getFullYear(); switch (budgetSettings.budgetPeriod) { case 'Weekly': return transactions.filter(t => new Date(t.date) >= getStartOfWeek(now)); case 'Fortnightly': return transactions.filter(t => new Date(t.date).getFullYear() === currentYear && getFortnightOfYear(new Date(t.date)) === getFortnightOfYear(now)); default: return transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === currentYear); } }, [transactions, budgetSettings.budgetPeriod]);
    const { totalIncome, totalExpenses } = useMemo(() => { const income = budgetSettings.incomeVaries ? thisPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0) : parseFloat(budgetSettings.fixedIncome || '0') || 0; const expenses = thisPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => { if (t.actualAmount !== null) return sum + t.actualAmount; if (!t.isVariable) return sum + t.budgetedAmount; return sum; }, 0); return { totalIncome: income, totalExpenses: expenses }; }, [thisPeriodTransactions, budgetSettings]);
    const handleAddTransaction = useCallback(() => { if (!category) { Alert.alert("No Category", "Please select a category."); return; } const parsedAmount = parseFloat(amount); if (isNaN(parsedAmount) || parsedAmount <= 0) { Alert.alert("Invalid Amount", "Please enter a valid positive amount."); return; } const newTransaction: Transaction = { id: Date.now().toString(), type: transactionType, category, date: new Date().toISOString(), isVariable: transactionType === 'expense' && isVariableExpense, budgetedAmount: parsedAmount, actualAmount: (transactionType === 'expense' && isVariableExpense) ? null : parsedAmount, }; const newTransactions = [...transactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); saveTransactions(newTransactions); setCategory(''); setAmount(''); setIsVariableExpense(false); Keyboard.dismiss(); }, [category, amount, transactionType, transactions, isVariableExpense, saveTransactions]);
    const handleUpdateActualAmount = (transactionId: string) => { Alert.prompt("Actual Spending", "Enter the final amount for this expense.", [{ text: "Cancel", style: "cancel" }, { text: "Save", onPress: (newAmount) => { if (newAmount && !isNaN(parseFloat(newAmount))) { const updatedTransactions = transactions.map(t => t.id === transactionId ? { ...t, actualAmount: parseFloat(newAmount) } : t); saveTransactions(updatedTransactions); } else { Alert.alert("Invalid", "Please enter a valid number."); } }}], 'plain-text', '', 'number-pad' ); };
    
    // --- NEW: Function to handle deleting a transaction ---
    const handleDeleteTransaction = useCallback((transactionId: string) => {
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to permanently delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
                        saveTransactions(updatedTransactions);
                    }
                }
            ]
        );
    }, [transactions, saveTransactions]);

    const handleUpdateSettings = (newSettings: BudgetSettings) => {
        const scheduledPayments = newSettings.scheduledPayments || [];
        let updatedCalendarEvents = calendarEvents.filter(e => e.type !== 'payment');
        scheduledPayments.forEach(p => { const eventDate = new Date(p.date); const newCalendarEvent: CalendarEvent = { id: `payment-${p.id}`, title: `${p.name} (${p.type === 'income' ? '+' : '-'}£${p.amount})`, start: eventDate, end: new Date(eventDate.getTime() + 60 * 60 * 1000), color: p.type === 'income' ? '#28A745' : '#E53E3E', type: 'payment', }; updatedCalendarEvents.push(newCalendarEvent); });
        saveCalendarEvents(updatedCalendarEvents);
        saveBudgetSettings(newSettings);
    };

    if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>;

    // --- NEW: Wrap the entire screen in GestureHandlerRootView ---
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={{flex: 1}}>
                    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                        <View style={styles.header}><View style={styles.iconButton} /><Text style={styles.headerTitle}>My Budget</Text><TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}><Ionicons name="settings-outline" size={24} color={theme.textPrimary} /></TouchableOpacity></View>
                        <LinearGradient colors={[theme.primary, tinycolor(theme.primary).darken(15).toString()]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.card, { marginBottom: 25 }]}><Text style={[styles.cardTitle, { color: styles.summaryLabel.color, opacity: 0.9 }]}>{budgetSettings.budgetPeriod} Summary</Text><View style={styles.summaryGrid}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Income</Text><Text style={styles.summaryValue}>£{totalIncome.toFixed(2)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Expenses</Text><Text style={styles.summaryValue}>£{totalExpenses.toFixed(2)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Net</Text><Text style={styles.summaryValue}>£{(totalIncome - totalExpenses).toFixed(2)}</Text></View></View></LinearGradient>
                        <TouchableOpacity style={[styles.card, styles.linkCard]} onPress={() => setSpendingVisible(true)}><Ionicons name="bar-chart-outline" size={22} color={theme.primary} /><Text style={styles.linkCardText}>Track Spending Details</Text><Ionicons name="chevron-forward-outline" size={22} color={theme.textSecondary} /></TouchableOpacity>
                        <View style={styles.card}><Text style={styles.cardTitle}>New Transaction</Text>{budgetSettings.incomeVaries && (<View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, transactionType === 'expense' && styles.typeButtonActive]} onPress={() => setTransactionType('expense')}><Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, transactionType === 'income' && styles.typeButtonActive]} onPress={() => setTransactionType('income')}><Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View>)}<Text style={styles.inputLabel}>Category</Text><View style={styles.categorySelectorContainer}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{activeCategories.map(cat => (<TouchableOpacity key={cat} style={[styles.categoryButton, category === cat && styles.categoryButtonActive]} onPress={() => setCategory(cat)}><Text style={[styles.categoryButtonText, category === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity>))}<TouchableOpacity style={styles.addCategoryButton} onPress={() => setSettingsVisible(true)}><Ionicons name="add" size={18} color={theme.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity></ScrollView></View><Text style={styles.inputLabel}>Amount</Text><TextInput style={[styles.input, {flex: 0}]} placeholder="£0.00" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                        {transactionType === 'expense' && <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsVariableExpense(!isVariableExpense)}><Ionicons name={isVariableExpense ? "checkbox" : "square-outline"} size={24} color={theme.primary} /><Text style={styles.checkboxLabel}>This is a budget estimate</Text></TouchableOpacity>}
                        <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}><Ionicons name="add" size={24} color={styles.addButtonText.color} /><Text style={styles.addButtonText}>Add Transaction</Text></TouchableOpacity></View>
                        {/* --- NEW: Pass the delete handler to the history component --- */}
                        <TransactionHistory 
                            transactions={thisPeriodTransactions} 
                            onUpdateActual={handleUpdateActualAmount} 
                            onDelete={handleDeleteTransaction}
                            theme={theme} 
                            styles={styles}
                        />
                    </ScrollView>
                    {isSettingsVisible && <SettingsPopup settings={budgetSettings} onClose={() => setSettingsVisible(false)} onUpdate={handleUpdateSettings} theme={theme} styles={styles} />}
                    {isSpendingVisible && <SpendingTrackerPopup visible={isSpendingVisible} onClose={() => setSpendingVisible(false)} transactions={transactions} settings={budgetSettings} theme={theme} styles={styles} />}
                </View>
            </KeyboardAvoidingView>
        </GestureHandlerRootView>
    );
}

// --- Sub-Components ---
// --- NEW: Update TransactionHistory to handle swipe-to-delete ---
function TransactionHistory({ transactions, onUpdateActual, onDelete, theme, styles }) { 
    const [filter, setFilter] = useState<HistoryFilter>('All'); 
    const filterOptions = useMemo(() => { const expenseCategories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category)); return ['All', 'Income', 'Expense', ...Array.from(expenseCategories)]; }, [transactions]); 
    const filteredTransactions = useMemo(() => { if (filter === 'All') return transactions; if (filter === 'Income') return transactions.filter(t => t.type === 'income'); if (filter === 'Expense') return transactions.filter(t => t.type === 'expense'); return transactions.filter(t => t.category === filter); }, [transactions, filter]); 

    // --- NEW: Function to render the delete action view ---
    const renderRightActions = (progress, transactionId) => {
        const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity onPress={() => onDelete(transactionId)} style={styles.deleteAction}>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    if (transactions.length === 0) { 
        return ( <View style={styles.card}><Text style={styles.cardTitle}>Transaction History</Text><View style={styles.emptyHistoryContainer}><Ionicons name="receipt-outline" size={48} color={theme.textSecondary} /><Text style={styles.emptyText}>No transactions for this period yet.</Text><Text style={styles.emptySubText}>Add one above to get started!</Text></View></View> ); 
    } 
    return ( 
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction History</Text>
            <View style={{ marginBottom: 15 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5 }}>{filterOptions.map(option => ( <TouchableOpacity key={option} style={[styles.filterButton, filter === option && styles.filterButtonActive]} onPress={() => setFilter(option)}><Text style={[styles.filterButtonText, filter === option && styles.filterButtonTextActive]}>{option}</Text></TouchableOpacity> ))}</ScrollView></View>
            {filteredTransactions.length > 0 ? filteredTransactions.map(t => ( 
                // --- NEW: Wrap each transaction row in a Swipeable component ---
                <Swipeable
                    key={t.id}
                    renderRightActions={(progress) => renderRightActions(progress, t.id)}
                    overshootRight={false}
                >
                    <View style={styles.transactionRow}>
                        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                            <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Other }]} />
                            <View>
                                <Text style={styles.transactionCategory}>{t.category}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    {t.isScheduled && <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />}
                                    <Text style={styles.transactionDate}>{new Date(t.date).toLocaleDateString()}</Text>
                                </View>
                                {t.isVariable && t.actualAmount !== null && ( 
                                    <Text style={[styles.budgetedText, {color: t.actualAmount <= t.budgetedAmount ? '#28A745' : '#E53E3E'}]}> (Budgeted: £{t.budgetedAmount.toFixed(2)}) </Text> 
                                )}
                            </View>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            {t.isVariable && t.actualAmount === null ? ( 
                                <TouchableOpacity style={styles.addActualButton} onPress={() => onUpdateActual(t.id)}>
                                    <Text style={styles.addActualButtonText}>Log Actual</Text>
                                </TouchableOpacity> 
                            ) : ( 
                                <Text style={[styles.transactionAmount, { color: t.type === 'income' ? '#28A745' : theme.textPrimary }]}> 
                                    {t.type === 'income' ? '+' : '-'}£{(t.actualAmount ?? t.budgetedAmount).toFixed(2)} 
                                </Text> 
                            )}
                        </View>
                    </View>
                </Swipeable>
            )) : <Text style={styles.emptyText}>No transactions match this filter.</Text>}
        </View> 
    );
}

function SpendingTrackerPopup({ onClose, transactions, settings, theme, styles }) { const dataForView = useMemo(() => { const now = new Date(); switch (settings.budgetPeriod) { case 'Weekly': return transactions.filter(t => new Date(t.date) >= getStartOfWeek(now)); case 'Fortnightly': return transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear() && getFortnightOfYear(new Date(t.date)) === getFortnightOfYear(now)); default: return transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear()); } }, [transactions, settings.budgetPeriod]); const expenseBreakdownData = useMemo(() => { const expenses = dataForView.filter(t => t.type === 'expense' && (t.actualAmount !== null && t.actualAmount > 0)); const totalExpenses = expenses.reduce((sum, t) => sum + (t.actualAmount || 0), 0); if (totalExpenses === 0) return []; const categoryTotals = expenses.reduce((acc: Record<string, number>, { category, actualAmount }) => { acc[category] = (acc[category] || 0) + (actualAmount || 0); return acc; }, {}); return Object.entries(categoryTotals).map(([cat, amt]) => ({ category: cat, amount: amt, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other, percentage: amt / totalExpenses })).sort((a, b) => b.amount - a.amount); }, [dataForView]); return ( <TouchableWithoutFeedback onPress={onClose}><View style={styles.modalBackdrop}><TouchableWithoutFeedback onPress={e => e.stopPropagation()}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Spending Tracker</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View><ScrollView><View style={styles.settingCard}><Text style={styles.cardTitle}>{settings.budgetPeriod} Finalised Expenses</Text>{expenseBreakdownData.length > 0 ? expenseBreakdownData.map(item => (<View key={item.category} style={styles.barChartRow}><View style={styles.barLabelContainer}><Text style={styles.barLabel} numberOfLines={1}>{item.category}</Text><Text style={styles.barAmount}>£{item.amount.toFixed(2)}</Text></View><View style={styles.barContainer}><View style={[styles.bar, { width: `${item.percentage * 100}%`, backgroundColor: item.color }]} /></View></View>)) : <Text style={styles.emptyText}>No finalized expenses for this period.</Text>}</View></ScrollView></View></TouchableWithoutFeedback></View></TouchableWithoutFeedback> );}

function SettingsPopup({ settings, onClose, onUpdate, theme, styles }) {
    const [paymentName, setPaymentName] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [paymentCategory, setPaymentCategory] = useState('');
    const [paymentType, setPaymentType] = useState<'expense' | 'income'>('expense');
    const [paymentFrequency, setPaymentFrequency] = useState<'one-time' | 'monthly'>('monthly');
    const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
    const expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...(settings.customCategories || [])];
    const incomeCategories = [...DEFAULT_INCOME_CATEGORIES, ...(settings.customIncomeCategories || [])];
    const availableCategories = paymentType === 'expense' ? expenseCategories : incomeCategories;
    useEffect(() => { if (!availableCategories.includes(paymentCategory)) { setPaymentCategory(''); } }, [paymentType, availableCategories, paymentCategory]);
    const handleAddNewCategory = () => { const type = paymentType; const existing = availableCategories.map(c => c.toLowerCase()); Alert.prompt(`New ${type === 'income' ? 'Income' : 'Expense'} Category`, 'Enter the name for the new category.', [{ text: "Cancel", style: "cancel" }, { text: "Add", onPress: (newCategoryName) => { if (!newCategoryName || newCategoryName.trim() === '') return; const trimmedName = newCategoryName.trim(); if (existing.includes(trimmedName.toLowerCase())) { Alert.alert("Duplicate", `The category "${trimmedName}" already exists.`); return; } if (type === 'expense') { onUpdate({ ...settings, customCategories: [...(settings.customCategories || []), trimmedName] }); } else { onUpdate({ ...settings, customIncomeCategories: [...(settings.customIncomeCategories || []), trimmedName] }); } setPaymentCategory(trimmedName); }}],'plain-text' ); };
    const handleAddScheduledPayment = () => { if (!paymentName || !paymentAmount || !paymentCategory) { Alert.alert("Missing Info", "Please fill out all fields for the scheduled item."); return; } const newPayment: ScheduledPayment = { id: Date.now().toString(), name: paymentName, amount: parseFloat(paymentAmount), date: paymentDate.toISOString(), category: paymentCategory, type: paymentType, frequency: paymentFrequency, }; const updatedPayments = [...(settings.scheduledPayments || []), newPayment]; onUpdate({ ...settings, scheduledPayments: updatedPayments }); setPaymentName(''); setPaymentAmount(''); setPaymentDate(new Date()); setPaymentCategory(''); };
    const handleDeleteScheduledPayment = (id: string) => { const updatedPayments = (settings.scheduledPayments || []).filter(p => p.id !== id); onUpdate({ ...settings, scheduledPayments: updatedPayments }); };
    const handleDateChange = (event, selectedDate) => { const currentDate = selectedDate || paymentDate; setShowPicker(null); setPaymentDate(currentDate); };
    return (
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalBackdrop}>
                <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Settings</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View>
                        <ScrollView contentContainerStyle={{paddingBottom: 80}}>
                            <View style={styles.settingCard}>
                                <Text style={styles.cardTitle}>Scheduled Items</Text>
                                {(settings.scheduledPayments || []).map((p: ScheduledPayment) => ( <View key={p.id} style={styles.categoryManageRow}><View><Text style={[styles.categoryManageText, {color: p.type === 'income' ? '#28A745' : theme.textPrimary}]}>{p.name} (£{p.amount})</Text><Text style={styles.transactionDate}>{p.frequency === 'monthly' ? `Monthly on day ${new Date(p.date).getDate()}` : `One-time on ${new Date(p.date).toLocaleDateString()}`}</Text></View><TouchableOpacity onPress={() => handleDeleteScheduledPayment(p.id)}><Ionicons name="trash-outline" size={22} color={'#E53E3E'} /></TouchableOpacity></View> ))}
                                <View style={{ paddingTop: 15, marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border }}><Text style={[styles.inputLabel, {marginTop: 0}]}>Add New Scheduled Item</Text><View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentType === 'expense' && styles.typeButtonActive]} onPress={() => setPaymentType('expense')}><Text style={[styles.typeButtonText, paymentType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentType === 'income' && styles.typeButtonActive]} onPress={() => setPaymentType('income')}><Text style={[styles.typeButtonText, paymentType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View><TextInput style={styles.input} placeholder="Name (e.g. Rent, Salary)" value={paymentName} onChangeText={setPaymentName} /><TextInput style={[styles.input, {marginTop: 10}]} placeholder="Amount (£)" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} /><Text style={styles.inputLabel}>Date & Time</Text><View style={styles.dateContainer}><TouchableOpacity onPress={() => setShowPicker('date')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPicker('time')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity></View><Text style={styles.inputLabel}>Frequency</Text><View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'one-time' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('one-time')}><Text style={[styles.typeButtonText, paymentFrequency === 'one-time' && styles.typeButtonTextActive]}>One-Time</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'monthly' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('monthly')}><Text style={[styles.typeButtonText, paymentFrequency === 'monthly' && styles.typeButtonTextActive]}>Monthly</Text></TouchableOpacity></View><Text style={styles.inputLabel}>Category</Text><View style={{height: 45, marginTop: 5}}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{availableCategories.map(cat => ( <TouchableOpacity key={cat} style={[styles.categoryButton, paymentCategory === cat && styles.categoryButtonActive]} onPress={() => setPaymentCategory(cat)}><Text style={[styles.categoryButtonText, paymentCategory === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity> ))}<TouchableOpacity style={styles.addCategoryButton} onPress={handleAddNewCategory}><Ionicons name="add" size={18} color={theme.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity></ScrollView></View>
                                    {showPicker && (<DateTimePicker value={paymentDate} mode={showPicker} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />)}
                                    <TouchableOpacity style={[styles.addButtonMini, {alignSelf: 'center', marginTop: 15}]} onPress={handleAddScheduledPayment}><Text style={styles.addButtonText}>Add Scheduled Item</Text></TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={styles.saveButton} onPress={onClose}><Text style={styles.saveButtonText}>Done</Text></TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    );
}

// --- STYLESHEET ---
const getDynamicStyles = (theme) => {
    const onPrimaryColor = tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary;
    const onAccentColor = tinycolor(theme.accent).isDark() ? theme.white : theme.textPrimary;
    return StyleSheet.create({
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
        container: { padding: 15, paddingBottom: 50, backgroundColor: theme.background },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'android' ? 25 : 40, paddingHorizontal: 5 },
        headerTitle: { fontSize: 24, fontWeight: "bold", color: theme.textPrimary, textAlign: 'center', flex: 1 },
        iconButton: { padding: 5, width: 34, alignItems: 'center' },
        card: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#4C3B8A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
        cardTitle: { fontSize: 18, fontWeight: "600", color: theme.textSecondary, marginBottom: 15 },
        inputLabel: { fontSize: 14, fontWeight: '500', color: theme.textSecondary, marginBottom: 8, marginTop: 12 },
        summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
        summaryItem: { alignItems: 'center', flex: 1 },
        summaryLabel: { fontSize: 14, color: onPrimaryColor, opacity: 0.8, marginBottom: 4 },
        summaryValue: { fontSize: 22, fontWeight: '700', color: onPrimaryColor },
        linkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
        linkCardText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '600', color: theme.textPrimary },
        typeSelector: { flexDirection: 'row', backgroundColor: theme.border, borderRadius: 10, padding: 4, marginBottom: 15 },
        typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
        typeButtonActive: { backgroundColor: theme.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { height: 1 } },
        typeButtonText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
        typeButtonTextActive: { color: theme.primary },
        input: { flex: 1, backgroundColor: theme.border, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', fontSize: 16, color: theme.textPrimary },
        addButton: { backgroundColor: theme.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, marginTop: 20, elevation: 2 },
        addButtonText: { color: onAccentColor, fontWeight: "bold", fontSize: 16, marginLeft: 8 },
        barChartRow: { marginBottom: 12 },
        barLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
        barLabel: { fontSize: 15, fontWeight: '500', color: theme.textPrimary, flex: 1, marginRight: 10 },
        barAmount: { fontSize: 15, fontWeight: '500', color: theme.textSecondary },
        barContainer: { height: 12, backgroundColor: theme.border, borderRadius: 6, overflow: 'hidden' },
        bar: { height: '100%', borderRadius: 6 },
        emptyText: { color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 20 },
        emptySubText: { color: theme.textSecondary, textAlign: 'center', },
        emptyHistoryContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
        categorySelectorContainer: { height: 50, marginBottom: 10 },
        categoryButton: { backgroundColor: theme.surface, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, marginRight: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
        categoryButtonActive: { backgroundColor: tinycolor(theme.accent).setAlpha(0.15).toRgbString(), borderColor: theme.accent },
        categoryButtonText: { color: theme.textPrimary, fontWeight: '600' },
        categoryButtonTextActive: { color: theme.accent },
        addCategoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.surface },
        addCategoryButtonText: { color: theme.primary, fontWeight: '600', marginLeft: 4 },
        modalBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
        modalContent: { width: '90%', maxHeight: '85%', backgroundColor: theme.background, borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, padding: 15 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
        settingCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 15, marginBottom: 15, marginHorizontal: 15 },
        checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
        checkboxLabel: { marginLeft: 10, fontSize: 16, color: theme.textPrimary },
        addButtonMini: { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 },
        categoryManageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
        categoryManageText: { fontSize: 16, color: theme.textPrimary },
        saveButton: { backgroundColor: theme.primary, padding: 16, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
        saveButtonText: { color: onPrimaryColor, fontSize: 18, fontWeight: 'bold' },
        transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16 /* Add padding to match card */ },
        transactionCategory: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
        transactionDate: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
        transactionAmount: { fontSize: 16, fontWeight: '700' },
        addActualButton: { backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
        addActualButtonText: { color: onPrimaryColor, fontWeight: 'bold', fontSize: 12 },
        budgetedText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
        filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, marginRight: 10, borderWidth: 1, borderColor: theme.border },
        filterButtonActive: { backgroundColor: theme.primary, borderColor: tinycolor(theme.primary).darken(10).toString() },
        filterButtonText: { color: theme.textSecondary, fontWeight: '600' },
        filterButtonTextActive: { color: onPrimaryColor },
        categoryIcon: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
        dateContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.border, padding: 15, borderRadius: 10 },
        dateText: { fontSize: 16, color: theme.textPrimary, fontWeight: '500' },
        deleteAction: {
            backgroundColor: '#E53E3E',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
        },
    });
};