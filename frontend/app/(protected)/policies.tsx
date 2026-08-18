import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import DatePickerSelector from '../../src/components/DatePickerSelector';

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
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt.label}</Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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

export default function PoliciesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = user?.role?.toUpperCase() || '';
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');

  const { cache, setCache, loadCache } = useCacheStore();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);

  // Add Policy Form State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    policy_number: '',
    provider: '',
    type: 'Comprehensive',
    premium_amount: '',
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    lead_id: ''
  });

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<any>('/leads?limit=100');
      const leadsArr = Array.isArray(res) ? res : res.leads || res.items || [];
      setLeads(leadsArr);
      setCache('/leads', { items: leadsArr });
    } catch (err) {
      console.error('Error fetching leads in Policies:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      fetchLeads();
    }
  }, [addModalVisible]);

  useEffect(() => {
    loadCache().then(() => {
      const cachedPolicies = cache['/policies'];
      if (cachedPolicies && cachedPolicies.items) {
        setItems(cachedPolicies.items);
        setTotal(cachedPolicies.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      let policiesArr: any[] = [];

      try {
        const pData = await api.get<any[]>(`/policies${statusParam}`);
        if (Array.isArray(pData)) policiesArr = pData;
      } catch (apiErr) {
        console.warn('[Policies API error, falling back to Supabase DB]', apiErr);
      }

      // Supabase direct fallback
      if (policiesArr.length === 0) {
        let query = supabase
          .from('policies')
          .select('id, policyNumber, provider, type, premiumAmount, status, startDate, endDate, createdAt, lead:leads(id, clientName, clientPhone, vehicleNo, customFields, assignee:assignedTo(fullName))')
          .order('createdAt', { ascending: false })
          .limit(100);

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data: dbPolicies } = await query;
        if (dbPolicies) {
          policiesArr = dbPolicies.map((p: any) => {
            const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {};
            const sub = cf.policySubmission || {};
            return {
              ...p,
              salesPersonName: p.lead?.assignee?.fullName || 'Direct',
              clientPhone: p.lead?.clientPhone,
              compiledPdfUrl: sub.compiledPdfUrl || null,
              issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
            };
          });
        }
      }

      setItems(policiesArr);
      setTotal(policiesArr.length);
      setCache('/policies', { items: policiesArr });
    } catch (e) {
      console.error('[PoliciesScreen] Failed to load policies data', e);
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const previewPdf = async (url: string) => {
    if (!url) return;
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      Linking.openURL(url);
    }
  };

  const handleDownloadMonthlySheet = async () => {
    setDownloadingSheet(true);
    try {
      const res = await api.get<any>('/manager/monthly-sheet');
      if (res?.sheetUrl) {
        if (Platform.OS === 'web') {
          Linking.openURL(res.sheetUrl);
        } else {
          const fileUri = FileSystem.documentDirectory + (res.fileName || 'master_policies.xlsx');
          const download = await FileSystem.downloadAsync(res.sheetUrl, fileUri);
          if (download.uri) {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(download.uri);
            } else {
              Alert.alert('Downloaded', 'File saved successfully.');
            }
          }
        }
      } else {
        Alert.alert('No Data', 'No policies found for this period.');
      }
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not download master sheet.');
    } finally {
      setDownloadingSheet(false);
    }
  };

  const handleAddPolicy = async () => {
    if (!newPolicy.policy_number.trim() || !newPolicy.provider.trim() || !newPolicy.type.trim() || !newPolicy.premium_amount || !newPolicy.start_date || !newPolicy.end_date || !newPolicy.lead_id) {
      Alert.alert('Error', 'All fields marked with * are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/policies', {
        policy_number: newPolicy.policy_number.trim(),
        provider: newPolicy.provider.trim(),
        type: newPolicy.type.trim(),
        premium_amount: parseFloat(newPolicy.premium_amount),
        status: newPolicy.status,
        start_date: new Date(newPolicy.start_date).toISOString(),
        end_date: new Date(newPolicy.end_date).toISOString(),
        lead_id: newPolicy.lead_id || null
      });
      setAddModalVisible(false);
      setNewPolicy({ policy_number: '', provider: '', type: 'Comprehensive', premium_amount: '', status: 'Active', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0], lead_id: '' });
      Alert.alert('Success', 'Policy registered successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register policy');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.policyNumber?.toLowerCase().includes(q) ||
      item.lead?.clientName?.toLowerCase().includes(q) ||
      item.lead?.vehicleNo?.toLowerCase().includes(q) ||
      item.provider?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Policies</Text>
          <Text style={styles.subTitle}>{total} {total === 1 ? 'policy' : 'policies'}</Text>
        </View>
        <View style={styles.headerRight}>
          {isManagerOrAdmin && (
            <Pressable
              onPress={handleDownloadMonthlySheet}
              style={styles.downloadSheetBtn}
              disabled={downloadingSheet}
            >
              {downloadingSheet ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={Colors.primary} />
                  <Text style={styles.downloadSheetText}>Excel</Text>
                </>
              )}
            </Pressable>
          )}
          {isManagerOrAdmin && (
            <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInputField}
          placeholder="Search by policy no, vehicle, client..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {['all', 'Active', 'Expired', 'Lapsed'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList 
        data={filteredItems} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100, gap: Spacing.md }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No policies found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.active || StatusColors.pending;
          const pdfUrl = item.issuedPolicyPdfUrl || item.compiledPdfUrl;
          const expDateFormatted = item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN') : 'N/A';

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.lead?.clientName || 'Direct Policy'}</Text>
                  {item.lead?.vehicleNo && (
                    <View style={styles.vehPill}>
                      <Text style={styles.vehPillText}>{item.lead.vehicleNo}</Text>
                    </View>
                  )}
                  <Text style={styles.cardMeta}>#{item.policyNumber} · {item.provider} · {item.type}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.policyLabel}>Premium</Text>
                  <Text style={styles.policyValue}>₹{Number(item.premiumAmount || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View>
                  <Text style={styles.policyLabel}>Expiry Date</Text>
                  <Text style={styles.policyValue}>{expDateFormatted}</Text>
                </View>
                {item.salesPersonName && (
                  <View>
                    <Text style={styles.policyLabel}>Sales Person</Text>
                    <Text style={styles.policyValue}>{item.salesPersonName}</Text>
                  </View>
                )}
              </View>

              {pdfUrl && (
                <View style={styles.cardPdfRow}>
                  <Pressable
                    style={styles.cardPdfBtn}
                    onPress={() => previewPdf(pdfUrl)}
                  >
                    <Ionicons name="document-text-outline" size={15} color={Colors.primary} />
                    <Text style={styles.cardPdfBtnText}>View Issued Policy PDF</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Policy</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <DropdownSelector
                label="Link to Lead *"
                placeholder="Choose a lead to link"
                options={leads.map(l => ({
                  label: `${l.clientName} (${l.vehicleNo || 'No vehicle'})`,
                  value: l.id
                }))}
                selectedValue={newPolicy.lead_id}
                onSelect={(val) => setNewPolicy(prev => ({ ...prev, lead_id: val }))}
                searchable
                onOpen={fetchLeads}
                loading={loadingLeads}
              />

              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. POL-98765432"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.policy_number}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, policy_number: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PROVIDER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC Ergo, ICICI Lombard"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.provider}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, provider: val })}
                />
              </View>

              <DropdownSelector
                label="Policy Type *"
                placeholder="Select Type"
                options={[
                  { label: "Comprehensive", value: "Comprehensive" },
                  { label: "Third Party", value: "Third Party" },
                  { label: "Zero Depreciation", value: "Zero Depreciation" },
                  { label: "Own Damage Only", value: "Own Damage Only" }
                ]}
                selectedValue={newPolicy.type}
                onSelect={(val) => setNewPolicy(prev => ({ ...prev, type: val }))}
              />

              <View style={styles.field}>
                <Text style={styles.label}>PREMIUM AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newPolicy.premium_amount}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, premium_amount: val })}
                />
              </View>

              <DatePickerSelector
                label="Start Date *"
                value={newPolicy.start_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, start_date: val }))}
                placeholder="Select Start Date"
              />

              <DatePickerSelector
                label="End Date *"
                value={newPolicy.end_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, end_date: val }))}
                placeholder="Select End Date"
              />

              <Pressable style={styles.submitBtn} onPress={handleAddPolicy} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Register Policy</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md, minWidth: 32, alignItems: 'center' },
  countText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: '#FFFFFF' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.lg - 2, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  policyLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  policyValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  subTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500', marginTop: 1 },
  downloadSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.primary + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  downloadSheetText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    gap: Spacing.sm,
  },
  searchInputField: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  vehPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  vehPillText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardPdfRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  cardPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  cardPdfBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  hint: { fontSize: 10, color: Colors.textLight, marginTop: 4 },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
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
    paddingBottom: 20,
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
    backgroundColor: Colors.surfaceMuted,
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
    borderBottomColor: Colors.surfaceMuted,
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
