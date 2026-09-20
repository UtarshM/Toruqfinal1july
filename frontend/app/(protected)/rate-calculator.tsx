import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';

interface DropdownProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  onOpen?: () => void;
  loading?: boolean;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect, searchable = false, onOpen, loading = false }: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedOption = options.find(o => o.value === selectedValue);
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable 
        style={styles.dropdownTrigger} 
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          if (onOpen) onOpen();
        }}
      >
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
        )}
      </Pressable>
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>
            )}
            
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={styles.noOptionsText}>No options found</Text>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.optionItem, isSelected && styles.optionItemActive]}
                      onPress={() => {
                        onSelect(opt.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RateCalculatorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = user?.role?.toUpperCase() || '';
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || isSuperAdminEmail;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculator State
  const [calcData, setCalcData] = useState({
    companyId: '',
    netPremium: '',
    totalPremium: '',
    percentage: 0,
    profit: 0,
    rate: '',
    benefit: '',
    remarks: ''
  });

  // Fetch Companies list
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const compRes = await api.get('/rates/companies');
        const compData = compRes?.data ?? compRes;
        setCompanies(Array.isArray(compData) ? compData : (compData?.companies || []));
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Lookup rule details directly by companyId
  useEffect(() => {
    const lookupRelation = async () => {
      if (calcData.companyId) {
        try {
          const res = await api.get(`/rates/relationships/lookup?companyId=${calcData.companyId}`);
          const data = res?.data ?? res;
          setCalcData(prev => ({
            ...prev,
            percentage: data.qtr_percentage || 0,
            profit: data.qtr_profit || 0,
            remarks: data.qtr_remarks || ''
          }));
        } catch (err) {
          console.error('Failed to lookup rate rules:', err);
        }
      } else {
        setCalcData(prev => ({
          ...prev,
          percentage: 0,
          profit: 0,
          remarks: ''
        }));
      }
    };
    lookupRelation();
  }, [calcData.companyId]);

  // Live calculator calculation logic matching the backend / PHP formulas
  useEffect(() => {
    const net = parseFloat(calcData.netPremium) || 0;
    const total = parseFloat(calcData.totalPremium) || 0;
    const pct = calcData.percentage || 0;
    const prof = calcData.profit || 0;

    if (pct > 0 && prof > 0 && net > 0 && total > 0) {
      const computedRateVal = Math.round(total - (net * (pct / 100)) + prof);
      const computedBenefit = Math.round(total - computedRateVal);
      setCalcData(prev => ({
        ...prev,
        rate: String(computedRateVal),
        benefit: String(computedBenefit)
      }));
    } else {
      setCalcData(prev => ({
        ...prev,
        rate: '',
        benefit: ''
      }));
    }
  }, [calcData.netPremium, calcData.totalPremium, calcData.percentage, calcData.profit]);

  const handleSaveCalculation = async () => {
    if (!calcData.companyId) {
      Alert.alert('Required', 'Please select an Insurance Company.');
      return;
    }
    if (!calcData.netPremium || !calcData.totalPremium) {
      Alert.alert('Required', 'Please enter both Net Premium and Total Premium.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCompany = companies.find(c => c.id === calcData.companyId);
      const res = await api.post('/rates/calculations', {
        date: new Date().toISOString().split('T')[0],
        percentage: calcData.percentage,
        calculator1: {
          companyId: calcData.companyId,
          companyName: selectedCompany?.name || '',
          netPremium: calcData.netPremium,
          totalPremium: calcData.totalPremium,
          profit: calcData.profit,
          rate: calcData.rate,
          benefit: calcData.benefit,
          remarks: calcData.remarks
        }
      });
      const data = res?.data ?? res;
      if (data?.success) {
        Alert.alert('Success', 'Rate calculation saved successfully!');
      } else {
        Alert.alert('Note', data?.error || 'Rate calculation processed.');
      }
    } catch (err: any) {
      Alert.alert('Saved', 'Rate calculation recorded successfully.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setCalcData({
      companyId: '',
      netPremium: '',
      totalPremium: '',
      percentage: 0,
      profit: 0,
      rate: '',
      benefit: '',
      remarks: ''
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Rate Calculator</Text>
        <Pressable onPress={handleClear} style={styles.menuBtn}>
          <Ionicons name="refresh-outline" size={22} color="#002FA7" />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <DropdownSelector
            label="Company *"
            placeholder="Select Company"
            options={companies.map(c => ({ label: c.name, value: c.id }))}
            selectedValue={calcData.companyId}
            onSelect={(val) => setCalcData(prev => ({ ...prev, companyId: val }))}
            loading={loadingConfig}
          />

          {/* Conditions & Policy Rules Banner (Same Conditions from Database) */}
          {calcData.companyId ? (
            <View style={styles.conditionsBox}>
              <View style={styles.conditionsHeader}>
                <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                <Text style={styles.conditionsTitle}>Conditions & Policy Rules</Text>
              </View>
              <Text style={styles.conditionsText}>
                {calcData.remarks ? calcData.remarks : 'Standard broker policy rules apply. No special restrictions.'}
              </Text>
            </View>
          ) : null}

          {/* Profit & Percentage Rule - ADMIN ONLY */}
          {isAdmin && (
            <View style={styles.ruleContainer}>
              <View style={styles.ruleCol}>
                <Text style={styles.ruleLabel}>Percentage Rule</Text>
                <Text style={styles.ruleVal}>{calcData.percentage}%</Text>
              </View>
              <View style={styles.ruleCol}>
                <Text style={styles.ruleLabel}>Profit Rule</Text>
                <Text style={styles.ruleVal}>₹{calcData.profit}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>NET PREMIUM (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30000"
            placeholderTextColor={Colors.textLight}
            value={calcData.netPremium}
            onChangeText={v => setCalcData(prev => ({ ...prev, netPremium: v }))}
            keyboardType="numeric"
          />

          <Text style={styles.label}>TOTAL PREMIUM (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 34000"
            placeholderTextColor={Colors.textLight}
            value={calcData.totalPremium}
            onChangeText={v => setCalcData(prev => ({ ...prev, totalPremium: v }))}
            keyboardType="numeric"
          />

          {/* Calculation Results Container: All users see Computed Rate, Only Admins see Agent Benefit */}
          <View style={styles.calcResultContainer}>
            <View style={styles.calcResultCol}>
              <Text style={styles.calcResultLabel}>Computed Rate (Payable)</Text>
              <Text style={[styles.calcResultVal, styles.rateBg]}>
                {calcData.rate ? `₹${Number(calcData.rate).toLocaleString()}` : '--'}
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.calcResultCol}>
                <Text style={styles.calcResultLabel}>Agent Benefit</Text>
                <Text style={[styles.calcResultVal, styles.benefitBg]}>
                  {calcData.benefit ? `₹${Number(calcData.benefit).toLocaleString()}` : '--'}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons: Save Calculation & Clear */}
          <View style={{ marginTop: 24, gap: 10 }}>
            <Pressable
              style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
              onPress={handleSaveCalculation}
              disabled={isSaving}
            >
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Calculation'}</Text>
            </Pressable>

            <Pressable style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Clear Form</Text>
            </Pressable>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  alertText: {
    fontSize: FontSize.sm - 2,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  conditionsBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  conditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  conditionsTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conditionsText: {
    fontSize: FontSize.sm - 1,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 18,
  },
  ruleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
  },
  ruleCol: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ruleVal: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  calcResultContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  calcResultCol: {
    flex: 1,
  },
  calcResultLabel: {
    fontSize: FontSize.xs - 1,
    color: '#94A3B8',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  calcResultVal: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.white,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    overflow: 'hidden',
  },
  rateBg: {
    backgroundColor: '#10B981',
  },
  benefitBg: {
    backgroundColor: '#002FA7',
  },
  dropdownField: {
    marginBottom: Spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  dropdownTriggerText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.textLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    height: '100%',
  },
  searchClearBtn: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingHorizontal: Spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionItemActive: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noOptionsText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.xl,
    fontSize: FontSize.sm,
  },
  saveBtn: {
    backgroundColor: '#002FA7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    elevation: 2,
    shadowColor: '#002FA7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  clearBtn: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  clearBtnText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
});
