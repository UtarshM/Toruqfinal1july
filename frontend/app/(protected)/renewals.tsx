import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { api } from '../../src/utils/api';
import AppFooter from '../../src/components/AppFooter';

interface RenewalItem {
  id: string;
  vehicleNo: string;
  customerName: string;
  mobileNo: string;
  company: string;
  category: string;
  expiryDate: string;
  daysRemaining: number;
  premiumAmount?: number;
  policyNo?: string;
}

const SAMPLE_RENEWALS: RenewalItem[] = [
  {
    id: 'ren-1',
    vehicleNo: 'GJ01WC7944',
    customerName: 'VIKAS TOYOTA MOTORS',
    mobileNo: '9510819589',
    company: 'TATA AIG',
    category: 'Commercial LCV',
    expiryDate: '2026-09-24',
    daysRemaining: 5,
    premiumAmount: 24500,
    policyNo: '0165849302/00',
  },
  {
    id: 'ren-2',
    vehicleNo: 'GJ36T0767',
    customerName: 'IKBAL IBRAHIM KHOKHAR',
    mobileNo: '6352829435',
    company: 'ICICI LOMBARD',
    category: 'Heavy Goods (HGV)',
    expiryDate: '2026-09-28',
    daysRemaining: 9,
    premiumAmount: 38200,
    policyNo: '3001/2984920/01',
  },
  {
    id: 'ren-3',
    vehicleNo: 'GJ10TW8886',
    customerName: 'SONAGRA PUNIT BHAI',
    mobileNo: '6351113901',
    company: 'DIGIT INSURANCE',
    category: 'Private Car',
    expiryDate: '2026-10-04',
    daysRemaining: 15,
    premiumAmount: 11400,
    policyNo: 'D0984920194',
  },
  {
    id: 'ren-4',
    vehicleNo: 'GJ36T3452',
    customerName: 'BASHIR CHANIYA',
    mobileNo: '9265054138',
    company: 'SHRIRAM GENERAL',
    category: 'Truck GCV',
    expiryDate: '2026-10-18',
    daysRemaining: 29,
    premiumAmount: 42000,
    policyNo: '10003/31/24/09849',
  },
  {
    id: 'ren-5',
    vehicleNo: 'GJ03BY1289',
    customerName: 'ISABHAI THEBA',
    mobileNo: '9879563700',
    company: 'CHOLA MS',
    category: 'Commercial 3W PCV',
    expiryDate: '2026-09-17',
    daysRemaining: -2,
    premiumAmount: 14800,
    policyNo: 'CHOLA-293849',
  },
];

export default function RenewalsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | '7days' | '15days' | '30days' | 'expired'>('all');
  const [renewals, setRenewals] = useState<RenewalItem[]>(SAMPLE_RENEWALS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRenewals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/policies?limit=50&status=active').catch(() => null);
      if (res && Array.isArray(res.policies) && res.policies.length > 0) {
        const today = new Date().getTime();
        const mapped: RenewalItem[] = res.policies.map((p: any) => {
          const exp = p.expiry_date || p.expiryDate || '2026-10-01';
          const diffDays = Math.ceil((new Date(exp).getTime() - today) / (1000 * 60 * 60 * 24));
          return {
            id: p.id || String(Math.random()),
            vehicleNo: p.vehicle_number || p.vehicleNo || 'GJ01AB1234',
            customerName: p.customer_name || p.customerName || 'Customer',
            mobileNo: p.mobile_no || p.customer_mobile || '9876543210',
            company: p.insurance_company || p.company || 'TATA AIG',
            category: p.category || p.vehicle_type || 'Vehicle',
            expiryDate: exp,
            daysRemaining: isNaN(diffDays) ? 10 : diffDays,
            premiumAmount: p.net_premium || p.gross_premium || 0,
            policyNo: p.policy_number || p.policyNo || '',
          };
        });
        setRenewals(mapped);
      }
    } catch (e) {
      console.warn('Renewals fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRenewals();
  }, [fetchRenewals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRenewals();
    setRefreshing(false);
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to initiate phone call'));
  };

  const handleWhatsApp = (item: RenewalItem) => {
    const cleanPhone = item.mobileNo.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${item.customerName},\n\nThis is a friendly reminder from Torque Auto Advisor regarding your vehicle *${item.vehicleNo}* insurance with *${item.company}* which is due for renewal on *${item.expiryDate}*.\n\nTo ensure continuous coverage, zero NCB loss, and get the lowest rate quotes, please reply to this message or call us.\n\nRegards,\n*Torque Auto Advisor*`;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open WhatsApp'));
  };

  const handleRenewQuote = (item: RenewalItem) => {
    router.push({
      pathname: '/(protected)/quotation-new',
      params: {
        customer_name: item.customerName,
        phone: item.mobileNo,
        vehicle_reg: item.vehicleNo,
        previous_insurer: item.company,
        category: item.category,
      }
    } as any);
  };

  const filteredData = renewals.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.vehicleNo.toLowerCase().includes(query) ||
      item.customerName.toLowerCase().includes(query) ||
      item.company.toLowerCase().includes(query) ||
      item.mobileNo.includes(query);

    if (!matchesSearch) return false;

    if (activeFilter === '7days') return item.daysRemaining >= 0 && item.daysRemaining <= 7;
    if (activeFilter === '15days') return item.daysRemaining >= 0 && item.daysRemaining <= 15;
    if (activeFilter === '30days') return item.daysRemaining >= 0 && item.daysRemaining <= 30;
    if (activeFilter === 'expired') return item.daysRemaining < 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Renewals Pipeline</Text>
          <Text style={styles.headerSub}>Motor & Commercial policy renewals tracker</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.iconBtn}>
          <Ionicons name="reload" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle no, customer, insurer..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'All' },
          { key: '7days', label: 'Due in 7D' },
          { key: '15days', label: 'Due in 15D' },
          { key: '30days', label: 'Due in 30D' },
          { key: 'expired', label: 'Expired' },
        ].map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key as any)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Renewals Found</Text>
              <Text style={styles.emptyText}>No policies matching the selected filter.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isExpired = item.daysRemaining < 0;
          const isUrgent = item.daysRemaining >= 0 && item.daysRemaining <= 7;

          return (
            <View style={styles.renewalCard}>
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={styles.regNo}>{item.vehicleNo}</Text>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    isExpired
                      ? styles.badgeExpired
                      : isUrgent
                      ? styles.badgeUrgent
                      : styles.badgeNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isExpired
                        ? styles.badgeTextExpired
                        : isUrgent
                        ? styles.badgeTextUrgent
                        : styles.badgeTextNormal,
                    ]}
                  >
                    {isExpired
                      ? `Expired ${Math.abs(item.daysRemaining)}d ago`
                      : item.daysRemaining === 0
                      ? 'Expires Today'
                      : `Expires in ${item.daysRemaining} days`}
                  </Text>
                </View>
              </View>

              <View style={styles.cardMetaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>INSURER</Text>
                  <Text style={styles.metaValue}>{item.company}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>CATEGORY</Text>
                  <Text style={styles.metaValue}>{item.category}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>LAST PREMIUM</Text>
                  <Text style={styles.metaValue}>
                    {item.premiumAmount ? `₹${item.premiumAmount.toLocaleString()}` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={styles.actionBtnCall}
                  onPress={() => handleCall(item.mobileNo)}
                >
                  <Ionicons name="call" size={14} color="#16A34A" />
                  <Text style={styles.actionBtnCallText}>Call</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtnWa}
                  onPress={() => handleWhatsApp(item)}
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnWaText}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  style={styles.actionBtnRenew}
                  onPress={() => handleRenewQuote(item)}
                >
                  <Ionicons name="flash" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnRenewText}>Renew Quote</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* Sticky Bottom Nav */}
      <AppFooter active="renewals" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: FontSize.xs, color: '#64748B', marginTop: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: '#002FA7' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  listContent: { padding: Spacing.lg, gap: 12, paddingBottom: 30 },
  renewalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  regNo: { fontSize: FontSize.md, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
  customerName: { fontSize: FontSize.xs + 1, fontWeight: '600', color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeExpired: { backgroundColor: '#FEE2E2' },
  badgeUrgent: { backgroundColor: '#FEF3C7' },
  badgeNormal: { backgroundColor: '#EFF6FF' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextExpired: { color: '#DC2626' },
  badgeTextUrgent: { color: '#D97706' },
  badgeTextNormal: { color: '#2563EB' },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  metaItem: { gap: 2 },
  metaLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  metaValue: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnCallText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  actionBtnWa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnWaText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  actionBtnRenew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#002FA7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnRenewText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: FontSize.xs, color: '#94A3B8' },
});

