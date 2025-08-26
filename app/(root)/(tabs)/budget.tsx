import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import tinycolor from "tinycolor2";

import { useTheme } from '../../../app/context/ThemeContext';
import { useWellaura } from '../../WellauraContext';
import { BudgetSettings, CalendarEvent, ScheduledPayment, Transaction } from '../../types';

// --- CONSTANTS ---
const CATEGORY_COLORS: Record<string, string> = { Food: '#FFB74D', Shopping: '#BA68C8', Transport: '#4FC3F7', Housing: '#F06292', Utilities: '#4DB6AC', Entertainment: '#7986CB', Other: '#9E9E9E', Salary: '#28A745' };
const DEFAULT_EXPENSE_CATEGORIES = ["Food", "Shopping", "Transport", "Housing", "Utilities", "Entertainment"];
const DEFAULT_INCOME_CATEGORIES = ["Salary"];
type BudgetPeriod = 'Weekly' | 'Monthly';
type HistoryFilter = 'All' | 'Income' | 'Expense' | string;

// --- Date Helper Functions ---
const getPeriodKey = (date: Date, period: BudgetPeriod): string => {
    if (period === 'Weekly') {
        return moment(date).startOf('isoWeek').format('YYYY-MM-DD');
    }
    return moment(date).format('YYYY-MM');
};

const formatPeriodTitle = (key: string, period: BudgetPeriod): string => {
    if (period === 'Weekly') {
        const start = moment(key);
        const end = start.clone().endOf('isoWeek');
        return `Week of ${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
    }
    return moment(key, 'YYYY-MM').format('MMMM YYYY');
};


// --- Main App Component ---
export default function BudgetPage() {
    const { transactions, saveTransactions, budgetSettings, saveBudgetSettings, calendarEvents, saveCalendarEvents, isLoading } = useWellaura();
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);

    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const [isSpendingVisible, setSpendingVisible] = useState(false);
    const [isHistoryVisible, setHistoryVisible] = useState(false);
    
    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [isVariableExpense, setIsVariableExpense] = useState(false);

    const [isSchedulingFormVisible, setIsSchedulingFormVisible] = useState(false);
    const [paymentName, setPaymentName] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [paymentCategory, setPaymentCategory] = useState('');
    const [paymentType, setPaymentType] = useState<'expense' | 'income'>('expense');
    const [paymentFrequency, setPaymentFrequency] = useState<'one-time' | 'monthly'>('monthly');
    const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);

    useEffect(() => {
        // This effect can remain as it is for handling recurring monthly payments
    }, [isLoading, budgetSettings.scheduledPayments, saveTransactions, transactions]);

    const activeCategories = useMemo(() => { if (transactionType === 'income') return [...DEFAULT_INCOME_CATEGORIES, ...(budgetSettings.customIncomeCategories || [])]; return [...DEFAULT_EXPENSE_CATEGORIES, ...(budgetSettings.customCategories || [])]; }, [transactionType, budgetSettings.customCategories, budgetSettings.customIncomeCategories]);
    useEffect(() => { if (!budgetSettings.incomeVaries && transactionType === 'income') { setTransactionType('expense'); } }, [budgetSettings.incomeVaries, transactionType]);
    useEffect(() => { if (transactionType === 'expense' && category) { const defaultAmount = (budgetSettings.defaultCategoryAmounts || {})[category]; if (defaultAmount) { setAmount(defaultAmount); } else { setAmount(''); } } else { setAmount(''); } }, [category, transactionType, budgetSettings.defaultCategoryAmounts]);
    
    const thisPeriodTransactions = useMemo(() => {
        const now = new Date();
        const currentPeriodKey = getPeriodKey(now, budgetSettings.budgetPeriod);
        return transactions.filter(t => getPeriodKey(new Date(t.date), budgetSettings.budgetPeriod) === currentPeriodKey);
    }, [transactions, budgetSettings.budgetPeriod]);
    
    const { totalIncome, totalExpenses } = useMemo(() => { const income = budgetSettings.incomeVaries ? thisPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0) : parseFloat(budgetSettings.fixedIncome || '0') || 0; const expenses = thisPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => { if (t.actualAmount !== null) return sum + t.actualAmount; if (!t.isVariable) return sum + t.budgetedAmount; return sum; }, 0); return { totalIncome: income, totalExpenses: expenses }; }, [thisPeriodTransactions, budgetSettings]);
    const handleAddTransaction = useCallback(() => { if (!category) { Alert.alert("No Category", "Please select a category."); return; } const parsedAmount = parseFloat(amount); if (isNaN(parsedAmount) || parsedAmount <= 0) { Alert.alert("Invalid Amount", "Please enter a valid positive amount."); return; } const newTransaction: Transaction = { id: Date.now().toString(), type: transactionType, category, date: new Date().toISOString(), isVariable: transactionType === 'expense' && isVariableExpense, budgetedAmount: parsedAmount, actualAmount: (transactionType === 'expense' && isVariableExpense) ? null : parsedAmount, }; const newTransactions = [...transactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); saveTransactions(newTransactions); setCategory(''); setAmount(''); setIsVariableExpense(false); Keyboard.dismiss(); }, [category, amount, transactionType, transactions, isVariableExpense, saveTransactions]);
    const handleUpdateActualAmount = (transactionId: string) => { Alert.prompt("Actual Spending", "Enter the final amount for this expense.", [{ text: "Cancel", style: "cancel" }, { text: "Save", onPress: (newAmount) => { if (newAmount && !isNaN(parseFloat(newAmount))) { const updatedTransactions = transactions.map(t => t.id === transactionId ? { ...t, actualAmount: parseFloat(newAmount) } : t); saveTransactions(updatedTransactions); } else { Alert.alert("Invalid", "Please enter a valid number."); } }}], 'plain-text', '', 'number-pad' ); };
    
    const handleUpdateSettings = (newSettings: BudgetSettings) => {
        saveBudgetSettings(newSettings);
    };

    const handleAddScheduledPayment = () => {
        if (!paymentName || !paymentAmount || !paymentCategory) {
            Alert.alert("Missing Info", "Please fill out all fields for the scheduled item.");
            return;
        }
        const newPayment: ScheduledPayment = { id: Date.now().toString(), name: paymentName, amount: parseFloat(paymentAmount), date: paymentDate.toISOString(), category: paymentCategory, type: paymentType, frequency: paymentFrequency, };
        const updatedPayments = [...(budgetSettings.scheduledPayments || []), newPayment];
        saveBudgetSettings({ ...budgetSettings, scheduledPayments: updatedPayments });

        const newTransaction: Transaction = { id: `scheduled-${newPayment.id}`, type: newPayment.type, category: newPayment.category, date: newPayment.date, isVariable: false, budgetedAmount: newPayment.amount, actualAmount: newPayment.amount, isScheduled: true, };
        const newTransactions = [...transactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveTransactions(newTransactions);
        
        const newCalendarEvent: CalendarEvent = { id: `payment-${newPayment.id}`, title: `${newPayment.name} (${newPayment.type === 'income' ? '+' : '-'}£${newPayment.amount})`, start: new Date(newPayment.date), end: new Date(new Date(newPayment.date).getTime() + 60 * 60 * 1000), color: newPayment.type === 'income' ? '#28A745' : '#E53E3E', type: 'payment', };
        saveCalendarEvents([...calendarEvents, newCalendarEvent]);
        
        // UPDATED: Add confirmation alert
        Alert.alert(
            "Payment Scheduled",
            `'${paymentName}' for £${parseFloat(paymentAmount).toFixed(2)} has been added for ${moment(paymentDate).format("D MMM YYYY")}.\n\nIt will appear in the transaction list for that period.`
        );

        setPaymentName(''); setPaymentAmount(''); setPaymentDate(new Date()); setPaymentCategory(''); setIsSchedulingFormVisible(false); Keyboard.dismiss();
    };
    
    const handleDeleteScheduledPayment = (idToDelete: string) => {
        const updatedPayments = (budgetSettings.scheduledPayments || []).filter(p => p.id !== idToDelete);
        saveBudgetSettings({ ...budgetSettings, scheduledPayments: updatedPayments });

        const updatedTransactions = transactions.filter(t => t.id !== `scheduled-${idToDelete}`);
        saveTransactions(updatedTransactions);

        const updatedCalendarEvents = calendarEvents.filter(e => e.id !== `payment-${idToDelete}`);
        saveCalendarEvents(updatedCalendarEvents);
    };


    if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}><View style={styles.iconButton} /><Text style={styles.headerTitle}>My Budget</Text><TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}><Ionicons name="settings-outline" size={24} color={theme.textPrimary} /></TouchableOpacity></View>
                    <LinearGradient colors={[theme.primary, tinycolor(theme.primary).darken(15).toString()]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.card, { marginBottom: 25 }]}><Text style={[styles.cardTitle, { color: styles.summaryLabel.color, opacity: 0.9 }]}>{budgetSettings.budgetPeriod} Summary</Text><View style={styles.summaryGrid}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Income</Text><Text style={styles.summaryValue}>£{totalIncome.toFixed(2)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Expenses</Text><Text style={styles.summaryValue}>£{totalExpenses.toFixed(2)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Net</Text><Text style={styles.summaryValue}>£{(totalIncome - totalExpenses).toFixed(2)}</Text></View></View></LinearGradient>
                    <TouchableOpacity style={[styles.card, styles.linkCard]} onPress={() => setSpendingVisible(true)}><Ionicons name="bar-chart-outline" size={22} color={theme.primary} /><Text style={styles.linkCardText}>Track Spending Details</Text><Ionicons name="chevron-forward-outline" size={22} color={theme.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity style={[styles.card, styles.linkCard]} onPress={() => setHistoryVisible(true)}><Ionicons name="archive-outline" size={22} color={theme.primary} /><Text style={styles.linkCardText}>View Budget History</Text><Ionicons name="chevron-forward-outline" size={22} color={theme.textSecondary} /></TouchableOpacity>
                    
                    <View style={styles.card}><Text style={styles.cardTitle}>New Transaction</Text>{budgetSettings.incomeVaries && (<View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, transactionType === 'expense' && styles.typeButtonActive]} onPress={() => setTransactionType('expense')}><Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, transactionType === 'income' && styles.typeButtonActive]} onPress={() => setTransactionType('income')}><Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View>)}<Text style={styles.inputLabel}>Category</Text><View style={styles.categorySelectorContainer}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{activeCategories.map(cat => (<TouchableOpacity key={cat} style={[styles.categoryButton, category === cat && styles.categoryButtonActive]} onPress={() => setCategory(cat)}><Text style={[styles.categoryButtonText, category === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity>))}<TouchableOpacity style={styles.addCategoryButton} onPress={() => setSettingsVisible(true)}><Ionicons name="add" size={18} color={theme.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity></ScrollView></View><Text style={styles.inputLabel}>Amount</Text><TextInput style={[styles.input, {flex: 0}]} placeholder="£0.00" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                    {transactionType === 'expense' && <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsVariableExpense(!isVariableExpense)}><Ionicons name={isVariableExpense ? "checkbox" : "square-outline"} size={24} color={theme.primary} /><Text style={styles.checkboxLabel}>This is a budget estimate</Text></TouchableOpacity>}
                    <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}><Ionicons name="add" size={24} color={styles.addButtonText.color} /><Text style={styles.addButtonText}>Add Transaction</Text></TouchableOpacity></View>
                    
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsSchedulingFormVisible(!isSchedulingFormVisible); }}>
                            <Text style={styles.cardTitle}>Schedule a Payment</Text>
                            <Ionicons name={isSchedulingFormVisible ? "chevron-up-outline" : "chevron-down-outline"} size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        {isSchedulingFormVisible && (
                            <View style={{paddingTop: 15, borderTopWidth: 1, borderTopColor: theme.border}}>
                                <View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentType === 'expense' && styles.typeButtonActive]} onPress={() => setPaymentType('expense')}><Text style={[styles.typeButtonText, paymentType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentType === 'income' && styles.typeButtonActive]} onPress={() => setPaymentType('income')}><Text style={[styles.typeButtonText, paymentType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View>
                                <TextInput style={styles.input} placeholder="Name (e.g. Rent, Salary)" value={paymentName} onChangeText={setPaymentName} />
                                <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Amount (£)" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
                                <Text style={styles.inputLabel}>Date & Time</Text>
                                <View style={styles.dateContainer}><TouchableOpacity onPress={() => setShowPicker('date')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPicker('time')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity></View>
                                <Text style={styles.inputLabel}>Frequency</Text>
                                <View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'one-time' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('one-time')}><Text style={[styles.typeButtonText, paymentFrequency === 'one-time' && styles.typeButtonTextActive]}>One-Time</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'monthly' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('monthly')}><Text style={[styles.typeButtonText, paymentFrequency === 'monthly' && styles.typeButtonTextActive]}>Monthly</Text></TouchableOpacity></View>
                                <Text style={styles.inputLabel}>Category</Text>
                                <View style={{height: 45, marginTop: 5}}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {[...(paymentType === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES), ...(paymentType === 'expense' ? budgetSettings.customCategories || [] : budgetSettings.customIncomeCategories || [])].map(cat => ( <TouchableOpacity key={cat} style={[styles.categoryButton, paymentCategory === cat && styles.categoryButtonActive]} onPress={() => setPaymentCategory(cat)}><Text style={[styles.categoryButtonText, paymentCategory === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity> ))}<TouchableOpacity style={styles.addCategoryButton} onPress={() => setSettingsVisible(true)}><Ionicons name="add" size={18} color={theme.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity>
                                    </ScrollView>
                                </View>
                                {showPicker && (<DateTimePicker value={paymentDate} mode={showPicker} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => {setShowPicker(null); if(date) setPaymentDate(date);}} />)}
                                <TouchableOpacity style={styles.addButton} onPress={handleAddScheduledPayment}>
                                    <Ionicons name="calendar-outline" size={22} color={styles.addButtonText.color} />
                                    <Text style={styles.addButtonText}>Schedule Item</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <TransactionHistory transactions={thisPeriodTransactions} onUpdateActual={handleUpdateActualAmount} theme={theme} styles={styles} period={budgetSettings.budgetPeriod} />
                </ScrollView>
                {isSettingsVisible && <SettingsPopup settings={budgetSettings} onClose={() => setSettingsVisible(false)} onUpdate={handleUpdateSettings} onDeleteScheduledPayment={handleDeleteScheduledPayment} theme={theme} styles={styles} />}
                {isSpendingVisible && <SpendingTrackerPopup visible={isSpendingVisible} onClose={() => setSpendingVisible(false)} transactions={transactions} settings={budgetSettings} theme={theme} styles={styles} />}
                {isHistoryVisible && <BudgetHistoryPopup visible={isHistoryVisible} onClose={() => setHistoryVisible(false)} transactions={transactions} settings={budgetSettings} theme={theme} styles={styles} />}
            </View>
        </KeyboardAvoidingView>
    );
}

// --- Sub-Components ---
function TransactionHistory({ transactions, onUpdateActual, theme, styles, period }) { const [filter, setFilter] = useState<HistoryFilter>('All'); const filterOptions = useMemo(() => { const expenseCategories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category)); return ['All', 'Income', 'Expense', ...Array.from(expenseCategories)]; }, [transactions]); const filteredTransactions = useMemo(() => { if (filter === 'All') return transactions; if (filter === 'Income') return transactions.filter(t => t.type === 'income'); if (filter === 'Expense') return transactions.filter(t => t.type === 'expense'); return transactions.filter(t => t.category === filter); }, [transactions, filter]); if (transactions.length === 0) { return ( <View style={styles.card}><Text style={styles.cardTitle}>This {period}'s Transactions</Text><View style={styles.emptyHistoryContainer}><Ionicons name="receipt-outline" size={48} color={theme.textSecondary} /><Text style={styles.emptyText}>No transactions for this period yet.</Text><Text style={styles.emptySubText}>Add one above to get started!</Text></View></View> ); } return ( <View style={styles.card}><Text style={styles.cardTitle}>This {period}'s Transactions</Text><View style={{ marginBottom: 15 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5 }}>{filterOptions.map(option => ( <TouchableOpacity key={option} style={[styles.filterButton, filter === option && styles.filterButtonActive]} onPress={() => setFilter(option)}><Text style={[styles.filterButtonText, filter === option && styles.filterButtonTextActive]}>{option}</Text></TouchableOpacity> ))}</ScrollView></View>{filteredTransactions.length > 0 ? filteredTransactions.map(t => ( <View key={t.id} style={styles.transactionRow}><View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}><View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Other }]} /><View><Text style={styles.transactionCategory}>{t.category}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>{t.isScheduled && <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />}<Text style={styles.transactionDate}>{new Date(t.date).toLocaleDateString()}</Text></View>{t.isVariable && t.actualAmount !== null && ( <Text style={[styles.budgetedText, {color: t.actualAmount <= t.budgetedAmount ? '#28A745' : '#E53E3E'}]}> (Budgeted: £{t.budgetedAmount.toFixed(2)}) </Text> )}</View></View><View style={{alignItems: 'flex-end'}}>{t.isVariable && t.actualAmount === null ? ( <TouchableOpacity style={styles.addActualButton} onPress={() => onUpdateActual(t.id)}><Text style={styles.addActualButtonText}>Log Actual</Text></TouchableOpacity> ) : ( <Text style={[styles.transactionAmount, { color: t.type === 'income' ? '#28A745' : theme.textPrimary }]}> {t.type === 'income' ? '+' : '-'}£{(t.actualAmount ?? t.budgetedAmount).toFixed(2)} </Text> )}</View></View> )) : <Text style={styles.emptyText}>No transactions match this filter.</Text>}</View> );}
function SpendingTrackerPopup({ onClose, transactions, settings, theme, styles }) { const dataForView = useMemo(() => { const now = new Date(); const currentPeriodKey = getPeriodKey(now, settings.budgetPeriod); return transactions.filter(t => getPeriodKey(new Date(t.date), settings.budgetPeriod) === currentPeriodKey); }, [transactions, settings.budgetPeriod]); const expenseBreakdownData = useMemo(() => { const expenses = dataForView.filter(t => t.type === 'expense' && (t.actualAmount !== null && t.actualAmount > 0)); const totalExpenses = expenses.reduce((sum, t) => sum + (t.actualAmount || 0), 0); if (totalExpenses === 0) return []; const categoryTotals = expenses.reduce((acc: Record<string, number>, { category, actualAmount }) => { acc[category] = (acc[category] || 0) + (actualAmount || 0); return acc; }, {}); return Object.entries(categoryTotals).map(([cat, amt]) => ({ category: cat, amount: amt, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other, percentage: amt / totalExpenses })).sort((a, b) => b.amount - a.amount); }, [dataForView]); return ( <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}><TouchableWithoutFeedback onPress={onClose}><View style={styles.modalBackdrop}><TouchableWithoutFeedback onPress={e => e.stopPropagation()}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Spending Tracker</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View><ScrollView><View style={styles.settingCard}><Text style={styles.cardTitle}>{settings.budgetPeriod} Finalised Expenses</Text>{expenseBreakdownData.length > 0 ? expenseBreakdownData.map(item => (<View key={item.category} style={styles.barChartRow}><View style={styles.barLabelContainer}><Text style={styles.barLabel} numberOfLines={1}>{item.category}</Text><Text style={styles.barAmount}>£{item.amount.toFixed(2)}</Text></View><View style={styles.barContainer}><View style={[styles.bar, { width: `${item.percentage * 100}%`, backgroundColor: item.color }]} /></View></View>)) : <Text style={styles.emptyText}>No finalized expenses for this period.</Text>}</View></ScrollView></View></TouchableWithoutFeedback></View></TouchableWithoutFeedback></Modal> );}
function BudgetHistoryPopup({ visible, onClose, transactions, settings, theme, styles }) { const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null); const historicalData = useMemo(() => { const now = new Date(); const currentPeriodKey = getPeriodKey(now, settings.budgetPeriod); const grouped = transactions.reduce((acc, t) => { const key = getPeriodKey(new Date(t.date), settings.budgetPeriod); if (key !== currentPeriodKey) { if (!acc[key]) acc[key] = []; acc[key].push(t); } return acc; }, {} as Record<string, Transaction[]>); return Object.entries(grouped).map(([key, periodTransactions]) => { const income = settings.incomeVaries ? periodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0) : parseFloat(settings.fixedIncome || '0') || 0; const expenses = periodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0); return { key, title: formatPeriodTitle(key, settings.budgetPeriod), transactions: periodTransactions, income, expenses, net: income - expenses, }; }).sort((a, b) => moment(b.key).valueOf() - moment(a.key).valueOf()); }, [transactions, settings]); return ( <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Budget History</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View><ScrollView>{historicalData.length > 0 ? historicalData.map(period => ( <View key={period.key} style={styles.historyCard}><TouchableOpacity onPress={() => setExpandedPeriod(expandedPeriod === period.key ? null : period.key)}><View style={styles.historySummary}><Text style={styles.historyTitle}>{period.title}</Text><Text style={[styles.historyNet, { color: period.net >= 0 ? '#28A745' : '#E53E3E' }]}>Net: £{period.net.toFixed(2)}</Text></View><View style={styles.historySummaryGrid}><Text style={styles.historyDetail}>Income: £{period.income.toFixed(2)}</Text><Text style={styles.historyDetail}>Expenses: £{period.expenses.toFixed(2)}</Text></View></TouchableOpacity>{expandedPeriod === period.key && ( <View style={styles.historyTransactions}>{period.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => ( <View key={t.id} style={styles.transactionRow}><View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}><View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Other }]} /><View><Text style={styles.transactionCategory}>{t.category}</Text><Text style={styles.transactionDate}>{new Date(t.date).toLocaleDateString()}</Text></View></View><Text style={[styles.transactionAmount, { color: t.type === 'income' ? '#28A745' : theme.textPrimary }]}>{t.type === 'income' ? '+' : '-'}£{(t.actualAmount ?? t.budgetedAmount).toFixed(2)}</Text></View> ))}</View> )}</View> )) : <Text style={styles.emptyText}>No previous budget history found.</Text>}</ScrollView></View></View></Modal> );}
function SettingsPopup({ settings, onClose, onUpdate, onDeleteScheduledPayment, theme, styles }) { return ( <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}><TouchableWithoutFeedback onPress={onClose}><View style={styles.modalBackdrop}><TouchableWithoutFeedback onPress={e => e.stopPropagation()}><View style={styles.modalContent}><ScrollView><View style={styles.modalHeader}><Text style={styles.modalTitle}>Settings</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View><View style={{ padding: 15 }}><View style={styles.settingCardInner}><Text style={styles.cardTitle}>Budget Period</Text><View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, settings.budgetPeriod === 'Weekly' && styles.typeButtonActive]} onPress={() => onUpdate({ ...settings, budgetPeriod: 'Weekly' })}><Text style={[styles.typeButtonText, settings.budgetPeriod === 'Weekly' && styles.typeButtonTextActive]}>Weekly</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, settings.budgetPeriod === 'Monthly' && styles.typeButtonActive]} onPress={() => onUpdate({ ...settings, budgetPeriod: 'Monthly' })}><Text style={[styles.typeButtonText, settings.budgetPeriod === 'Monthly' && styles.typeButtonTextActive]}>Monthly</Text></TouchableOpacity></View></View><View style={styles.settingCardInner}><Text style={styles.cardTitle}>Manage Scheduled Items</Text>{(settings.scheduledPayments || []).length > 0 ? (settings.scheduledPayments || []).map((p: ScheduledPayment) => ( <View key={p.id} style={styles.categoryManageRow}><View><Text style={[styles.categoryManageText, {color: p.type === 'income' ? '#28A745' : theme.textPrimary}]}>{p.name} (£{p.amount})</Text><Text style={styles.transactionDate}>{p.frequency === 'monthly' ? `Monthly on day ${new Date(p.date).getDate()}` : `One-time on ${new Date(p.date).toLocaleDateString()}`}</Text></View><TouchableOpacity onPress={() => onDeleteScheduledPayment(p.id)}><Ionicons name="trash-outline" size={22} color={'#E53E3E'} /></TouchableOpacity></View> )) : <Text style={styles.emptyText}>No scheduled payments yet.</Text>}</View></View><TouchableOpacity style={styles.saveButton} onPress={onClose}><Text style={styles.saveButtonText}>Done</Text></TouchableOpacity></ScrollView></View></TouchableWithoutFeedback></View></TouchableWithoutFeedback></Modal> );}

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
        collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
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
        settingCardInner: { backgroundColor: theme.surface, borderRadius: 12, padding: 15, marginBottom: 15 },
        checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 5 },
        checkboxLabel: { marginLeft: 10, fontSize: 16, color: theme.textPrimary },
        addButtonMini: { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 },
        categoryManageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
        categoryManageText: { fontSize: 16, color: theme.textPrimary },
        saveButton: { backgroundColor: theme.primary, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, margin: 15 },
        saveButtonText: { color: onPrimaryColor, fontSize: 18, fontWeight: 'bold' },
        transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
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
        historyCard: { backgroundColor: theme.surface, borderRadius: 12, marginHorizontal: 15, marginBottom: 10, padding: 15 },
        historySummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        historyTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary },
        historyNet: { fontSize: 16, fontWeight: 'bold' },
        historySummaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
        historyDetail: { fontSize: 14, color: theme.textSecondary },
        historyTransactions: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    });
};