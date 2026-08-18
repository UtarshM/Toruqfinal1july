import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Linking, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';

const URGENCY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: '30days', label: '30 Days' },
  { key: '60days', label: '60 Days' },
];

export default function RenewalsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (urgency !== 'all') params.set('urgency', urgency);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<any>(`/renewals${query}`);
      setItems(res.items || []);
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

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
        onPress={() => item.leadId && router.push(`/(protected)/lead/${item.leadId}` as any)}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
            <Text style={styles.vehicleNo}>{item.vehicleNo}</Text>
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

        {/* Policy Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoLabel}>{item.policyNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoLabel} numberOfLines={1}>{item.provider || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoLabel}>Expires: {expiryFormatted}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.infoLabel}>₹{(item.premiumAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Renewal Status */}
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
            <Ionicons name="call-outline" size={16} color="#047857" />
            <Text style={[styles.actionBtnText, { color: '#047857' }]}>Call</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
            onPress={() => handleWhatsApp(item.clientPhone, item.clientName, expiryFormatted)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
            <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>WhatsApp</Text>
          </Pressable>
          {item.leadId && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Colors.primaryLight }]}
              onPress={() => router.push(`/(protected)/lead/${item.leadId}` as any)}
            >
              <Ionicons name="open-outline" size={16} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>View</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
      </View>

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
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: 0,
  },

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
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  clientName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  vehicleNo: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '800',
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%' as any,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  salesPerson: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
