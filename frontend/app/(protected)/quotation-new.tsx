import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getCacheItem, setCacheItem, getDB } from '../../src/lib/db';

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

export default function QuotationNewScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ lead_id: '', customer_name: '', vehicle_type: 'Car', vehicle_number: '', insurance_type: 'comprehensive', idv: '', ncb: '0%', coverage_details: 'Comprehensive' });
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Rate calculator lists
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const roleUpper = (typeof (currentUser?.role as any) === 'object' ? (currentUser?.role as any)?.name : currentUser?.role)?.toUpperCase() || '';
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || roleUpper === 'ADMIN';

  // Calculator State
  const [calcData, setCalcData] = useState({
    companyId: '',
    categoryId: '',
    netPremium: '',
    totalPremium: '',
    percentage: 0,
    profit: 0,
    rate: '',
    benefit: ''
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Fetch Leads list (SQLite first, then API)
  useEffect(() => {
    let isMounted = true;
    const fetchLeads = async () => {
      // 1. Try local SQLite leads table first (0ms)
      try {
        const db = await getDB();
        const localRows = await db.getAllAsync<any>('SELECT id, client_name as clientName, vehicle_no as vehicleNo, client_phone as clientPhone FROM local_leads LIMIT 100');
        if (isMounted && localRows && localRows.length > 0) {
          setLeads(localRows);
        }
      } catch (err) {}

      // 2. Fetch from API
      setLoadingLeads(true);
      try {
        const res = await api.get<any>('/leads');
        const apiLeads = res.leads || res || [];
        if (isMounted && Array.isArray(apiLeads) && apiLeads.length > 0) {
          setLeads(apiLeads);
        }
      } catch (err) {
        console.error('Failed to fetch leads:', err);
      } finally {
        if (isMounted) setLoadingLeads(false);
      }
    };
    fetchLeads();
    return () => { isMounted = false; };
  }, []);

  // Fetch Companies & Categories lists (SQLite first, then API)
  useEffect(() => {
    let isMounted = true;
    // 1. Instant SQLite read (0ms)
    getCacheItem('rate_companies').then(d => { if (isMounted && d?.length) setCompanies(d); });
    getCacheItem('rate_categories').then(d => { if (isMounted && d?.length) setCategories(d); });
    getCacheItem('rate_relationships').then(d => { if (isMounted && d?.length) setRelationships(d); });

    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const [compRes, catRes, relRes] = await Promise.all([
          api.get('/rates/companies'),
          api.get('/rates/categories'),
          api.get('/rates/relationships')
        ]);
        const compData = Array.isArray(compRes?.data ?? compRes) ? (compRes?.data ?? compRes) : ((compRes?.data ?? compRes)?.companies || []);
        const catData = Array.isArray(catRes?.data ?? catRes) ? (catRes?.data ?? catRes) : ((catRes?.data ?? catRes)?.categories || []);
        const relData = Array.isArray(relRes?.data ?? relRes) ? (relRes?.data ?? relRes) : [];

        if (isMounted) {
          if (compData.length > 0) {
            setCompanies(compData);
            setCacheItem('rate_companies', compData);
          }
          if (catData.length > 0) {
            setCategories(catData);
            setCacheItem('rate_categories', catData);
          }
          if (relData.length > 0) {
            setRelationships(relData);
            setCacheItem('rate_relationships', relData);
          }
        }
      } catch (err) {
        console.error('Failed to load companies/categories:', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };
    fetchConfig();
    return () => { isMounted = false; };
  }, []);

  // Instant Local Lookup rule details (0ms)
  useEffect(() => {
    if (calcData.companyId) {
      // 1. Check local relationships cache first (0ms)
      const compRel = relationships.find(
        r => r.companyId === calcData.companyId && (!calcData.categoryId || r.categoryId === calcData.categoryId)
      ) || relationships.find(r => r.companyId === calcData.companyId);

      if (compRel) {
        setCalcData(prev => ({
          ...prev,
          percentage: compRel.percentage ? parseFloat(String(compRel.percentage)) : 0,
          profit: compRel.profit ? parseFloat(String(compRel.profit)) : 0
        }));
        return;
      }

      // 2. Fallback to API lookup
      const lookupRelation = async () => {
        try {
          const catParam = calcData.categoryId ? `&categoryId=${calcData.categoryId}` : '';
          const res = await api.get(`/rates/relationships/lookup?companyId=${calcData.companyId}${catParam}`);
          const data = res?.data ?? res;
          setCalcData(prev => ({
            ...prev,
            percentage: data.qtr_percentage || 0,
            profit: data.qtr_profit || 0
          }));
        } catch (err) {
          console.error('Failed to lookup rate rules:', err);
        }
      };
      lookupRelation();
    } else {
      setCalcData(prev => ({
        ...prev,
        percentage: 0,
        profit: 0
      }));
    }
  }, [calcData.companyId, calcData.categoryId, relationships]);

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

  const submit = async () => {
    if (!form.lead_id) { Alert.alert('Error', 'Lead selection is compulsory'); return; }
    if (!calcData.rate) { Alert.alert('Error', 'Incomplete calculator inputs or invalid rate configurations.'); return; }
    setLoading(true);
    try {
      const selectedCompany = companies.find(c => c.id === calcData.companyId);
      const selectedCategory = categories.find(c => c.id === calcData.categoryId);

      await api.post('/quotations/', {
        amount: Number(calcData.rate) || 0,
        status: 'Draft',
        leadId: form.lead_id,
        rate: parseFloat(calcData.rate),
        benefit: parseFloat(calcData.benefit),
        companyId: calcData.companyId,
        categoryId: calcData.categoryId,
        netPremium: parseFloat(calcData.netPremium),
        totalPremium: parseFloat(calcData.totalPremium),
        percentage: calcData.percentage,
        profit: calcData.profit,
        details: {
          customer_name: form.customer_name,
          vehicle_type: form.vehicle_type,
          vehicle_number: form.vehicle_number,
          insurance_type: form.insurance_type,
          idv: Number(form.idv),
          ncb: form.ncb,
          coverage_details: form.coverage_details,
          companyName: selectedCompany?.name,
          categoryName: selectedCategory?.name,
          netPremium: parseFloat(calcData.netPremium),
          totalPremium: parseFloat(calcData.totalPremium),
          percentage: calcData.percentage,
          profit: calcData.profit,
          rate: parseFloat(calcData.rate),
          benefit: parseFloat(calcData.benefit)
        },
      });

      const selectedLead = leads.find(l => l.id === form.lead_id);
      Alert.alert(
        'Quotation Saved',
        'Vehicle quotation created successfully. Would you like to share it via WhatsApp?',
        [
          { text: 'Done', onPress: () => router.back() },
          {
            text: 'Share on WhatsApp',
            onPress: () => {
              const quoteText = `*TORQUE AUTO ADVISOR — INSURANCE QUOTATION*\n\n` +
                `Customer: ${form.customer_name || 'Customer'}\n` +
                `Vehicle No: ${form.vehicle_number || '-'}\n` +
                `Vehicle Type: ${form.vehicle_type}\n` +
                `Insurer: ${selectedCompany?.name || 'Torque Partner'}\n` +
                `IDV: ₹${Number(form.idv || 0).toLocaleString()}\n` +
                `Net Premium: ₹${Number(calcData.netPremium || 0).toLocaleString()}\n` +
                `Total Premium: ₹${Number(calcData.totalPremium || 0).toLocaleString()}\n\n` +
                `For instant renewal and claim support, contact your Torque Auto Advisor.`;

              const phone = (selectedLead?.clientPhone || selectedLead?.phone || '').replace(/\D/g, '');
              const target = phone.length === 10 ? `91${phone}` : phone;
              const url = target
                ? `whatsapp://send?phone=${target}&text=${encodeURIComponent(quoteText)}`
                : `whatsapp://send?text=${encodeURIComponent(quoteText)}`;

              Linking.openURL(url).catch(() => {
                Alert.alert('Notice', 'Could not open WhatsApp app.');
              }).finally(() => {
                router.back();
              });
            }
          }
        ]
      );
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.headerTitle}>New Quotation</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <DropdownSelector
            label="Select Lead *"
            placeholder="Choose a lead"
            options={leads.map(l => ({
              label: `${l.clientName || 'Unnamed'} (${l.vehicleNo || 'No vehicle'})`,
              value: l.id
            }))}
            selectedValue={form.lead_id}
            onSelect={(val) => {
              const selected = leads.find(l => l.id === val);
              if (selected) {
                setForm(p => ({
                  ...p,
                  lead_id: val,
                  customer_name: selected.clientName || '',
                  vehicle_number: selected.vehicleNo || ''
                }));
              }
            }}
            searchable
            loading={loadingLeads}
          />

          <Text style={styles.label}>CUSTOMER NAME *</Text>
          <TextInput testID="q-customer" style={[styles.input, { backgroundColor: '#F8FAFC' }]} placeholder="Customer name" placeholderTextColor={Colors.textLight} value={form.customer_name} editable={false} />
          
          <Text style={styles.label}>VEHICLE TYPE</Text>
          <View style={styles.chipRow}>
            {['Car', 'Two Wheeler', 'Truck', 'Commercial'].map(t => (
              <Pressable key={t} style={[styles.chip, form.vehicle_type === t && styles.chipActive]} onPress={() => update('vehicle_type', t)}>
                <Text style={[styles.chipText, form.vehicle_type === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          
          <Text style={styles.label}>VEHICLE NUMBER</Text>
          <TextInput style={[styles.input, { backgroundColor: '#F8FAFC' }]} placeholder="MH01AB1234" placeholderTextColor={Colors.textLight} value={form.vehicle_number} editable={false} autoCapitalize="characters" />
          
          <Text style={styles.label}>INSURANCE TYPE</Text>
          <View style={styles.chipRow}>
            {['comprehensive', 'third_party', 'commercial'].map(t => (
              <Pressable key={t} style={[styles.chip, form.insurance_type === t && styles.chipActive]} onPress={() => update('insurance_type', t)}>
                <Text style={[styles.chipText, form.insurance_type === t && styles.chipTextActive]}>{t.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>
          
          {/* Company & Category Selectors */}
          <DropdownSelector
            label="Company *"
            placeholder="Select Company"
            options={companies.map(c => ({ label: c.name, value: c.id }))}
            selectedValue={calcData.companyId}
            onSelect={(val) => setCalcData(prev => ({ ...prev, companyId: val }))}
            loading={loadingConfig}
          />

          <DropdownSelector
            label="Category *"
            placeholder="Select Category"
            options={categories.map(c => ({ label: c.name, value: c.id }))}
            selectedValue={calcData.categoryId}
            onSelect={(val) => setCalcData(prev => ({ ...prev, categoryId: val }))}
            loading={loadingConfig}
          />

          {calcData.companyId && calcData.categoryId && calcData.percentage === 0 && calcData.profit === 0 && (
            <View style={styles.alertBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
              <Text style={styles.alertText}>
                No active rate rule configured for this Company + Category.
              </Text>
            </View>
          )}

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

          <View style={styles.calcResultContainer}>
            <View style={styles.calcResultCol}>
              <Text style={styles.calcResultLabel}>Computed Rate</Text>
              <Text style={[styles.calcResultVal, styles.rateBg]}>
                {calcData.rate ? `₹${Number(calcData.rate).toLocaleString()}` : '--'}
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.calcResultCol}>
                <Text style={styles.calcResultLabel}>Profit / Benefit</Text>
                <Text style={[styles.calcResultVal, styles.benefitBg]}>
                  {calcData.benefit ? `₹${Number(calcData.benefit).toLocaleString()}` : '--'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.label}>IDV (₹)</Text>
          <TextInput style={styles.input} placeholder="Insured Declared Value" placeholderTextColor={Colors.textLight} value={form.idv} onChangeText={v => update('idv', v)} keyboardType="numeric" />
          
          <Text style={styles.label}>NCB %</Text>
          <View style={styles.chipRow}>
            {['0%', '20%', '25%', '35%', '45%', '50%'].map(t => (
              <Pressable key={t} style={[styles.chip, form.ncb === t && styles.chipActive]} onPress={() => update('ncb', t)}>
                <Text style={[styles.chipText, form.ncb === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <DropdownSelector
            label="Coverage Details"
            placeholder="Select Coverage"
            options={[
              { label: 'Comprehensive', value: 'Comprehensive' },
              { label: 'Third Party Only (TPO)', value: 'Third Party Only' },
              { label: 'Own Damage Only (OD)', value: 'Own Damage Only' },
              { label: 'Zero Depreciation', value: 'Zero Depreciation' }
            ]}
            selectedValue={form.coverage_details}
            onSelect={(val) => update('coverage_details', val)}
          />
          <View style={{ height: 20 }} />
        </ScrollView>
        <View style={styles.stickyFooter}>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Quotation'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text },
  textArea: { height: 80, paddingTop: Spacing.md, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  stickyFooter: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  dropdownField: {
    marginBottom: Spacing.md,
  },
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
});
