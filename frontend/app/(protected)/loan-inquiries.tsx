import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';

const STATUS_OPTIONS = [
  'ONLY INQUIRY',
  'TRIED BUT NOT DONE',
  'COMPLETED',
  'REJECT'
];

const CATEGORY_OPTIONS = [
  'PRIVATE USED',
  'COMMERCIAL',
  'TWO WHEELER',
  'NEW CAR',
  'USED CAR',
  'REFINANCE',
  'PERSONAL LOAN'
];

export default function LoanInquiriesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    onlyInquiry: 0,
    triedNotDone: 0,
    completed: 0,
    reject: 0,
    totalSanctioned: 0,
    totalPayout: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialForm = {
    inwardDate: new Date().toISOString().split('T')[0],
    customerName: '',
    mobileNo: '',
    vehicleNumber: '',
    category: 'PRIVATE USED',
    leadBy: '',
    requiredAmount: '',
    status: 'ONLY INQUIRY',
    reasonForNotDone: '',
    bankNbfc: '',
    sanctionedAmount: '',
    disbursedDate: '',
    noOfDays: '',
    payoutPercent: '',
    payoutAmount: '',
    remarksIfAny: ''
  };

  const [form, setForm] = useState(initialForm);

  const loadData = useCallback(async () => {
    try {
      let url = `/finance/loans/inquiries?status=${encodeURIComponent(statusFilter)}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const data = await api.get<any>(url);
      setItems(data.inquiries || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (e: any) {
      console.error('[LoanInquiriesScreen] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateFormField = (field: string, val: string) => {
    const next = { ...form, [field]: val };

    // Auto-calculate days
    if ((field === 'inwardDate' || field === 'disbursedDate') && next.inwardDate && next.disbursedDate) {
      const d1 = new Date(next.inwardDate);
      const d2 = new Date(next.disbursedDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diff = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
        next.noOfDays = String(diff);
      }
    }

    // Auto-calculate payout
    if ((field === 'sanctionedAmount' || field === 'payoutPercent') && next.sanctionedAmount && next.payoutPercent) {
      const sAmt = parseFloat(next.sanctionedAmount);
      const pPct = parseFloat(next.payoutPercent);
      if (!isNaN(sAmt) && !isNaN(pPct)) {
        next.payoutAmount = String(Math.round(((sAmt * pPct) / 100) * 100) / 100);
      }
    }

    setForm(next);
  };

  const handleCreate = async () => {
    if (!form.customerName.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required');
      return;
    }

    setSaving(true);
    try {
      await api.post('/finance/loans/inquiries', form);
      setModalVisible(false);
      setForm(initialForm);
      Alert.alert('Success', 'Loan inquiry submitted successfully');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit loan inquiry');
    } finally {
      setSaving(false);
    }
  };

  const getBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ONLY INQUIRY' || s === 'TRIED BUT NOT DONE') {
      return { bg: '#E5E7EB', text: '#1F2937' };
    }
    if (s === 'COMPLETED') {
      return { bg: '#156F3F', text: '#D1FADF' };
    }
    if (s === 'REJECT' || s === 'REJECTED') {
      return { bg: '#A30D11', text: '#FFFFFF' };
    }
    return { bg: '#F1F5F9', text: '#334155' };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Loan Inquiries</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}><Text style={styles.countText}>{metrics.total}</Text></View>
          <Pressable style={styles.addBtn} onPress={() => { setForm(initialForm); setModalVisible(true); }}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['all', ...STATUS_OPTIONS].map((st) => (
            <Pressable
              key={st}
              style={[styles.filterPill, statusFilter === st && styles.filterPillActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.filterPillText, statusFilter === st && styles.filterPillTextActive]}>
                {st === 'all' ? 'All' : st}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Inquiries List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No loan inquiries found</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const badgeStyle = getBadgeStyle(item.status);
          const displaySrNo = item.srNo || index + 1;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.srNo}>#{displaySrNo}</Text>
                    <Text style={styles.cardName}>{item.customerName}</Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    {item.category || 'PRIVATE USED'} {item.leadBy ? `· By: ${item.leadBy}` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{item.status}</Text>
                </View>
              </View>

              {/* Vehicle and Contact Row */}
              <View style={styles.midRow}>
                {item.vehicleNumber && (
                  <View style={styles.plate}>
                    <Text style={styles.plateText}>{item.vehicleNumber}</Text>
                  </View>
                )}
                {item.mobileNo && (
                  <View style={styles.contactRow}>
                    <Pressable
                      style={styles.actionIcon}
                      onPress={() => Linking.openURL(`tel:${item.mobileNo}`)}
                    >
                      <Ionicons name="call" size={14} color={Colors.primary} />
                      <Text style={styles.phoneText}>{item.mobileNo}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionIcon}
                      onPress={() => Linking.openURL(`https://wa.me/91${item.mobileNo.replace(/\D/g, '')}`)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Financial Summary */}
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.statLabel}>Req Amount</Text>
                  <Text style={styles.statValue}>
                    {item.requiredAmount ? `₹${Number(item.requiredAmount).toLocaleString('en-IN')}` : '-'}
                  </Text>
                </View>
                {item.sanctionedAmount && (
                  <View>
                    <Text style={styles.statLabel}>Sanctioned</Text>
                    <Text style={[styles.statValue, { color: '#15803d' }]}>
                      ₹{Number(item.sanctionedAmount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                {item.payoutAmount && (
                  <View>
                    <Text style={styles.statLabel}>Payout</Text>
                    <Text style={[styles.statValue, { color: '#0369a1' }]}>
                      ₹{Number(item.payoutAmount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Reason or Remarks if present */}
              {item.reasonForNotDone && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>Reason: {item.reasonForNotDone}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Add Inquiry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Loan Inquiry</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. VIKAS TOYTA"
                  placeholderTextColor={Colors.textLight}
                  value={form.customerName}
                  onChangeText={(val) => updateFormField('customerName', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9510819589"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  value={form.mobileNo}
                  onChangeText={(val) => updateFormField('mobileNo', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>VEHICLE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. GJ01WC7944"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                  value={form.vehicleNumber}
                  onChangeText={(val) => updateFormField('vehicleNumber', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>LEAD BY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MITTAL MADAM"
                  placeholderTextColor={Colors.textLight}
                  value={form.leadBy}
                  onChangeText={(val) => updateFormField('leadBy', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>REQUIRED AMOUNT (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={form.requiredAmount}
                  onChangeText={(val) => updateFormField('requiredAmount', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>STATUS</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((st) => (
                    <Pressable
                      key={st}
                      style={[styles.statusSelectPill, form.status === st && styles.statusSelectPillActive]}
                      onPress={() => updateFormField('status', st)}
                    >
                      <Text style={[styles.statusSelectText, form.status === st && styles.statusSelectTextActive]}>
                        {st}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>REASON FOR NOT DONE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CALL NOT ANSWERING"
                  placeholderTextColor={Colors.textLight}
                  value={form.reasonForNotDone}
                  onChangeText={(val) => updateFormField('reasonForNotDone', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BANK/NBFC (IF DONE)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC Bank"
                  placeholderTextColor={Colors.textLight}
                  value={form.bankNbfc}
                  onChangeText={(val) => updateFormField('bankNbfc', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SANCTIONED AMOUNT (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={form.sanctionedAmount}
                  onChangeText={(val) => updateFormField('sanctionedAmount', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PAYOUT %</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1.5"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={form.payoutPercent}
                  onChangeText={(val) => updateFormField('payoutPercent', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PAYOUT AMOUNT (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={form.payoutAmount}
                  onChangeText={(val) => updateFormField('payoutAmount', val)}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>REMARKS</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Internal remarks..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  value={form.remarksIfAny}
                  onChangeText={(val) => updateFormField('remarksIfAny', val)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save Inquiry</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.xs },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceMuted,
  },
  filterPillActive: { backgroundColor: Colors.text },
  filterPillText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  filterPillTextActive: { color: Colors.white },
  empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyText: { marginTop: Spacing.sm, fontSize: FontSize.sm, color: Colors.textLight },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  srNo: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '800' },
  midRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  plate: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  plateText: { fontSize: FontSize.xs, fontWeight: '800', color: '#78350F' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionIcon: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  phoneText: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statLabel: { fontSize: 10, color: Colors.textLight, textTransform: 'uppercase' },
  statValue: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text, marginTop: 2 },
  reasonBox: {
    marginTop: Spacing.xs,
    padding: Spacing.xs,
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.sm,
  },
  reasonText: { fontSize: 11, color: '#991B1B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalBody: { padding: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 4 },
  statusSelectPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  statusSelectPillActive: { backgroundColor: Colors.primary },
  statusSelectText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  statusSelectTextActive: { color: Colors.white },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  cancelText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
