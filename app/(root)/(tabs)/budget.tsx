import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useWellaura } from '../../WellauraContext';
import { BudgetSettings, CalendarEvent, ScheduledPayment, Transaction } from '../../types';

// --- THEME & CONSTANTS ---
const COLORS = {
    primary: '#4C3B8A', primaryDark: '#3C2D6E', accent: '#D94C8B', accentLight: '#FBEAF2', background: '#F8F7FC', surface: '#FFFFFF', textPrimary: '#212121', textSecondary: '#757575', success: '#28A745', danger: '#E53E3E', white: '#FFFFFF', black: '#000000', lightGray: '#F5F5F5', mediumGray: '#E0E0E0',
};
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
    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const [isSpendingVisible, setSpendingVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [isVariableExpense, setIsVariableExpense] = useState(false);

    useEffect(() => {
        const generateScheduledTransactions = () => {
            const now = new Date();
            const scheduledPayments = budgetSettings.scheduledPayments || [];
            let newTransactionsCreated = false;
            const newTransactions = [...transactions];

            scheduledPayments.forEach(payment => {
                const paymentDate = new Date(payment.date);
                if (payment.frequency === 'one-time' && paymentDate > now) return;

                const alreadyExists = transactions.some(t =>
                    t.isScheduled && t.id.startsWith(`scheduled-${payment.id}`)
                );

                if (!alreadyExists) {
                    const newTransaction: Transaction = {
                        id: `scheduled-${payment.id}-${paymentDate.toISOString()}`,
                        type: payment.type,
                        category: payment.category,
                        date: paymentDate.toISOString(),
                        isVariable: false,
                        budgetedAmount: payment.amount,
                        actualAmount: payment.amount,
                        isScheduled: true,
                    };
                    newTransactions.push(newTransaction);
                    newTransactionsCreated = true;
                }
            });

            if (newTransactionsCreated) {
                saveTransactions(newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        };

        if (!isLoading) {
            generateScheduledTransactions();
        }
    }, [isLoading, budgetSettings.scheduledPayments]);

    const activeCategories = useMemo(() => {
        if (transactionType === 'income') return [...DEFAULT_INCOME_CATEGORIES, ...(budgetSettings.customIncomeCategories || [])];
        return [...DEFAULT_EXPENSE_CATEGORIES, ...(budgetSettings.customCategories || [])];
    }, [transactionType, budgetSettings.customCategories, budgetSettings.customIncomeCategories]);

    useEffect(() => { if (!budgetSettings.incomeVaries && transactionType === 'income') { setTransactionType('expense'); } }, [budgetSettings.incomeVaries]);

    useEffect(() => {
        if (transactionType === 'expense' && category) {
            const defaultAmount = (budgetSettings.defaultCategoryAmounts || {})[category];
            if (defaultAmount) { setAmount(defaultAmount); }
            else { setAmount(''); }
        } else { setAmount(''); }
    }, [category, transactionType]);
    
    const thisPeriodTransactions = useMemo(() => {
        const now = new Date(); const currentYear = now.getFullYear();
        switch (budgetSettings.budgetPeriod) {
            case 'Weekly': return transactions.filter(t => new Date(t.date) >= getStartOfWeek(now));
            case 'Fortnightly': return transactions.filter(t => new Date(t.date).getFullYear() === currentYear && getFortnightOfYear(new Date(t.date)) === getFortnightOfYear(now));
            default: return transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === currentYear);
        }
    }, [transactions, budgetSettings.budgetPeriod]);

    const { totalIncome, totalExpenses } = useMemo(() => {
        const income = budgetSettings.incomeVaries ? thisPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.budgetedAmount, 0) : parseFloat(budgetSettings.fixedIncome || '0') || 0;
        const expenses = thisPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => { if (t.actualAmount !== null) return sum + t.actualAmount; if (!t.isVariable) return sum + t.budgetedAmount; return sum; }, 0);
        return { totalIncome: income, totalExpenses: expenses };
    }, [thisPeriodTransactions, budgetSettings]);

    const handleAddTransaction = useCallback(() => {
        if (!category) { Alert.alert("No Category", "Please select a category."); return; }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) { Alert.alert("Invalid Amount", "Please enter a valid positive amount."); return; }
        const newTransaction: Transaction = { id: Date.now().toString(), type: transactionType, category, date: new Date().toISOString(), isVariable: transactionType === 'expense' && isVariableExpense, budgetedAmount: parsedAmount, actualAmount: (transactionType === 'expense' && isVariableExpense) ? null : parsedAmount, };
        const newTransactions = [...transactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveTransactions(newTransactions);
        setCategory(''); setAmount(''); setIsVariableExpense(false); Keyboard.dismiss();
    }, [category, amount, transactionType, transactions, isVariableExpense, saveTransactions]);

    const handleUpdateActualAmount = (transactionId: string) => {
        Alert.prompt("Actual Spending", "Enter the final amount for this expense.",
            [{ text: "Cancel", style: "cancel" }, { text: "Save", onPress: (newAmount) => {
                if (newAmount && !isNaN(parseFloat(newAmount))) {
                    const updatedTransactions = transactions.map(t => t.id === transactionId ? { ...t, actualAmount: parseFloat(newAmount) } : t);
                    saveTransactions(updatedTransactions);
                } else { Alert.alert("Invalid", "Please enter a valid number."); }
            }}], 'plain-text', '', 'number-pad'
        );
    };

    const handleUpdateSettings = (newSettings: BudgetSettings) => {
        const scheduledPayments = newSettings.scheduledPayments || [];
        let updatedCalendarEvents = calendarEvents.filter(e => e.type !== 'payment');

        scheduledPayments.forEach(p => {
            const eventDate = new Date(p.date);
            const newCalendarEvent: CalendarEvent = {
                id: `payment-${p.id}`,
                title: `${p.name} (${p.type === 'income' ? '+' : '-'}£${p.amount})`,
                start: eventDate,
                end: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour duration
                color: p.type === 'income' ? COLORS.success : COLORS.danger,
                type: 'payment',
            };
            updatedCalendarEvents.push(newCalendarEvent);
        });

        saveCalendarEvents(updatedCalendarEvents);
        saveBudgetSettings(newSettings);
    };

    if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <View style={styles.iconButton} />
                        <Text style={styles.headerTitle}>My Budget</Text>
                        <TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
                            <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    
                    <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.card, { marginBottom: 25 }]}>
                        <Text style={[styles.cardTitle, { color: COLORS.white, opacity: 0.9 }]}>{budgetSettings.budgetPeriod} Summary</Text>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Income</Text><Text style={[styles.summaryValue, { color: COLORS.white }]}>£{totalIncome.toFixed(2)}</Text></View>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Expenses</Text><Text style={[styles.summaryValue, { color: COLORS.white }]}>£{totalExpenses.toFixed(2)}</Text></View>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Net</Text><Text style={[styles.summaryValue, { color: COLORS.white }]}>£{(totalIncome - totalExpenses).toFixed(2)}</Text></View>
                        </View>
                    </LinearGradient>

                    <TouchableOpacity style={[styles.card, styles.linkCard]} onPress={() => setSpendingVisible(true)}><Ionicons name="bar-chart-outline" size={22} color={COLORS.primary} /><Text style={styles.linkCardText}>Track Spending Details</Text><Ionicons name="chevron-forward-outline" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
                    
                    <View style={styles.card}><Text style={styles.cardTitle}>New Transaction</Text>{budgetSettings.incomeVaries && (<View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, transactionType === 'expense' && styles.typeButtonActive]} onPress={() => setTransactionType('expense')}><Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, transactionType === 'income' && styles.typeButtonActive]} onPress={() => setTransactionType('income')}><Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View>)}<Text style={styles.inputLabel}>Category</Text><View style={styles.categorySelectorContainer}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{activeCategories.map(cat => (<TouchableOpacity key={cat} style={[styles.categoryButton, category === cat && styles.categoryButtonActive]} onPress={() => setCategory(cat)}><Text style={[styles.categoryButtonText, category === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity>))}<TouchableOpacity style={styles.addCategoryButton} onPress={() => setSettingsVisible(true)}><Ionicons name="add" size={18} color={COLORS.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity></ScrollView></View><Text style={styles.inputLabel}>Amount</Text><TextInput style={[styles.input, {flex: 0}]} placeholder="£0.00" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                    {transactionType === 'expense' && <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsVariableExpense(!isVariableExpense)}><Ionicons name={isVariableExpense ? "checkbox" : "square-outline"} size={24} color={COLORS.primary} /><Text style={styles.checkboxLabel}>This is a budget estimate</Text></TouchableOpacity>}
                    <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}><Ionicons name="add" size={24} color={COLORS.white} /><Text style={styles.addButtonText}>Add Transaction</Text></TouchableOpacity></View>
                    
                    <TransactionHistory transactions={thisPeriodTransactions} onUpdateActual={handleUpdateActualAmount}/>
                </ScrollView>
                {isSettingsVisible && <SettingsPopup settings={budgetSettings} onClose={() => setSettingsVisible(false)} onUpdate={handleUpdateSettings}/>}
                {isSpendingVisible && <SpendingTrackerPopup visible={isSpendingVisible} onClose={() => setSpendingVisible(false)} transactions={transactions} settings={budgetSettings} />}
            </View>
        </KeyboardAvoidingView>
    );
}

// --- Sub-Components ---

function TransactionHistory({ transactions, onUpdateActual }: { transactions: Transaction[], onUpdateActual: (id: string) => void }) {
    const [filter, setFilter] = useState<HistoryFilter>('All');
    const filterOptions = useMemo(() => {
        const expenseCategories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
        return ['All', 'Income', 'Expense', ...Array.from(expenseCategories)];
    }, [transactions]);
    const filteredTransactions = useMemo(() => {
        if (filter === 'All') return transactions;
        if (filter === 'Income') return transactions.filter(t => t.type === 'income');
        if (filter === 'Expense') return transactions.filter(t => t.type === 'expense');
        return transactions.filter(t => t.category === filter);
    }, [transactions, filter]);

    if (transactions.length === 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Transaction History</Text>
                <View style={styles.emptyHistoryContainer}>
                    <Ionicons name="receipt-outline" size={48} color={COLORS.mediumGray} />
                    <Text style={styles.emptyText}>No transactions for this period yet.</Text>
                    <Text style={styles.emptySubText}>Add one above to get started!</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction History</Text>
            <View style={{ marginBottom: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5 }}>
                    {filterOptions.map(option => (
                        <TouchableOpacity key={option} style={[styles.filterButton, filter === option && styles.filterButtonActive]} onPress={() => setFilter(option)}>
                            <Text style={[styles.filterButtonText, filter === option && styles.filterButtonTextActive]}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                <View key={t.id} style={styles.transactionRow}>
                    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Other }]} />
                        <View>
                            <Text style={styles.transactionCategory}>{t.category}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                {t.isScheduled && <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />}
                                <Text style={styles.transactionDate}>{new Date(t.date).toLocaleDateString()}</Text>
                            </View>
                            {t.isVariable && t.actualAmount !== null && (
                                <Text style={[styles.budgetedText, {color: t.actualAmount <= t.budgetedAmount ? COLORS.success : COLORS.danger}]}>
                                    (Budgeted: £{t.budgetedAmount.toFixed(2)})
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                        {t.isVariable && t.actualAmount === null ? (
                            <TouchableOpacity style={styles.addActualButton} onPress={() => onUpdateActual(t.id)}>
                                <Text style={styles.addActualButtonText}>Log Actual</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={[styles.transactionAmount, { color: t.type === 'income' ? COLORS.success : COLORS.textPrimary }]}>
                                {t.type === 'income' ? '+' : '-'}£{(t.actualAmount ?? t.budgetedAmount).toFixed(2)}
                            </Text>
                        )}
                    </View>
                </View>
            )) : <Text style={styles.emptyText}>No transactions match this filter.</Text>}
        </View>
    );
}

function SpendingTrackerPopup({ onClose, transactions, settings }: {onClose: ()=>void, transactions: Transaction[], settings: BudgetSettings}) {
    const dataForView = useMemo(() => {
        const now = new Date();
        switch (settings.budgetPeriod) {
            case 'Weekly': return transactions.filter(t => new Date(t.date) >= getStartOfWeek(now));
            case 'Fortnightly': return transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear() && getFortnightOfYear(new Date(t.date)) === getFortnightOfYear(now));
            default: return transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
        }
    }, [transactions, settings.budgetPeriod]);
    const expenseBreakdownData = useMemo(() => {
        const expenses = dataForView.filter(t => t.type === 'expense' && t.actualAmount !== null);
        const totalExpenses = expenses.reduce((sum, t) => sum + (t.actualAmount || 0), 0);
        if (totalExpenses === 0) return [];
        const categoryTotals = expenses.reduce((acc: Record<string, number>, { category, actualAmount }) => { acc[category] = (acc[category] || 0) + (actualAmount || 0); return acc; }, {});
        return Object.entries(categoryTotals).map(([cat, amt]) => ({ category: cat, amount: amt, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other, percentage: amt / totalExpenses })).sort((a, b) => b.amount - a.amount);
    }, [dataForView]);
    return ( <TouchableWithoutFeedback onPress={onClose}><View style={styles.modalBackdrop}><TouchableWithoutFeedback onPress={e => e.stopPropagation()}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Spending Tracker</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={COLORS.primary} /></TouchableOpacity></View><ScrollView><View style={styles.settingCard}><Text style={styles.cardTitle}>{settings.budgetPeriod} Finalised Expenses</Text>{expenseBreakdownData.length > 0 ? expenseBreakdownData.map(item => (<View key={item.category} style={styles.breakdownRow}><View style={styles.breakdownTextContainer}><Text style={styles.breakdownCategory}>{item.category}</Text><Text style={styles.breakdownAmount}>£{item.amount.toFixed(2)}</Text></View><View /></View>)) : <Text style={styles.emptyText}>No finalized expenses for this period.</Text>}</View></ScrollView></View></TouchableWithoutFeedback></View></TouchableWithoutFeedback> );
}

function SettingsPopup({ settings, onClose, onUpdate }: {settings: BudgetSettings, onClose: ()=>void, onUpdate: (settings: BudgetSettings)=>void}) {
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [newIncomeCategory, setNewIncomeCategory] = useState('');
    
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

    useEffect(() => {
        if (!availableCategories.includes(paymentCategory)) { setPaymentCategory(''); }
    }, [paymentType]);

    const handleAddNewCategory = () => {
        const type = paymentType;
        const existing = availableCategories.map(c => c.toLowerCase());
        Alert.prompt(`New ${type === 'income' ? 'Income' : 'Expense'} Category`, 'Enter the name for the new category.',
            [{ text: "Cancel", style: "cancel" }, { text: "Add", onPress: (newCategoryName) => {
                if (!newCategoryName || newCategoryName.trim() === '') return;
                const trimmedName = newCategoryName.trim();
                if (existing.includes(trimmedName.toLowerCase())) { Alert.alert("Duplicate", `The category "${trimmedName}" already exists.`); return; }
                if (type === 'expense') { onUpdate({ ...settings, customCategories: [...(settings.customCategories || []), trimmedName] }); }
                else { onUpdate({ ...settings, customIncomeCategories: [...(settings.customIncomeCategories || []), trimmedName] }); }
                setPaymentCategory(trimmedName);
            }}],'plain-text'
        );
    };

    const handleAddScheduledPayment = () => {
        if (!paymentName || !paymentAmount || !paymentCategory) { Alert.alert("Missing Info", "Please fill out all fields for the scheduled item."); return; }
        const newPayment: ScheduledPayment = {
            id: Date.now().toString(), name: paymentName, amount: parseFloat(paymentAmount),
            date: paymentDate.toISOString(), category: paymentCategory, type: paymentType, frequency: paymentFrequency,
        };
        const updatedPayments = [...(settings.scheduledPayments || []), newPayment];
        onUpdate({ ...settings, scheduledPayments: updatedPayments });
        setPaymentName(''); setPaymentAmount(''); setPaymentDate(new Date()); setPaymentCategory('');
    };
    
    const handleDeleteScheduledPayment = (id: string) => {
        const updatedPayments = (settings.scheduledPayments || []).filter(p => p.id !== id);
        onUpdate({ ...settings, scheduledPayments: updatedPayments });
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || paymentDate;
        setShowPicker(null);
        setPaymentDate(currentDate);
    };
    
    return (
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalBackdrop}>
                <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Settings</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={COLORS.primary} /></TouchableOpacity></View>
                        <ScrollView contentContainerStyle={{paddingBottom: 80}}>
                            {/* Other settings cards can go here */}
                            <View style={styles.settingCard}>
                                <Text style={styles.cardTitle}>Scheduled Items</Text>
                                {(settings.scheduledPayments || []).map((p: ScheduledPayment) => (
                                    <View key={p.id} style={styles.categoryManageRow}>
                                        <View>
                                            <Text style={[styles.categoryManageText, {color: p.type === 'income' ? COLORS.success : COLORS.textPrimary}]}>{p.name} (£{p.amount})</Text>
                                            <Text style={styles.transactionDate}>{p.frequency === 'monthly' ? `Monthly on day ${new Date(p.date).getDate()}` : `One-time on ${new Date(p.date).toLocaleDateString()}`}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteScheduledPayment(p.id)}><Ionicons name="trash-outline" size={22} color={COLORS.danger} /></TouchableOpacity>
                                    </View>
                                ))}
                                
                                <View style={{ paddingTop: 15, marginTop: 15, borderTopWidth: 1, borderTopColor: COLORS.lightGray }}>
                                    <Text style={[styles.inputLabel, {marginTop: 0}]}>Add New Scheduled Item</Text>
                                    <View style={styles.typeSelector}>
                                        <TouchableOpacity style={[styles.typeButton, paymentType === 'expense' && styles.typeButtonActive]} onPress={() => setPaymentType('expense')}><Text style={[styles.typeButtonText, paymentType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.typeButton, paymentType === 'income' && styles.typeButtonActive]} onPress={() => setPaymentType('income')}><Text style={[styles.typeButtonText, paymentType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity>
                                    </View>
                                    <TextInput style={styles.input} placeholder="Name (e.g. Rent, Salary)" value={paymentName} onChangeText={setPaymentName} />
                                    <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Amount (£)" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
                                    
                                    <Text style={styles.inputLabel}>Date & Time</Text>
                                    <View style={styles.dateContainer}>
                                        <TouchableOpacity onPress={() => setShowPicker('date')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleDateString()}</Text></TouchableOpacity>
                                        <TouchableOpacity onPress={() => setShowPicker('time')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity>
                                    </View>
                                    
                                    <Text style={styles.inputLabel}>Frequency</Text>
                                    <View style={styles.typeSelector}>
                                        <TouchableOpacity style={[styles.typeButton, paymentFrequency === 'one-time' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('one-time')}><Text style={[styles.typeButtonText, paymentFrequency === 'one-time' && styles.typeButtonTextActive]}>One-Time</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.typeButton, paymentFrequency === 'monthly' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('monthly')}><Text style={[styles.typeButtonText, paymentFrequency === 'monthly' && styles.typeButtonTextActive]}>Monthly</Text></TouchableOpacity>
                                    </View>

                                    <Text style={styles.inputLabel}>Category</Text>
                                    <View style={{height: 45, marginTop: 5}}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {availableCategories.map(cat => ( <TouchableOpacity key={cat} style={[styles.categoryButton, paymentCategory === cat && styles.categoryButtonActive]} onPress={() => setPaymentCategory(cat)}><Text style={[styles.categoryButtonText, paymentCategory === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity> ))}
                                            <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddNewCategory}><Ionicons name="add" size={18} color={COLORS.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity>
                                        </ScrollView>
                                    </View>

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
const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    container: { padding: 15, paddingBottom: 50, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'android' ? 25 : 40, paddingHorizontal: 5 },
    headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.textPrimary, textAlign: 'center', flex: 1 },
    iconButton: { padding: 5, width: 34, alignItems: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#4C3B8A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    cardTitle: { fontSize: 18, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 15 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center', flex: 1 },
    summaryLabel: { fontSize: 14, color: COLORS.white, opacity: 0.8, marginBottom: 4 },
    summaryValue: { fontSize: 22, fontWeight: '700' },
    linkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    linkCardText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    typeSelector: { flexDirection: 'row', backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 4, marginBottom: 15 },
    typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    typeButtonActive: { backgroundColor: COLORS.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { height: 1 } },
    typeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    typeButtonTextActive: { color: COLORS.primary },
    input: { flex: 1, backgroundColor: COLORS.lightGray, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', fontSize: 16, color: COLORS.textPrimary },
    inputDisabled: { backgroundColor: COLORS.mediumGray, color: COLORS.textSecondary },
    addButton: { backgroundColor: COLORS.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, marginTop: 20, elevation: 2 },
    addButtonText: { color: COLORS.white, fontWeight: "bold", fontSize: 16, marginLeft: 8 },
    breakdownRow: { marginBottom: 14 },
    breakdownTextContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    breakdownCategory: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
    breakdownAmount: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
    emptyText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 20 },
    emptySubText: { color: COLORS.textSecondary, textAlign: 'center', },
    emptyHistoryContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    categorySelectorContainer: { height: 50, marginBottom: 10 },
    categoryButton: { backgroundColor: COLORS.surface, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, marginRight: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.mediumGray },
    categoryButtonActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
    categoryButtonText: { color: COLORS.textPrimary, fontWeight: '600' },
    categoryButtonTextActive: { color: COLORS.accent },
    addCategoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
    addCategoryButtonText: { color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
    modalBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    modalContent: { width: '90%', maxHeight: '85%', backgroundColor: COLORS.background, borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.mediumGray, padding: 15 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    settingCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 15, marginBottom: 15, marginHorizontal: 15 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
    checkboxLabel: { marginLeft: 10, fontSize: 16, color: COLORS.textPrimary },
    addCategoryContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray, gap: 10 },
    addButtonMini: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 },
    categoryManageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    categoryManageText: { fontSize: 16, color: COLORS.textPrimary },
    toggleContainer: { flexDirection: 'row', backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 4, marginBottom: 5 },
    toggleButton: { paddingVertical: 8, borderRadius: 8, flex: 1, alignItems: 'center' },
    toggleActive: { backgroundColor: COLORS.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    toggleText: { fontWeight: '600', color: COLORS.textSecondary },
    toggleTextActive: { color: COLORS.primary },
    saveButton: { backgroundColor: COLORS.primary, padding: 16, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 0, left: 0, right: 0 },
    saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    transactionCategory: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    transactionDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    transactionAmount: { fontSize: 16, fontWeight: '700' },
    addActualButton: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addActualButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },
    budgetedText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    defaultAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    defaultAmountLabel: { fontSize: 16, flex: 1, color: COLORS.textPrimary },
    defaultAmountInput: { backgroundColor: COLORS.lightGray, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, width: 100, textAlign: 'right', borderWidth: 1, borderColor: 'transparent' },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 10, borderWidth: 1, borderColor: COLORS.mediumGray },
    filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
    filterButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
    filterButtonTextActive: { color: COLORS.white },
    categoryIcon: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    dateContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.lightGray, padding: 15, borderRadius: 10 },
    dateText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
});