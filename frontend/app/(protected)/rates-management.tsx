import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { getCacheItem, setCacheItem } from '../../src/lib/db';
import { DEFAULT_RATE_COMPANIES, DEFAULT_RATE_RELATIONSHIPS } from '../../src/lib/rate-data-seed';

interface DropdownSelectorProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (val: string) => void;
}

function DropdownSelector({ label, placeholder, options, selectedValue, onSelect }: DropdownSelectorProps) {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find(o => o.value === selectedValue);

  const filteredOptions = searchQuery.trim()
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : options;

  return (
    <View style={styles.dropdownField}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable style={styles.dropdownTrigger} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownTriggerText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {options.length > 5 && (
              <View style={styles.searchBox}>
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
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </Pressable>
                )}
              </View>
            )}

            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <Text style={styles.noResultsText}>No matching options found</Text>
              ) : (
                filteredOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionItem, opt.value === selectedValue && styles.optionItemActive]}
                    onPress={() => {
                      onSelect(opt.value);
                      setVisible(false);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={[styles.optionText, opt.value === selectedValue && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    {opt.value === selectedValue && (
                      <Ionicons name="checkmark" size={18} color="#DC2626" />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RatesManagementScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'companies'>('rules');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize with seed data for instant 0ms rendering
  const [companies, setCompanies] = useState<any[]>(DEFAULT_RATE_COMPANIES);
  const [categories, setCategories] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>(DEFAULT_RATE_RELATIONSHIPS);

  // Input states
  const [companyName, setCompanyName] = useState('');
  const [ruleForm, setRuleForm] = useState({
    id: '',
    companyId: '',
    categoryId: '',
    percentage: '',
    profit: '',
    remarks: '',
    status: '1'
  });

  const loadData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);

    // 1. Fast cache check from local SQLite storage
    try {
      const [cachedComps, cachedRels] = await Promise.all([
        getCacheItem('rate_companies'),
        getCacheItem('rate_relationships')
      ]);
      if (Array.isArray(cachedComps) && cachedComps.length > 0) {
        setCompanies(cachedComps);
      }
      if (Array.isArray(cachedRels) && cachedRels.length > 0) {
        setRules(cachedRels);
      }
    } catch (e) {
      console.warn('[QuotationRelationship] Cache read note:', e);
    }

    // 2. Resilient live API fetch in background
    try {
      const [compRes, relRes, catRes] = await Promise.all([
        api.get('/rates/companies').catch((err) => {
          console.warn('[QuotationRelationship] Companies fetch notice:', err?.message || err);
          return null;
        }),
        api.get('/rates/relationships').catch((err) => {
          console.warn('[QuotationRelationship] Relationships fetch notice:', err?.message || err);
          return null;
        }),
        api.get('/rates/categories').catch(() => null)
      ]);

      const rawComps = Array.isArray(compRes?.data ?? compRes)
        ? (compRes?.data ?? compRes)
        : ((compRes?.data ?? compRes)?.companies || []);
      const rawRels = Array.isArray(relRes?.data ?? relRes)
        ? (relRes?.data ?? relRes)
        : [];
      const rawCats = Array.isArray(catRes?.data ?? catRes)
        ? (catRes?.data ?? catRes)
        : [];

      if (rawComps && rawComps.length > 0) {
        setCompanies(rawComps);
        await setCacheItem('rate_companies', rawComps);
      }

      if (rawRels && rawRels.length > 0) {
        setRules(rawRels);
        await setCacheItem('rate_relationships', rawRels);
      }

      if (rawCats && rawCats.length > 0) {
        setCategories(rawCats);
      }
    } catch (err: any) {
      console.warn('[QuotationRelationship] Background sync note:', err?.message || err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Companies CRUD
  const handleAddCompany = async () => {
    if (!companyName.trim()) {
      Alert.alert('Validation', 'Please enter a company name.');
      return;
    }
    try {
      const trimmed = companyName.trim();
      const res = await api.post('/rates/companies', { name: trimmed });
      setCompanyName('');
      Alert.alert('Success', 'Company added successfully!');
      
      // Optimistic local add
      const newComp = res || { id: `temp-${Date.now()}`, name: trimmed, status: 1 };
      setCompanies(prev => [newComp, ...prev]);
      loadData(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add company');
    }
  };

  const handleToggleCompany = async (id: string, currentStatus: number) => {
    try {
      const nextStatus = currentStatus === 1 ? 2 : 1;
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
      await api.patch(`/rates/companies/${id}`, { status: nextStatus });
      loadData(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
      loadData(false);
    }
  };

  // Rules CRUD
  const handleSaveRule = async () => {
    const { id, companyId, categoryId, percentage, profit, remarks, status } = ruleForm;
    if (!companyId || percentage === '' || profit === '') {
      Alert.alert('Validation Error', 'Please select a company, and enter percentage and profit.');
      return;
    }

    const pct = parseFloat(percentage);
    const prof = parseFloat(profit);

    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Validation Error', 'Percentage must be between 0 and 100.');
      return;
    }

    if (isNaN(prof) || prof < 0) {
      Alert.alert('Validation Error', 'Profit must be a valid positive amount.');
      return;
    }

    // Default category fallback to satisfy schema constraint if categories are bypassed
    const defaultCategoryId = categoryId || categories[0]?.id || '5314f6a8-adf6-455f-a006-c4e1067908f2';

    try {
      const body = {
        companyId,
        categoryId: defaultCategoryId,
        percentage: pct,
        profit: prof,
        remarks: remarks?.trim() || null,
        status: parseInt(status, 10) || 1
      };

      if (id) {
        await api.patch(`/rates/relationships/${id}`, body);
        Alert.alert('Success', 'Quotation relationship updated successfully!');
      } else {
        await api.post('/rates/relationships', body);
        Alert.alert('Success', 'Quotation relationship created successfully!');
      }

      setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' });
      loadData(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save quotation relationship');
    }
  };

  const handleDeleteRule = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this quotation relationship?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setRules(prev => prev.filter(r => r.id !== id));
            await api.delete(`/rates/relationships/${id}`);
            loadData(false);
          } catch (err: any) {
            Alert.alert('Error', 'Failed to delete rule.');
            loadData(false);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Quotation Relationship</Text>
        <Pressable onPress={() => loadData(true)} style={styles.refreshBtn}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Ionicons name="refresh" size={22} color={Colors.text} />
          )}
        </Pressable>
      </View>

      {/* Navigation Tabs - Red Pill Design matching Image 3 */}
      <View style={styles.tabBar}>
        {[
          { id: 'rules', label: 'Quotation Relationship' },
          { id: 'companies', label: 'Companies' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={['#DC2626']}
            tintColor="#DC2626"
          />
        }
      >
        {/* Quotation Relationships Tab */}
        {activeTab === 'rules' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>
              {ruleForm.id ? 'Edit Quotation Relationship' : 'New Quotation Relationship'}
            </Text>

            <DropdownSelector
              label="Company"
              placeholder="Select Company"
              options={companies.map(c => ({ label: c.name, value: c.id }))}
              selectedValue={ruleForm.companyId}
              onSelect={(val) => {
                setRuleForm(prev => ({
                  ...prev,
                  companyId: val
                }));
              }}
            />

            <Text style={styles.label}>PERCENTAGE (PAYOUT %)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15"
              placeholderTextColor={Colors.textLight}
              value={ruleForm.percentage}
              onChangeText={(val) => setRuleForm({ ...ruleForm, percentage: val })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>PROFIT (IN RUPEES ₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2000"
              placeholderTextColor={Colors.textLight}
              value={ruleForm.profit}
              onChangeText={(val) => setRuleForm({ ...ruleForm, profit: val })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>REMARKS / CONDITIONS (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="e.g. TATA & AL DISCOUNT 90%..."
              placeholderTextColor={Colors.textLight}
              value={ruleForm.remarks}
              onChangeText={(val) => setRuleForm({ ...ruleForm, remarks: val })}
              multiline
            />

            <DropdownSelector
              label="Status"
              placeholder="Choose status"
              options={[
                { label: 'Active', value: '1' },
                { label: 'Inactive', value: '2' }
              ]}
              selectedValue={ruleForm.status}
              onSelect={(val) => setRuleForm({ ...ruleForm, status: val })}
            />

            <View style={styles.btnRow}>
              <Pressable style={styles.saveBtn} onPress={handleSaveRule}>
                <Text style={styles.saveBtnText}>
                  {ruleForm.id ? 'Update Relationship' : 'Save Relationship'}
                </Text>
              </Pressable>
              {ruleForm.id ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Configured Relationships</Text>
              <Text style={styles.countBadge}>{rules.length}</Text>
            </View>

            {rules.length === 0 ? (
              <Text style={styles.emptyText}>No quotation relationships configured yet.</Text>
            ) : (
              rules.map((item) => {
                const compName = item.company?.name || item.companyName || companies.find(c => c.id === item.companyId)?.name || 'Unknown Company';
                const pct = item.percentage !== undefined ? parseFloat(item.percentage) : 0;
                const prof = item.profit !== undefined ? parseFloat(item.profit) : 0;

                return (
                  <View key={item.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{compName}</Text>
                      <Text style={styles.cardDetails}>
                        Payout: <Text style={styles.boldRed}>{pct}%</Text>  ·  Profit: <Text style={styles.boldGreen}>₹{prof.toLocaleString('en-IN')}</Text>
                      </Text>
                      {item.remarks ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {item.remarks}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.actions}>
                      <Pressable
                        style={styles.actionIcon}
                        onPress={() => setRuleForm({
                          id: item.id,
                          companyId: item.companyId,
                          categoryId: item.categoryId || '',
                          percentage: String(item.percentage ?? ''),
                          profit: String(item.profit ?? ''),
                          remarks: item.remarks || '',
                          status: String(item.status ?? '1')
                        })}
                      >
                        <Ionicons name="create-outline" size={18} color="#2563EB" />
                      </Pressable>
                      <Pressable style={styles.actionIcon} onPress={() => handleDeleteRule(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Companies CRUD Tab */}
        {activeTab === 'companies' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Add Insurance Company</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC ERGO GENERAL INSURANCE"
              placeholderTextColor={Colors.textLight}
              value={companyName}
              onChangeText={setCompanyName}
            />
            <Pressable style={[styles.saveBtn, { marginTop: Spacing.md }]} onPress={handleAddCompany}>
              <Text style={styles.saveBtnText}>Add Company</Text>
            </Pressable>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Insurance Companies</Text>
              <Text style={styles.countBadge}>{companies.length}</Text>
            </View>

            {companies.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={[styles.statusText, { color: item.status === 1 ? Colors.success : Colors.textMuted }]}>
                    {item.status === 1 ? '● Active' : '○ Inactive'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.toggleBtn, { backgroundColor: item.status === 1 ? '#FEE2E2' : '#DCFCE7' }]}
                  onPress={() => handleToggleCompany(item.id, item.status)}
                >
                  <Text style={[styles.toggleBtnText, { color: item.status === 1 ? '#DC2626' : '#16A34A' }]}>
                    {item.status === 1 ? 'Disable' : 'Enable'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  menuBtn: { padding: Spacing.xs },
  refreshBtn: { padding: Spacing.xs, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },

  // Navigation Tab Bar matching Image 3 red pill design
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#DC2626', // Solid vivid red pill from Image 3
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  sectionHeading: { fontSize: FontSize.md, fontWeight: '800', color: '#1E293B' },
  countBadge: {
    backgroundColor: '#E2E8F0',
    color: '#475569',
    fontSize: FontSize.xs,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: FontSize.md,
    color: '#0F172A',
  },
  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  saveBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '800' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#64748B', fontSize: FontSize.md, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', paddingVertical: Spacing.xl, fontSize: FontSize.sm, fontStyle: 'italic' },
  
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: { fontSize: FontSize.md - 1, fontWeight: '800', color: '#0F172A' },
  cardDesc: { fontSize: FontSize.xs, color: '#64748B', marginTop: 4, lineHeight: 16 },
  cardDetails: { fontSize: FontSize.xs + 1, color: '#334155', fontWeight: '600', marginTop: 4 },
  boldRed: { color: '#DC2626', fontWeight: '800' },
  boldGreen: { color: '#16A34A', fontWeight: '800' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.sm },
  actionIcon: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.sm },
  toggleBtnText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  // Dropdown style
  dropdownField: { marginBottom: Spacing.xs },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    height: 48,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  dropdownTriggerText: { fontSize: FontSize.md, color: '#0F172A', fontWeight: '500', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dropdownModalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: '#0F172A' },
  modalCloseBtn: { padding: Spacing.xs },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: '#0F172A' },
  optionsList: { paddingHorizontal: Spacing.lg },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionItemActive: { backgroundColor: '#FEE2E2', paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  optionText: { fontSize: FontSize.md, color: '#0F172A', flex: 1 },
  optionTextActive: { color: '#DC2626', fontWeight: '700' },
  noResultsText: { textAlign: 'center', color: '#94A3B8', paddingVertical: Spacing.xl },
});
