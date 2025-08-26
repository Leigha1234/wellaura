import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ScheduledPayment } from '../../types';

// --- CONSTANTS ---
const DEFAULT_EXPENSE_CATEGORIES = ["Food", "Shopping", "Transport", "Housing", "Utilities", "Entertainment"];
const DEFAULT_INCOME_CATEGORIES = ["Salary"];

// UPDATED: This component now receives functions to handle adding/deleting payments directly.
export default function BudgetSettingsPopup({ settings, onClose, onUpdate, onAddScheduledPayment, onDeleteScheduledPayment, theme, styles }) {
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
        if (!availableCategories.includes(paymentCategory)) {
            setPaymentCategory('');
        }
    }, [paymentType, availableCategories, paymentCategory]);

    const handleAddNewCategory = () => {
        const type = paymentType;
        const existing = availableCategories.map(c => c.toLowerCase());
        Alert.prompt(
            `New ${type === 'income' ? 'Income' : 'Expense'} Category`,
            'Enter the name for the new category.',
            [{ text: "Cancel", style: "cancel" }, { text: "Add", onPress: (newCategoryName) => {
                if (!newCategoryName || newCategoryName.trim() === '') return;
                const trimmedName = newCategoryName.trim();
                if (existing.includes(trimmedName.toLowerCase())) {
                    Alert.alert("Duplicate", `The category "${trimmedName}" already exists.`);
                    return;
                }
                if (type === 'expense') {
                    onUpdate({ ...settings, customCategories: [...(settings.customCategories || []), trimmedName] });
                } else {
                    onUpdate({ ...settings, customIncomeCategories: [...(settings.customIncomeCategories || []), trimmedName] });
                }
                setPaymentCategory(trimmedName);
            }}],
            'plain-text'
        );
    };
    
    const handleAddPayment = () => {
        if (!paymentName || !paymentAmount || !paymentCategory) {
            Alert.alert("Missing Info", "Please fill out all fields.");
            return;
        }
        const newPayment = {
            name: paymentName,
            amount: parseFloat(paymentAmount),
            date: paymentDate,
            category: paymentCategory,
            type: paymentType,
            frequency: paymentFrequency,
        };
        onAddScheduledPayment(newPayment); // Call the function passed from the parent
        // Reset form
        setPaymentName('');
        setPaymentAmount('');
        setPaymentDate(new Date());
        setPaymentCategory('');
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || paymentDate;
        setShowPicker(null);
        setPaymentDate(currentDate);
    };

    return (
        <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalBackdrop}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Settings</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close-circle" size={30} color={theme.primary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ flex: 1 }}>
                                <View style={styles.settingCardInner}>
                                    <Text style={styles.cardTitle}>Budget Period</Text>
                                    <View style={styles.typeSelector}>
                                        <TouchableOpacity style={[styles.typeButton, settings.budgetPeriod === 'Weekly' && styles.typeButtonActive]} onPress={() => onUpdate({ ...settings, budgetPeriod: 'Weekly' })}>
                                            <Text style={[styles.typeButtonText, settings.budgetPeriod === 'Weekly' && styles.typeButtonTextActive]}>Weekly</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.typeButton, settings.budgetPeriod === 'Monthly' && styles.typeButtonActive]} onPress={() => onUpdate({ ...settings, budgetPeriod: 'Monthly' })}>
                                            <Text style={[styles.typeButtonText, settings.budgetPeriod === 'Monthly' && styles.typeButtonTextActive]}>Monthly</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.settingCardInner}>
                                    <Text style={styles.cardTitle}>Scheduled Items</Text>
                                    {(settings.scheduledPayments || []).map((p: ScheduledPayment) => (
                                        <View key={p.id} style={styles.categoryManageRow}>
                                            <View>
                                                <Text style={[styles.categoryManageText, {color: p.type === 'income' ? '#28A745' : theme.textPrimary}]}>{p.name} (£{p.amount})</Text>
                                                <Text style={styles.transactionDate}>{p.frequency === 'monthly' ? `Monthly on day ${new Date(p.date).getDate()}` : `One-time on ${new Date(p.date).toLocaleDateString()}`}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => onDeleteScheduledPayment(p.id)}>
                                                <Ionicons name="trash-outline" size={22} color={'#E53E3E'} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <View style={{ paddingTop: 15, marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border }}>
                                        <Text style={[styles.inputLabel, {marginTop: 0}]}>Add New Scheduled Item</Text>
                                        <View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentType === 'expense' && styles.typeButtonActive]} onPress={() => setPaymentType('expense')}><Text style={[styles.typeButtonText, paymentType === 'expense' && styles.typeButtonTextActive]}>Expense</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentType === 'income' && styles.typeButtonActive]} onPress={() => setPaymentType('income')}><Text style={[styles.typeButtonText, paymentType === 'income' && styles.typeButtonTextActive]}>Income</Text></TouchableOpacity></View>
                                        <TextInput style={styles.input} placeholder="Name (e.g. Rent, Salary)" value={paymentName} onChangeText={setPaymentName} />
                                        <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Amount (£)" keyboardType="numeric" value={paymentAmount} onChangeText={setPaymentAmount} />
                                        <Text style={styles.inputLabel}>Date & Time</Text>
                                        <View style={styles.dateContainer}><TouchableOpacity onPress={() => setShowPicker('date')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPicker('time')}><Text style={styles.dateText}>{new Date(paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity></View>
                                        <Text style={styles.inputLabel}>Frequency</Text>
                                        <View style={styles.typeSelector}><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'one-time' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('one-time')}><Text style={[styles.typeButtonText, paymentFrequency === 'one-time' && styles.typeButtonTextActive]}>One-Time</Text></TouchableOpacity><TouchableOpacity style={[styles.typeButton, paymentFrequency === 'monthly' && styles.typeButtonActive]} onPress={() => setPaymentFrequency('monthly')}><Text style={[styles.typeButtonText, paymentFrequency === 'monthly' && styles.typeButtonTextActive]}>Monthly</Text></TouchableOpacity></View>
                                        <Text style={styles.inputLabel}>Category</Text>
                                        <View style={{height: 45, marginTop: 5}}>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{availableCategories.map(cat => ( <TouchableOpacity key={cat} style={[styles.categoryButton, paymentCategory === cat && styles.categoryButtonActive]} onPress={() => setPaymentCategory(cat)}><Text style={[styles.categoryButtonText, category === cat && styles.categoryButtonTextActive]}>{cat}</Text></TouchableOpacity> ))}<TouchableOpacity style={styles.addCategoryButton} onPress={handleAddNewCategory}><Ionicons name="add" size={18} color={theme.primary} /><Text style={styles.addCategoryButtonText}>Add New</Text></TouchableOpacity></ScrollView>
                                        </View>
                                        {showPicker && (<DateTimePicker value={paymentDate} mode={showPicker} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />)}
                                        <TouchableOpacity style={[styles.addButtonMini, {alignSelf: 'center', marginTop: 15}]} onPress={handleAddPayment}>
                                            <Text style={styles.addButtonText}>Add Scheduled Item</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                            <TouchableOpacity style={styles.saveButton} onPress={onClose}>
                                <Text style={styles.saveButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}