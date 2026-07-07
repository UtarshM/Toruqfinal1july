import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { getDB } from '../../src/lib/db';
import { usersService, User } from '../../src/services/users';
import { exportToCSV } from '../../src/utils/exportHelper';

interface Cheque {
  id: string;
  bank_name: string;
  cheque_no: string;
  amount: number;
  received_date: string;
  deposit_date: string | null;
  clearance_date: string | null;
  status: 'received' | 'deposited' | 'cleared' | 'bounced';
  bounce_reason: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string; // resolved locally or from server
}

export default function ChequesScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'received' | 'deposited' | 'cleared' | 'bounced'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [bounceModalVisible, setBounceModalVisible] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [bounceReason, setBounceReason] = useState('');
  
  // Add Cheque Form State
  const [saving, setSaving] = useState(false);
  const [newCheque, setNewCheque] = useState({
    bank_name: '',
    cheque_no: '',
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
    customer_id: '',
  });

  // Load from local SQLite first for instant reload
  const loadLocalData = async () => {
    try {
      const db = await getDB();
      // Load cheques
      const dbCheques = await db.getAllAsync<any>(
        'SELECT * FROM cheques ORDER BY created_at DESC'
      );
      
      // Load users to map customer names
      const localUsers = await usersService.list({ limit: 100 }).catch(() => []);
      setUsers(localUsers);

      const mapped = dbCheques.map(c => {
        const u = localUsers.find(usr => usr.id === c.customer_id);
        return {
          ...c,
          customer_name: u ? u.full_name || u.fullName : 'Unknown Customer'
        };
      });

      setCheques(mapped);
    } catch (e) {
      console.error('[SQLite Cheques] Failed to read local database:', e);
    }
  };

  // Sync with remote server in the background
  const syncWithServer = async () => {
    try {
      // 1. Fetch from backend
      const serverCheques = await api.get<any[]>('/cheques').catch(() => null);
      if (!serverCheques || !Array.isArray(serverCheques)) {
        console.log('[Sync Cheques] Backend endpoint not fully implemented or reachable. Using local database.');
        return;
      }

      // 2. Upsert into local SQLite
      const db = await getDB();
      for (const c of serverCheques) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cheques (
            id, bank_name, cheque_no, amount, received_date, deposit_date, clearance_date, status, bounce_reason, customer_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.bank_name,
            c.cheque_no,
            Number(c.amount),
            c.received_date,
            c.deposit_date,
            c.clearance_date,
            c.status,
            c.bounce_reason,
            c.customer_id,
            c.created_at,
            c.updated_at
          ]
        );
      }
      
      // 3. Reload local data to refresh UI
      await loadLocalData();
    } catch (e) {
      console.warn('[Sync Cheques] Server sync skipped/failed:', e);
    }
  };

  // Initial loads
  useEffect(() => {
    loadLocalData().then(() => {
      syncWithServer();
    });
  }, []);

  // Fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    await syncWithServer();
    setRefreshing(false);
  };

  // Add Cheque Lifecycle Handler
  const handleAddCheque = async () => {
    const amt = parseFloat(newCheque.amount);
    if (!newCheque.bank_name.trim() || !newCheque.cheque_no.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Input', 'Please provide a valid Bank Name, Cheque Number, and Amount.');
      return;
    }

    setSaving(true);
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nowStr = new Date().toISOString();
    
    const localRecord = {
      id: generatedId,
      bank_name: newCheque.bank_name.trim(),
      cheque_no: newCheque.cheque_no.trim(),
      amount: amt,
      received_date: newCheque.received_date,
      deposit_date: null,
      clearance_date: null,
      status: 'received' as const,
      bounce_reason: null,
      customer_id: newCheque.customer_id || null,
      created_at: nowStr,
      updated_at: nowStr
    };

    try {
      // 1. Insert into local SQLite immediately for instant reactivity
      const db = await getDB();
      await db.runAsync(
        `INSERT INTO cheques (
          id, bank_name, cheque_no, amount, received_date, deposit_date, clearance_date, status, bounce_reason, customer_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          localRecord.id,
          localRecord.bank_name,
          localRecord.cheque_no,
          localRecord.amount,
          localRecord.received_date,
          localRecord.deposit_date,
          localRecord.clearance_date,
          localRecord.status,
          localRecord.bounce_reason,
          localRecord.customer_id,
          localRecord.created_at,
          localRecord.updated_at
        ]
      );

      // 2. Refresh local state
      await loadLocalData();
      setAddModalVisible(false);
      
      // Reset form
      setNewCheque({
        bank_name: '',
        cheque_no: '',
        amount: '',
        received_date: new Date().toISOString().split('T')[0],
        customer_id: '',
      });

      // 3. Post to API in the background (Optimistic UI updates)
      try {
        await api.post('/cheques', {
          bank_name: localRecord.bank_name,
          cheque_no: localRecord.cheque_no,
          amount: localRecord.amount,
          received_date: new Date(localRecord.received_date).toISOString(),
          customer_id: localRecord.customer_id
        });
        syncWithServer(); // Resync on success
      } catch (postErr) {
        console.log('[Cheques API] Background POST failed, keeping local SQLite copy.');
      }

      Alert.alert('Success', 'Cheque registered successfully in local database.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register cheque.');
    } finally {
      setSaving(false);
    }
  };

  // Update Status in local SQLite and push to Server
  const updateChequeStatus = async (chequeId: string, updates: Partial<Cheque>) => {
    try {
      const db = await getDB();
      const nowStr = new Date().toISOString();
      
      // Build local SQLite query dynamically
      const keys = Object.keys(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      const vals = keys.map(k => (updates as any)[k]);
      
      await db.runAsync(
        `UPDATE cheques SET ${setClause} WHERE id = ?`,
        [...vals, nowStr, chequeId]
      );

      // Refresh UI state
      await loadLocalData();

      // Attempt server update
      try {
        await api.patch(`/cheques/${chequeId}`, {
          ...updates,
          deposit_date: updates.deposit_date ? new Date(updates.deposit_date).toISOString() : undefined,
          clearance_date: updates.clearance_date ? new Date(updates.clearance_date).toISOString() : undefined,
        });
      } catch (serverErr) {
        console.log(`[Cheques Sync] Status update failed to sync with server for cheque ${chequeId}. Persisted locally.`);
      }
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to update cheque status.');
    }
  };

  // Trigger deposit action
  const handleDeposit = (cheque: Cheque) => {
    Alert.alert(
      'Deposit Cheque',
      `Mark Cheque #${cheque.cheque_no} from ${cheque.bank_name} as Deposited?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateChequeStatus(cheque.id, { 
            status: 'deposited', 
            deposit_date: new Date().toISOString().split('T')[0] 
          }) 
        }
      ]
    );
  };

  // Trigger clearance action
  const handleClear = (cheque: Cheque) => {
    Alert.alert(
      'Clear Cheque',
      `Mark Cheque #${cheque.cheque_no} as Cleared?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateChequeStatus(cheque.id, { 
            status: 'cleared', 
            clearance_date: new Date().toISOString().split('T')[0] 
          }) 
        }
      ]
    );
  };

  // Trigger bounce action modal
  const handleBounce = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setBounceReason('');
    setBounceModalVisible(true);
  };

  const submitBounce = async () => {
    if (!selectedCheque) return;
    if (!bounceReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for the bounced cheque.');
      return;
    }

    setBounceModalVisible(false);
    await updateChequeStatus(selectedCheque.id, {
      status: 'bounced',
      bounce_reason: bounceReason.trim()
    });
    setSelectedCheque(null);
  };

  // Export to CSV
  const handleExport = () => {
    if (filteredCheques.length === 0) {
      Alert.alert('No Data', 'There are no cheques in the current list to export.');
      return;
    }

    const headers = ['Bank Name', 'Cheque Number', 'Amount (INR)', 'Received Date', 'Deposit Date', 'Clearance Date', 'Status', 'Bounce Reason', 'Customer Name'];
    const rows = filteredCheques.map(c => [
      c.bank_name,
      c.cheque_no,
      c.amount,
      c.received_date,
      c.deposit_date || 'N/A',
      c.clearance_date || 'N/A',
      c.status.toUpperCase(),
      c.bounce_reason || 'N/A',
      c.customer_name || 'Unknown'
    ]);

    exportToCSV(`cheques_export_${filter}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // Filter and search computation
  const filteredCheques = cheques.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = 
      item.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cheque_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Cheques</Text>
        
        <View style={styles.headerActions}>
          <Pressable style={styles.actionIconBtn} onPress={handleExport}>
            <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bank, cheque no, customer..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'received', 'deposited', 'cleared', 'bounced'].map(s => (
            <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s as any)}>
              <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredCheques}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No cheques found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusTheme = StatusColors[item.status] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
          
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankName}>{item.bank_name}</Text>
                  <Text style={styles.chequeNo}>Chq #{item.cheque_no}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusTheme.dot }]} />
                  <Text style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Customer:</Text>
                  <Text style={styles.dataVal} numberOfLines={1}>{item.customer_name || 'N/A'}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Recd Date:</Text>
                  <Text style={styles.dataVal}>{item.received_date}</Text>
                </View>
                {item.deposit_date && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Dep Date:</Text>
                    <Text style={styles.dataVal}>{item.deposit_date}</Text>
                  </View>
                )}
                {item.clearance_date && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Cleared:</Text>
                    <Text style={styles.dataVal}>{item.clearance_date}</Text>
                  </View>
                )}
                {item.bounce_reason && (
                  <View style={styles.bounceBox}>
                    <Text style={styles.bounceLabel}>Bounce Reason:</Text>
                    <Text style={styles.bounceText}>{item.bounce_reason}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                
                <View style={styles.actions}>
                  {item.status === 'received' && (
                    <Pressable style={[styles.actionBtn, styles.primaryBtn]} onPress={() => handleDeposit(item)}>
                      <Text style={styles.actionBtnText}>Deposit</Text>
                    </Pressable>
                  )}
                  {item.status === 'deposited' && (
                    <>
                      <Pressable style={[styles.actionBtn, styles.successBtn]} onPress={() => handleClear(item)}>
                        <Text style={styles.actionBtnText}>Clear</Text>
                      </Pressable>
                      <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleBounce(item)}>
                        <Text style={styles.actionBtnText}>Bounce</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Cheque Modal ── */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Cheque</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>BANK NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. State Bank of India"
                  placeholderTextColor={Colors.textLight}
                  value={newCheque.bank_name}
                  onChangeText={(val) => setNewCheque({ ...newCheque, bank_name: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CHEQUE NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 894523"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newCheque.cheque_no}
                  onChangeText={(val) => setNewCheque({ ...newCheque, cheque_no: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AMOUNT (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newCheque.amount}
                  onChangeText={(val) => setNewCheque({ ...newCheque, amount: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>RECEIVED DATE (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-26"
                  placeholderTextColor={Colors.textLight}
                  value={newCheque.received_date}
                  onChangeText={(val) => setNewCheque({ ...newCheque, received_date: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SELECT CUSTOMER</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: Spacing.xs }}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {users.filter(u => u.role_id === null || u.role?.name?.toLowerCase().includes('client') || u.role?.name?.toLowerCase().includes('customer')).map(u => (
                        <Pressable 
                          key={u.id} 
                          style={[
                            styles.customerChip, 
                            newCheque.customer_id === u.id && styles.customerChipActive
                          ]}
                          onPress={() => setNewCheque({ ...newCheque, customer_id: u.id })}
                        >
                          <Text style={[
                            styles.customerChipText, 
                            newCheque.customer_id === u.id && styles.customerChipTextActive
                          ]}>
                            {u.full_name || u.fullName}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddCheque} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Register Cheque</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Bounce Reason Modal ── */}
      <Modal visible={bounceModalVisible} animationType="fade" transparent={true} onRequestClose={() => setBounceModalVisible(false)}>
        <View style={styles.bounceOverlay}>
          <View style={styles.bounceContent}>
            <Text style={styles.bounceTitle}>Record Cheque Bounce</Text>
            <Text style={styles.bounceSub}>Please enter the official reason for the bounce (e.g., Insufficient Funds, Signature Mismatch):</Text>
            
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingVertical: Spacing.sm }]}
              placeholder="Enter bounce reason..."
              placeholderTextColor={Colors.textLight}
              multiline
              value={bounceReason}
              onChangeText={setBounceReason}
            />

            <View style={styles.bounceActions}>
              <Pressable style={[styles.bounceBtn, styles.cancelBtn]} onPress={() => setBounceModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.bounceBtn, styles.confirmBtn]} onPress={submitBounce}>
                <Text style={styles.confirmBtnText}>Submit Bounce</Text>
              </Pressable>
            </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionIconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, marginVertical: Spacing.sm, paddingHorizontal: Spacing.md, height: 46 },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text, padding: 0 },
  
  filterWrapper: { height: 44, marginBottom: Spacing.xs },
  filterRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipTextActive: { color: Colors.white },
  
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bankName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  chequeNo: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardBody: { marginVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.sm, gap: 4 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dataLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  dataVal: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '700' },
  
  bounceBox: { marginTop: Spacing.xs, backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error + '20', padding: Spacing.sm, borderRadius: BorderRadius.sm },
  bounceLabel: { fontSize: 10, fontWeight: '800', color: Colors.error, textTransform: 'uppercase' },
  bounceText: { fontSize: FontSize.xs, color: Colors.text, marginTop: 2, fontWeight: '600' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  amount: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.sm },
  actionBtnText: { color: Colors.white, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  primaryBtn: { backgroundColor: Colors.primary },
  successBtn: { backgroundColor: Colors.success },
  dangerBtn: { backgroundColor: Colors.error },
  
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '85%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.xxl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },
  
  pickerContainer: { height: 50, justifyContent: 'center' },
  customerChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  customerChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  customerChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  customerChipTextActive: { color: Colors.primary, fontWeight: '700' },

  // Bounce dialog
  bounceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  bounceContent: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '100%', gap: Spacing.md },
  bounceTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  bounceSub: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
  bounceActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  bounceBtn: { flex: 1, height: 44, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700' },
  confirmBtn: { backgroundColor: Colors.error },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
