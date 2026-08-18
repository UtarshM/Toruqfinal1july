import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Linking, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useAuth } from '../../src/context/AuthContext';

const URGENCY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: '30days', label: '30 Days' },
  { key: '60days', label: '60 Days' },
];

export default function RenewalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = user?.role?.toUpperCase() || '';
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');

  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (urgency !== 'all') params.set('urgency', urgency);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      
      let fetchedItems: any[] = [];
      let fetchedSummary: any = {};

      try {
        const res = await api.get<any>(`/renewals${query}`);
        if (res?.items) {
          fetchedItems = res.items;
          fetchedSummary = res.summary || {};
        }
      } catch (apiErr) {
        console.warn('[Renewals API err, falling back to Supabase DB]', apiErr);
      }

      if (fetchedItems.length === 0) {
        const now = new Date();
        const { data: dbLeads } = await supabase
          .from('leads')
          .select('id, clientName, clientPhone, clientEmail, vehicleNo, expiryDate, status, customFields, assignee:assignedTo(fullName)')
          .not('expiryDate', 'is', null)
          .is('deletedAt', null)
          .order('expiryDate', { ascending: true })
          .limit(200);

        if (dbLeads) {
          fetchedItems = dbLeads.map((l: any) => {
            const exp = new Date(l.expiryDate);
            const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let itemUrgency = '60days';
            if (daysLeft < 0) itemUrgency = 'overdue';
            else if (daysLeft <= 30) itemUrgency = '30days';

            const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {};
            const sub = cf.policySubmission || {};
            const formData = sub.formData || {};

            return {
              id: l.id,
              leadId: l.id,
              clientName: l.clientName || 'Customer',
              clientPhone: l.clientPhone || '',
              clientEmail: l.clientEmail || '',
              vehicleNo: l.vehicleNo || 'N/A',
              expiryDate: l.expiryDate,
              daysRemaining: daysLeft,
              urgencyCategory: itemUrgency,
              policyNumber: sub.policyNumber || sub.issuedPolicyNumber || 'N/A',
              provider: sub.issuedProvider || formData.provider || formData.insCompany || 'N/A',
              type: formData.policyType || 'N/A',
              premiumAmount: parseFloat(formData.totalPremium || formData.rsFromCustomer || sub.issuedPremium || '0') || 0,
              compiledPdfUrl: sub.compiledPdfUrl || null,
              issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
              renewalStatus: cf.renewalStatus || (daysLeft < 0 ? 'Overdue / Expired' : 'Pending Contact'),
              salesPersonName: l.assignee?.fullName || 'Unassigned',
              documentsCount: sub.documents?.length || 0,
              paidAmount: parseFloat(formData.paidAmount || '0') || 0,
              pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
            };
          }).filter((item: any) => {
            if (urgency !== 'all' && item.urgencyCategory !== urgency) return false;
            if (search.trim()) {
              const q = search.toLowerCase();
              return (
                item.clientName?.toLowerCase().includes(q) ||
                item.vehicleNo?.toLowerCase().includes(q) ||
                item.clientPhone?.includes(q) ||
                item.policyNumber?.toLowerCase().includes(q)
              );
            }
            return true;
          });

          fetchedSummary = {
            totalRenewals: fetchedItems.length,
            overdueCount: fetchedItems.filter((i: any) => i.daysRemaining < 0).length,
            expiring30Days: fetchedItems.filter((i: any) => i.daysRemaining >= 0 && i.daysRemaining <= 30).length,
            renewedCount: fetchedItems.filter((i: any) => i.renewalStatus === 'Renewed').length,
            totalVolume: fetchedItems.reduce((sum: number, i: any) => sum + (i.premiumAmount || 0), 0),
          };
        }
      }

      setItems(fetchedItems);
      setSummary(fetchedSummary);
    } catch (e) {
      console.warn('[Renewals] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [urgency, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string, name: string, expiry: string) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const msg = `Hello ${name || 'Customer'},\nYour policy is expiring on ${expiry || 'soon'}.\nPlease contact us to renew.\n\n— Torque Auto Advisor`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const previewPdf = async (url: string) => {
    if (!url) return;
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
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
          const fileUri = FileSystem.documentDirectory + (res.fileName || 'monthly_sheet.xlsx');
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
        Alert.alert('No Data', 'No policies found for this month to generate sheet.');
      }
    } catch (err: any) {
      console.warn('[Monthly sheet download error]', err);
      Alert.alert('Download Error', err?.message || 'Could not download monthly sheet.');
    } finally {
      setDownloadingSheet(false);
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return { bg: '#FFF1F2', text: '#E11D48', dot: '#E11D48' };
    if (days <= 30) return { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' };
    if (days <= 60) return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' };
    return { bg: '#ECFDF5', text: '#047857', dot: '#10B981' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const urgencyColor = getUrgencyColor(item.daysRemaining);
    const expiryFormatted = item.expiryDate
      ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
    const prem = item.premiumAmount || 0;
    const paidAmt = item.paidAmount || 0;
    const pendingAmt = item.pendingAmount || Math.max(0, prem - paidAmt);
    const isPaid = pendingAmt <= 0 && prem > 0;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
        onPress={() => item.leadId && router.push(`/(protected)/lead/${item.leadId}` as any)}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
            <View style={styles.regPill}>
              <Text style={styles.regPillText}>{item.vehicleNo}</Text>
            </View>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor.bg }]}>
            <View style={[styles.urgencyDot, { backgroundColor: urgencyColor.dot }]} />
            <Text style={[styles.urgencyText, { color: urgencyColor.text }]}>
              {item.daysRemaining < 0
                ? `${Math.abs(item.daysRemaining)}d overdue`
                : `${item.daysRemaining}d left`}
            </Text>
          </View>
        </View>

        {/* Policy Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-outline" size={13} color="#64748B" />
            <Text style={styles.infoLabel} numberOfLines={1}>{item.policyNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={13} color="#64748B" />
            <Text style={styles.infoLabel} numberOfLines={1}>{item.provider || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text style={styles.infoLabel}>Exp: {expiryFormatted}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="pricetag-outline" size={13} color="#64748B" />
            <Text style={styles.infoLabel}>{item.type || 'N/A'}</Text>
          </View>
        </View>

        {/* Finance Row */}
        <View style={styles.financeRow}>
          <View style={styles.financeTile}>
            <Text style={styles.financeLabel}>PREMIUM</Text>
            <Text style={[styles.financeValue, { color: '#0F172A' }]}>₹{prem.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.financeTile}>
            <Text style={styles.financeLabel}>PAID</Text>
            <Text style={[styles.financeValue, { color: '#059669' }]}>₹{paidAmt.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.financeTile}>
            <Text style={styles.financeLabel}>{isPaid ? 'CLEARED' : 'DUE'}</Text>
            <Text style={[styles.financeValue, { color: isPaid ? '#059669' : '#E11D48' }]}>
              {isPaid ? '✓ Paid' : `₹${pendingAmt.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

        {/* PDF Links */}
        {(item.compiledPdfUrl || item.issuedPolicyPdfUrl) && (
          <View style={styles.pdfRow}>
            {item.compiledPdfUrl && (
              <Pressable style={styles.pdfBtn} onPress={() => previewPdf(item.compiledPdfUrl)}>
                <Ionicons name="document-text" size={14} color={Colors.primary} />
                <Text style={styles.pdfBtnText}>Merged PDF</Text>
              </Pressable>
            )}
            {item.issuedPolicyPdfUrl && (
              <Pressable
                style={[styles.pdfBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={() => previewPdf(item.issuedPolicyPdfUrl)}
              >
                <Ionicons name="checkmark-done-circle" size={14} color="#059669" />
                <Text style={[styles.pdfBtnText, { color: '#059669' }]}>Issued Policy</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Renewal Status & Sales */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: item.renewalStatus === 'Renewed' ? '#ECFDF5' : '#F1F5F9' }]}>
            <Text style={[styles.statusText, { color: item.renewalStatus === 'Renewed' ? '#047857' : '#475569' }]}>
              {item.renewalStatus}
            </Text>
          </View>
          <Text style={styles.salesPerson} numberOfLines={1}>{item.salesPersonName}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
            onPress={() => handleCall(item.clientPhone)}
          >
            <Ionicons name="call-outline" size={15} color="#047857" />
            <Text style={[styles.actionBtnText, { color: '#047857' }]}>Call</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
            onPress={() => handleWhatsApp(item.clientPhone, item.clientName, expiryFormatted)}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#16a34a" />
            <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>WhatsApp</Text>
          </Pressable>
          {item.leadId && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Colors.primaryLight || '#EFF6FF' }]}
              onPress={() => router.push(`/(protected)/lead/${item.leadId}` as any)}
            >
              <Ionicons name="open-outline" size={15} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>View</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Renewals</Text>
          <Text style={styles.headerSubtitle}>{items.length} {items.length === 1 ? 'policy' : 'policies'}</Text>
        </View>
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
                <Ionicons name="download-outline" size={16} color={Colors.primary} />
                <Text style={styles.downloadSheetText}>Excel</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Summary Bar */}
      {(summary.totalRenewals > 0 || items.length > 0) && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryVal}>{summary.totalRenewals || items.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={[styles.summaryTile, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
            <Text style={[styles.summaryVal, { color: '#E11D48' }]}>{summary.overdueCount || 0}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
          <View style={[styles.summaryTile, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
            <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{summary.expiring30Days || 0}</Text>
            <Text style={styles.summaryLabel}>30 Days</Text>
          </View>
          <View style={[styles.summaryTile, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
            <Text style={[styles.summaryVal, { color: '#059669' }]}>{summary.renewedCount || 0}</Text>
            <Text style={styles.summaryLabel}>Renewed</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, vehicle, policy..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => { setSearch(''); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Urgency Tabs */}
      <View style={styles.tabsRow}>
        {URGENCY_TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, urgency === tab.key && styles.tabActive]}
            onPress={() => setUrgency(tab.key)}
          >
            <Text style={[styles.tabText, urgency === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Renewals</Text>
            <Text style={styles.emptySubtitle}>No policies match your filters</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500', marginTop: 1 },
  downloadSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  downloadSheetText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  summaryTile: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text, paddingVertical: 0 },

  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  clientName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  regPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  regPillText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: 10, fontWeight: '800' },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '48%' as any },
  infoLabel: { fontSize: FontSize.xs, color: '#64748B', fontWeight: '600', flex: 1 },

  financeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  financeTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  financeLabel: { fontSize: 8, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  financeValue: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  pdfRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  pdfBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  salesPerson: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', flex: 1, textAlign: 'right' },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
});

