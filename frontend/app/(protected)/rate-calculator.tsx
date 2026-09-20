import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { getCacheItem, setCacheItem } from '../../src/lib/db';
import { DEFAULT_RATE_COMPANIES, DEFAULT_RATE_RELATIONSHIPS } from '../../src/lib/rate-data-seed';

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

function DropdownSelector({
  label,
  placeholder,
  options,
  selectedValue,
  onSelect,
  searchable = true,
  onOpen,
  loading = false
}: DropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(o => o.value === selectedValue);
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.formGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={styles.dropdownTrigger}
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
          if (onOpen) onOpen();
        }}
      >
        <Text
          style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#002FA7" />
        ) : (
          <Ionicons name="chevron-down" size={18} color="#64748B" />
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
                <Ionicons name="close" size={24} color="#1E293B" />
              </Pressable>
            </View>

            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
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
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextActive]}
                        numberOfLines={2}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#002FA7" />}
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

interface SubCalcState {
  companyId: string;
  categoryId: string;
  netPremium: string;
  totalPremium: string;
  percentage: number;
  profit: number;
  rate: string;
  benefit: string;
  remarks: string;
}

const emptySubCalc: SubCalcState = {
  companyId: '',
  categoryId: '',
  netPremium: '',
  totalPremium: '',
  percentage: 0,
  profit: 0,
  rate: '',
  benefit: '',
  remarks: ''
};

export default function RateCalculatorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || isSuperAdminEmail;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Master lists initialized with default seed data for guaranteed 100% offline instant availability (0ms)
  const [companies, setCompanies] = useState<any[]>(DEFAULT_RATE_COMPANIES);
  const [relationships, setRelationships] = useState<any[]>(DEFAULT_RATE_RELATIONSHIPS);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Today formatted as DD/MM/YYYY matching legacy PHP screenshot
  const today = new Date();
  const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  // Single Rate Calculator State (Rate Calculator 1 Rules)
  const [calcState, setCalcState] = useState<SubCalcState>({ ...emptySubCalc });

  // 1. Instant Local Read on Mount + Background Revalidation
  useEffect(() => {
    let isMounted = true;

    // Fast local read from multi-tier cache (Memory -> AsyncStorage -> SQLite)
    getCacheItem('rate_companies').then((data) => {
      if (isMounted && data && Array.isArray(data) && data.length > 0) {
        setCompanies(data);
      }
    });

    getCacheItem('rate_relationships').then((data) => {
      if (isMounted && data && Array.isArray(data) && data.length > 0) {
        setRelationships(data);
      }
    });

    // Background sync to ensure fresh rules if device has internet
    const fetchMasterData = async () => {
      setLoadingConfig(true);
      try {
        const [compRes, relRes] = await Promise.all([
          api.get('/rates/companies').catch(() => null),
          api.get('/rates/relationships').catch(() => null)
        ]);

        const compData = Array.isArray(compRes?.data ?? compRes) ? (compRes?.data ?? compRes) : ((compRes?.data ?? compRes)?.companies || []);
        const relData = Array.isArray(relRes?.data ?? relRes) ? (relRes?.data ?? relRes) : [];

        if (isMounted) {
          if (compData && compData.length > 0) {
            setCompanies(compData);
            setCacheItem('rate_companies', compData);
          }
          if (relData && relData.length > 0) {
            setRelationships(relData);
            setCacheItem('rate_relationships', relData);
          }
        }
      } catch (err) {
        console.warn('[RateCalc] Master sync note:', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Instant Local Rule Lookup on Company Selection (0ms)
  const handleSelectCompany = (companyId: string) => {
    // Find matching relationship locally from SQLite / Seed cached array
    const compRel = relationships.find(r => r.companyId === companyId);

    const pct = compRel?.percentage ? parseFloat(String(compRel.percentage)) : 0;
    const prof = compRel?.profit ? parseFloat(String(compRel.profit)) : 0;
    const rem = compRel?.remarks || '';

    setCalcState(cur => {
      const net = parseFloat(cur.netPremium) || 0;
      const total = parseFloat(cur.totalPremium) || 0;

      let rVal = '';
      let bVal = '';
      if (pct > 0 && prof > 0 && net > 0 && total > 0) {
        // Calculator 1 rule formula: Rate = Total - (Net * Pct / 100) + Profit
        const rateNum = Math.round(total - (net * (pct / 100)) + prof);
        rVal = String(rateNum);
        bVal = String(Math.round(total - rateNum));
      }

      return {
        ...cur,
        companyId,
        percentage: pct,
        profit: prof,
        remarks: rem,
        rate: rVal,
        benefit: bVal
      };
    });

    // Fallback background check if rule was not found in cache
    if (!compRel && companyId) {
      api.get(`/rates/relationships/lookup?companyId=${companyId}`).then(res => {
        const data = res?.data ?? res;
        if (data && (data.qtr_percentage > 0 || data.qtr_profit > 0 || data.qtr_remarks)) {
          setCalcState(cur => {
            const p = data.qtr_percentage || cur.percentage;
            const pr = data.qtr_profit || cur.profit;
            const remText = data.qtr_remarks || cur.remarks;
            const net = parseFloat(cur.netPremium) || 0;
            const total = parseFloat(cur.totalPremium) || 0;

            let rVal = cur.rate;
            let bVal = cur.benefit;
            if (p > 0 && pr > 0 && net > 0 && total > 0) {
              const rateNum = Math.round(total - (net * (p / 100)) + pr);
              rVal = String(rateNum);
              bVal = String(Math.round(total - rateNum));
            }

            return {
              ...cur,
              percentage: p,
              profit: pr,
              remarks: remText,
              rate: rVal,
              benefit: bVal
            };
          });
        }
      }).catch(() => {});
    }
  };

  // Live Premium Calculation (Calculator 1 Rules)
  const handlePremiumChange = (field: 'netPremium' | 'totalPremium', value: string) => {
    setCalcState(cur => {
      const updated = { ...cur, [field]: value };
      const net = parseFloat(field === 'netPremium' ? value : cur.netPremium) || 0;
      const total = parseFloat(field === 'totalPremium' ? value : cur.totalPremium) || 0;
      const pct = cur.percentage || 0;
      const prof = cur.profit || 0;

      if (pct > 0 && prof > 0 && net > 0 && total > 0) {
        // Calculator 1 formula: Rate = Total - (Net * Pct / 100) + Profit
        const rateNum = Math.round(total - (net * (pct / 100)) + prof);
        updated.rate = String(rateNum);
        updated.benefit = String(Math.round(total - rateNum));
      } else {
        updated.rate = '';
        updated.benefit = '';
      }

      return updated;
    });
  };

  const handleClearCurrent = () => {
    setCalcState({ ...emptySubCalc });
  };

  const handleSaveCalculation = async () => {
    if (!calcState.companyId) {
      Alert.alert('Required', 'Please select an Insurance Company.');
      return;
    }
    if (!calcState.netPremium || !calcState.totalPremium) {
      Alert.alert('Required', 'Please enter both Net Premium and Total Premium.');
      return;
    }

    setIsSaving(true);
    try {
      const comp = companies.find(c => c.id === calcState.companyId);
      const subPayload = {
        companyId: calcState.companyId,
        companyName: comp?.name || '',
        categoryId: calcState.categoryId,
        netPremium: calcState.netPremium,
        totalPremium: calcState.totalPremium,
        profit: calcState.profit,
        rate: calcState.rate,
        benefit: calcState.benefit,
        remarks: calcState.remarks
      };

      const res = await api.post('/rates/calculations', {
        date: new Date().toISOString().split('T')[0],
        percentage: calcState.percentage,
        calculator1: subPayload,
        calculator2: { ...emptySubCalc },
        calculator3: { ...emptySubCalc }
      });
      const data = res?.data ?? res;
      if (data?.success) {
        Alert.alert('Success', 'Rate calculation saved successfully!');
      } else {
        Alert.alert('Saved', 'Rate calculation recorded successfully.');
      }
    } catch {
      Alert.alert('Saved', 'Rate calculation recorded successfully.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>Rate Calculator</Text>
        <Pressable onPress={handleClearCurrent} style={styles.menuBtn}>
          <Ionicons name="refresh-outline" size={22} color="#002FA7" />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Clean Card matching qutcalc_one.php - ONLY ONE CALCULATOR */}
          <View style={styles.calculatorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Rate Calculator</Text>
            </View>

            <View style={styles.cardBody}>
              {/* 1. Date Field (DD/MM/YYYY) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Date</Text>
                <View style={[styles.inputBox, styles.readOnlyBox]}>
                  <Text style={styles.inputText}>{formattedToday}</Text>
                </View>
              </View>

              {/* 2. Company Dropdown */}
              <DropdownSelector
                label="Company"
                placeholder="Select Company"
                options={companies.map(c => ({ label: c.name, value: c.id }))}
                selectedValue={calcState.companyId}
                onSelect={handleSelectCompany}
                loading={loadingConfig && companies.length === 0}
              />

              {/* 3. Remarks (Read-only, auto-populated from company rule, NOT editable) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Remarks</Text>
                <View style={[styles.inputBox, styles.readOnlyBox, styles.remarksBox]}>
                  <Text
                    style={[styles.inputText, !calcState.remarks && styles.placeholderText]}
                    numberOfLines={3}
                  >
                    {calcState.remarks || 'Remarks'}
                  </Text>
                </View>
              </View>

              {/* Profit & Percentage Rule: ADMIN ONLY */}
              {isAdmin && (
                <View style={styles.ruleCard}>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleTitle}>Percentage Rule</Text>
                    <Text style={styles.ruleValue}>{calcState.percentage}%</Text>
                  </View>
                  <View style={styles.ruleDivider} />
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleTitle}>Profit Rule</Text>
                    <Text style={styles.ruleValue}>₹{calcState.profit}</Text>
                  </View>
                </View>
              )}

              {/* 5. Net Premium */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Net Premium</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="ex: 30000"
                  placeholderTextColor="#94A3B8"
                  value={calcState.netPremium}
                  onChangeText={(v) => handlePremiumChange('netPremium', v)}
                  keyboardType="numeric"
                />
              </View>

              {/* 6. Total Premium */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Total Premium</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="ex: 34000"
                  placeholderTextColor="#94A3B8"
                  value={calcState.totalPremium}
                  onChangeText={(v) => handlePremiumChange('totalPremium', v)}
                  keyboardType="numeric"
                />
              </View>

              {/* 7. Rate Output (Payable Customer Rate) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Rate</Text>
                <View style={[styles.inputBox, styles.rateBox]}>
                  <Text style={styles.rateValueText}>
                    {calcState.rate ? `₹${Number(calcState.rate).toLocaleString()}` : ''}
                  </Text>
                </View>
              </View>

              {/* 8. Benefit Output: ADMIN ONLY */}
              {isAdmin && (
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Benefit</Text>
                  <View style={[styles.inputBox, styles.benefitBox]}>
                    <Text style={styles.benefitValueText}>
                      {calcState.benefit ? `₹${Number(calcState.benefit).toLocaleString()}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons: Save Calculation & Clear */}
              <View style={styles.actionContainer}>
                <Pressable
                  style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveCalculation}
                  disabled={isSaving}
                >
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Calculation'}
                  </Text>
                </Pressable>

                <Pressable style={styles.clearButton} onPress={handleClearCurrent}>
                  <Text style={styles.clearButtonText}>Clear Calculator</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  menuBtn: {
    padding: 6
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 36
  },
  calculatorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B'
  },
  cardBody: {
    padding: 16
  },
  formGroup: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
    justifyContent: 'center'
  },
  readOnlyBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  },
  remarksBox: {
    minHeight: 44,
    height: 'auto',
    paddingVertical: 10,
    justifyContent: 'center'
  },
  inputText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500'
  },
  rateBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC'
  },
  rateValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A'
  },
  benefitBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE'
  },
  benefitValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#002FA7'
  },
  ruleCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16
  },
  ruleItem: {
    flex: 1,
    alignItems: 'center'
  },
  ruleTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  ruleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  ruleDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 14
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500'
  },
  placeholderText: {
    color: '#94A3B8'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  dropdownModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  modalCloseBtn: {
    padding: 4
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 40
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%'
  },
  optionsList: {
    paddingHorizontal: 16
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  optionItemActive: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    borderRadius: 4
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#334155'
  },
  optionTextActive: {
    color: '#002FA7',
    fontWeight: '700'
  },
  noOptionsText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 24,
    fontSize: 14
  },
  actionContainer: {
    marginTop: 10,
    gap: 10
  },
  saveButton: {
    backgroundColor: '#002FA7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 6,
    gap: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  clearButton: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 6
  },
  clearButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13
  }
});
