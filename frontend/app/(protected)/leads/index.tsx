import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl, Linking, Platform, StatusBar, Alert, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../../src/store/cacheStore';
import AppFooter from '../../../src/components/AppFooter';
import Sidebar from '../../../src/components/Sidebar';
import { exportToCSV } from '../../../src/utils/exportHelper';
import { useAuth } from '../../../src/context/AuthContext';

export default function LeadsScreen() {
  const router = useRouter();
  const { cache, setCache, loadCache } = useCacheStore();

  const [items, setItems] = useState<any[]>(cache['/leads']?.leads || []);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [importNames, setImportNames] = useState<string[]>([]);
  const [selectedImportName, setSelectedImportName] = useState('');

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Month-wise filter
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = All Months
  const MONTH_LABELS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // WhatsApp draft preview modal
  const [waModalVisible, setWaModalVisible] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waLeadId, setWaLeadId] = useState('');

  const fetchImports = async () => {
    try {
      const list = await api.get<string[]>('/leads/imports');
      setImportNames(list || []);
    } catch (err) {
      console.warn('Failed to load import sheet names', err);
    }
  };

  React.useEffect(() => {
    loadCache().then(() => {
      const query = selectedImportName ? `?importName=${encodeURIComponent(selectedImportName)}` : '';
      const cached = cache[`/leads${query}`] || cache['/leads'];
      if (cached && cached.leads) {
        setItems(cached.leads);
      }
    });
    fetchImports();
  }, []);

  const load = useCallback(async (importNameFilter = selectedImportName) => {
    try {
      const query = importNameFilter ? `?importName=${encodeURIComponent(importNameFilter)}` : '';
      const res = await api.get<any>(`/leads${query}`);
      const leads = res.leads || [];
      setItems(leads);
      setCache(`/leads${query}`, { leads, timestamp: Date.now() });
    } catch (e) {
      console.error('[LeadsScreen] Failed to load leads', e);
    }
  }, [setCache, selectedImportName]);

  useFocusEffect(
    useCallback(() => {
      const query = selectedImportName ? `?importName=${encodeURIComponent(selectedImportName)}` : '';
      const cached = cache[`/leads${query}`];
      const lastFetched = cached?.timestamp;
      if (!lastFetched || Date.now() - lastFetched > 30000) {
        load(selectedImportName);
      }
      fetchImports();
    }, [load, cache, selectedImportName])
  );
  const onRefresh = async () => { setRefreshing(true); await load(selectedImportName); setRefreshing(false); };

  const handleSelectImport = (name: string) => {
    setSelectedImportName(name);
    load(name);
  };

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = async (leadId: string, phone: string, name: string, vehicle: string, expiry: string) => {
    if (phone) {
      const msg = `Hello ${name || 'Customer'},\nYour vehicle ${vehicle || ''} insurance expires on ${expiry || 'soon'}.\nRenew today with Torque Auto Advisor.`;
      setWaMessage(msg);
      setWaLeadId(leadId);

      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (!(cleanPhone.length === 12 && cleanPhone.startsWith('91'))) {
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      }
      setWaPhone(cleanPhone);
      setWaModalVisible(true);
    }
  };

  const sendWhatsAppFromModal = async () => {
    setWaModalVisible(false);
    // Log activity
    try {
      await api.post(`/leads/${waLeadId}/whatsapp`, {});
    } catch (err) {
      console.warn('Failed to log WhatsApp activity:', err);
    }
    // Open WhatsApp
    try {
      const whatsappUrl = `whatsapp://send?phone=${waPhone}&text=${encodeURIComponent(waMessage)}`;
      try {
        await Linking.openURL(whatsappUrl);
      } catch (e) {
        const webUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMessage)}`;
        await Linking.openURL(webUrl).catch(() => {
          Alert.alert('Error', 'Could not open WhatsApp. Please check if the app is installed.');
        });
      }
    } catch (err) {
      console.warn('WhatsApp launch error:', err);
    }
  };

  // Month-wise + search filtering
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by month
    if (selectedMonth > 0) {
      result = result.filter(l => {
        if (!l.expiryDate) return false;
        const d = new Date(l.expiryDate);
        return !isNaN(d.getTime()) && (d.getMonth() + 1) === selectedMonth;
      });
    }

    // Filter by search
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(l =>
        l.clientName?.toLowerCase().includes(term) ||
        l.clientPhone?.includes(search) ||
        l.vehicleNo?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [items, selectedMonth, search]);

  // Compute month counts for badge display
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    items.forEach(l => {
      if (l.expiryDate) {
        const d = new Date(l.expiryDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth() + 1;
          counts[m] = (counts[m] || 0) + 1;
        }
      }
    });
    return counts;
  }, [items]);

  const handleExport = () => {
    if (filteredItems.length === 0) {
      Alert.alert('No Data', 'No leads found to export.');
      return;
    }

    const headers = ['Client Name', 'Client Phone', 'Vehicle Number', 'Status', 'Expiry Date', 'Assignee'];
    const rows = filteredItems.map(l => [
      l.clientName || 'N/A',
      l.clientPhone || 'N/A',
      l.vehicleNo || 'N/A',
      l.status || 'New',
      l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : 'N/A',
      l.assignee?.fullName || 'Unassigned'
    ]);

    exportToCSV(`leads_export_${selectedImportName || 'all'}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isAdminOrManager = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'MANAGER' || roleUpper === 'HR MANAGER';

  // Bulk selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const handleLongPress = (id: string) => {
    if (!isAdminOrManager) return;
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Leads',
      `Are you sure you want to delete ${selectedIds.size} lead(s)? This action can be undone by admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete('/leads', { ids: Array.from(selectedIds) } as any);
              setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
              cancelSelection();
              Alert.alert('Done', `${selectedIds.size} lead(s) deleted successfully.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete leads');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sidebar Component */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>My Leads</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionIconBtn} onPress={handleExport}>
            <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
          </Pressable>
          {isAdminOrManager && (
            <Pressable style={styles.addBtn} onPress={() => router.push('/lead/new')}>
              <Ionicons name="add" size={22} color={Colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone or vehicle..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </Pressable>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredItems.length}</Text>
        </View>
      </View>

      {/* Sheet Filter Bar */}
      {importNames.length > 0 && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Pressable 
              style={[styles.filterChip, selectedImportName === '' && styles.filterChipActive]}
              onPress={() => handleSelectImport('')}
            >
              <Text style={[styles.filterChipText, selectedImportName === '' && styles.filterChipTextActive]}>All Sheets</Text>
            </Pressable>
            {importNames.map(name => (
              <Pressable
                key={name}
                style={[styles.filterChip, selectedImportName === name && styles.filterChipActive]}
                onPress={() => handleSelectImport(name)}
              >
                <Ionicons name="document-text-outline" size={12} color={selectedImportName === name ? '#FFFFFF' : Colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.filterChipText, selectedImportName === name && styles.filterChipTextActive]} numberOfLines={1}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Month-wise Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {MONTH_LABELS.map((label, idx) => {
            const count = idx === 0 ? items.length : (monthCounts[idx] || 0);
            const isActive = selectedMonth === idx;
            return (
              <Pressable
                key={idx}
                style={[styles.monthChip, isActive && styles.monthChipActive]}
                onPress={() => setSelectedMonth(idx)}
              >
                <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>
                  {label}
                </Text>
                {count > 0 && (
                  <View style={[styles.monthBadge, isActive && styles.monthBadgeActive]}>
                    <Text style={[styles.monthBadgeText, isActive && styles.monthBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No leads found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term' : 'No leads assigned to you yet'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[(item.status || 'New').toLowerCase()] || StatusColors.new;
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.85 },
                isSelected && styles.cardSelected,
              ]}
              onPress={() => {
                if (selectionMode) {
                  toggleSelect(item.id);
                } else {
                  router.push(`/lead/${item.id}`);
                }
              }}
              onLongPress={() => handleLongPress(item.id)}
              delayLongPress={400}
            >
              <View style={styles.cardTop}>
                {selectionMode ? (
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.avatarText, { color: sc.text }]}>
                      {item.clientName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.clientName}</Text>
                  <Text style={styles.cardMeta}>{item.clientPhone || 'No phone'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                  </View>
                  {(() => {
                    const cf = (item.customFields && typeof item.customFields === 'object') ? item.customFields : {};
                    const sub = cf.policySubmission || {};
                    if (sub.status === 'Pending_Review') {
                      return (
                        <View style={{
                          backgroundColor: '#FFFBEB',
                          borderColor: '#F59E0B',
                          borderWidth: 1,
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Ionicons name="time" size={10} color="#D97706" style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>
                            {sub.managerName ? `In Review: ${sub.managerName}` : 'In Review'}
                          </Text>
                        </View>
                      );
                    }
                    if (sub.status === 'Approved') {
                      return (
                        <View style={{
                          backgroundColor: '#ECFDF5',
                          borderColor: '#10B981',
                          borderWidth: 1,
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Ionicons name="checkmark-circle" size={10} color="#059669" style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#047857' }}>Approved ✓</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              </View>

              <View style={styles.cardMiddle}>
                <View style={styles.metaRow}>
                  <Ionicons name="car-outline" size={13} color={Colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.vehicleNo || 'No vehicle'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={13} color={Colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.assignee?.fullName || 'Unassigned'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={styles.metaText}>
                    Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>

              {!selectionMode && (
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.btn, { backgroundColor: Colors.success + '15' }]}
                    onPress={() => handleCall(item.clientPhone)}
                  >
                    <Ionicons name="call" size={16} color={Colors.success} />
                    <Text style={[styles.btnText, { color: Colors.success }]}>Call</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { backgroundColor: '#25D36615' }]}
                    onPress={() => handleWhatsApp(item.id, item.clientPhone, item.clientName, item.vehicleNo, item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '')}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    <Text style={[styles.btnText, { color: '#25D366' }]}>WhatsApp</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { backgroundColor: Colors.primaryLight }]}
                    onPress={() => router.push({ pathname: '/call-log', params: { leadId: item.id, leadName: item.clientName } })}
                  >
                    <Ionicons name="create" size={16} color={Colors.primary} />
                    <Text style={[styles.btnText, { color: Colors.primary }]}>Log</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Bulk Selection Bar */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
            <Pressable onPress={selectAll}>
              <Text style={styles.selectAllText}>Select All</Text>
            </Pressable>
          </View>
          <View style={styles.selectionActions}>
            <Pressable style={styles.cancelBtn} onPress={cancelSelection}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
              onPress={handleBulkDelete}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Sticky Footer */}
      {!selectionMode && <AppFooter active="leads" />}

      {/* WhatsApp Draft Preview Modal */}
      <Modal
        visible={waModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWaModalVisible(false)}
      >
        <View style={styles.waModalOverlay}>
          <View style={styles.waModalContent}>
            <View style={styles.waModalHeader}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={styles.waModalTitle}>WhatsApp Message Preview</Text>
              <Pressable onPress={() => setWaModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.waModalHint}>Edit the message below before sending:</Text>
            <TextInput
              style={styles.waModalInput}
              value={waMessage}
              onChangeText={setWaMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Type your WhatsApp message..."
              placeholderTextColor={Colors.textLight}
            />
            <View style={styles.waModalActions}>
              <Pressable style={styles.waModalCancelBtn} onPress={() => setWaModalVisible(false)}>
                <Text style={styles.waModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.waModalSendBtn} onPress={sendWhatsAppFromModal}>
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.waModalSendText}>Send via WhatsApp</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF', gap: Spacing.md,
  },
  menuBtn:  { padding: Spacing.xs },
  title:    { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  addBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionIconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  searchRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: '#FFFFFF' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44, gap: Spacing.sm },
  searchInput:    { flex: 1, fontSize: FontSize.md, color: Colors.text },
  countBadge:     { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.md, minWidth: 36, alignItems: 'center' },
  countText:      { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: '900' },
  cardName:   { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta:   { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  badge:      { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  cardMiddle: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border + '80' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: FontSize.xs, color: Colors.textMuted },
  cardActions:{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: BorderRadius.md },
  btnText:    { fontSize: FontSize.xs, fontWeight: '700' },
  empty:      { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  emptyText:  { fontSize: FontSize.sm, color: Colors.textMuted },
  filterBar: {
    paddingVertical: Spacing.xs,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Bulk selection styles
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primaryLight,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectionBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 12,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  selectionCount: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  selectAllText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.error,
  },
  deleteBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Month-wise filter chips
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  monthChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
  },
  monthBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  monthBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  monthBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  monthBadgeTextActive: {
    color: '#FFFFFF',
  },
  // WhatsApp Modal
  waModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  waModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  waModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  waModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  waModalHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  waModalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 120,
    marginBottom: 16,
  },
  waModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  waModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  waModalSendBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waModalSendText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
