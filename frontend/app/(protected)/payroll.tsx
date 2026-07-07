import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { getDB } from '../../src/lib/db';
import { useAuth } from '../../src/context/AuthContext';
import { usersService, User } from '../../src/services/users';
import { exportToCSV } from '../../src/utils/exportHelper';

interface SalaryRecord {
  id: string;
  user_id: string;
  base_salary: number;
  commission_amount: number;
  bonus_amount: number;
  deductions: number;
  net_payable: number;
  disbursement_date: string | null;
  month_year: string;
  status: 'pending' | 'processed' | 'disbursed';
  created_at: string;
  user_name?: string; // resolved locally or from server
  user_role?: string;
}

export default function PayrollScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [newSalary, setNewSalary] = useState({
    user_id: '',
    base_salary: '',
    commission_amount: '0',
    bonus_amount: '0',
    deductions: '0',
    month_year: new Date().toISOString().substring(0, 7), // Format YYYY-MM
  });

  const roleUpper = user?.role?.toUpperCase() || '';
  const isAdminOrHR = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'HR MANAGER';
  const currentUserId = user?.id || '';

  // Load from SQLite
  const loadLocalData = async () => {
    try {
      const db = await getDB();
      
      // Load salary ledger (filter by user_id if employee)
      let query = 'SELECT * FROM salaries ORDER BY month_year DESC, created_at DESC';
      let params: any[] = [];
      if (!isAdminOrHR) {
        query = 'SELECT * FROM salaries WHERE user_id = ? ORDER BY month_year DESC, created_at DESC';
        params = [currentUserId];
      }
      
      const dbSalaries = await db.getAllAsync<any>(query, params);
      
      // Load users to map names
      const localUsers = await usersService.list({ limit: 100 }).catch(() => []);
      setUsers(localUsers);

      const mapped = dbSalaries.map(s => {
        const u = localUsers.find(usr => usr.id === s.user_id);
        const base = Number(s.base_salary || 0);
        const comm = Number(s.commission_amount || 0);
        const bonus = Number(s.bonus_amount || 0);
        const ded = Number(s.deductions || 0);
        const net = base + comm + bonus - ded;
        
        return {
          ...s,
          base_salary: base,
          commission_amount: comm,
          bonus_amount: bonus,
          deductions: ded,
          net_payable: net,
          user_name: u ? u.full_name || u.fullName : 'System Employee',
          user_role: u?.role?.name || 'Staff'
        };
      });

      setSalaries(mapped);
    } catch (e) {
      console.error('[SQLite Payroll] Load failed:', e);
    }
  };

  // Sync with Server
  const syncWithServer = async () => {
    try {
      const serverSalaries = await api.get<any[]>('/salaries').catch(() => null);
      if (!serverSalaries || !Array.isArray(serverSalaries)) {
        console.log('[Sync Payroll] Backend not reachable. Persisting entirely inside local SQLite.');
        return;
      }

      const db = await getDB();
      for (const s of serverSalaries) {
        const base = Number(s.base_salary || 0);
        const comm = Number(s.commission_amount || 0);
        const bonus = Number(s.bonus_amount || 0);
        const ded = Number(s.deductions || 0);
        const net = base + comm + bonus - ded;

        await db.runAsync(
          `INSERT OR REPLACE INTO salaries (
            id, user_id, base_salary, commission_amount, bonus_amount, deductions, net_payable, disbursement_date, month_year, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.user_id,
            base,
            comm,
            bonus,
            ded,
            net,
            s.disbursement_date,
            s.month_year,
            s.status,
            s.created_at
          ]
        );
      }
      
      await loadLocalData();
    } catch (e) {
      console.warn('[Sync Payroll] Server sync skipped/failed:', e);
    }
  };

  useEffect(() => {
    loadLocalData().then(() => {
      syncWithServer();
    });
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [currentUserId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    await syncWithServer();
    setRefreshing(false);
  };

  // Add Salary Entry
  const handleAddSalary = async () => {
    const base = parseFloat(newSalary.base_salary);
    const comm = parseFloat(newSalary.commission_amount || '0');
    const bonus = parseFloat(newSalary.bonus_amount || '0');
    const ded = parseFloat(newSalary.deductions || '0');

    if (!newSalary.user_id || isNaN(base) || base < 0 || !/^\d{4}-\d{2}$/.test(newSalary.month_year)) {
      Alert.alert('Invalid Input', 'Please select a user, provide a valid base salary, and use YYYY-MM format for month.');
      return;
    }

    setSaving(true);
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nowStr = new Date().toISOString();
    const net = base + comm + bonus - ded;

    const localRecord = {
      id: generatedId,
      user_id: newSalary.user_id,
      base_salary: base,
      commission_amount: comm,
      bonus_amount: bonus,
      deductions: ded,
      net_payable: net,
      disbursement_date: null,
      month_year: newSalary.month_year,
      status: 'pending' as const,
      created_at: nowStr
    };

    try {
      const db = await getDB();
      await db.runAsync(
        `INSERT INTO salaries (
          id, user_id, base_salary, commission_amount, bonus_amount, deductions, net_payable, disbursement_date, month_year, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          localRecord.id,
          localRecord.user_id,
          localRecord.base_salary,
          localRecord.commission_amount,
          localRecord.bonus_amount,
          localRecord.deductions,
          localRecord.net_payable,
          localRecord.disbursement_date,
          localRecord.month_year,
          localRecord.status,
          localRecord.created_at
        ]
      );

      await loadLocalData();
      setAddModalVisible(false);
      setNewSalary({
        user_id: '',
        base_salary: '',
        commission_amount: '0',
        bonus_amount: '0',
        deductions: '0',
        month_year: new Date().toISOString().substring(0, 7),
      });

      // Post to API
      try {
        await api.post('/salaries', {
          user_id: localRecord.user_id,
          base_salary: localRecord.base_salary,
          commission_amount: localRecord.commission_amount,
          bonus_amount: localRecord.bonus_amount,
          deductions: localRecord.deductions,
          month_year: localRecord.month_year
        });
        syncWithServer();
      } catch (err) {
        console.log('[Payroll API] POST failed, saved in local SQLite database.');
      }

      Alert.alert('Success', 'Payroll record created successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payroll entry.');
    } finally {
      setSaving(false);
    }
  };

  // Process / Disburse Payroll Lifecycle Actions
  const handleUpdateStatus = async (record: SalaryRecord, newStatus: 'processed' | 'disbursed') => {
    const isDisburse = newStatus === 'disbursed';
    const disDate = isDisburse ? new Date().toISOString().split('T')[0] : null;
    
    Alert.alert(
      `${newStatus.toUpperCase()} Payroll`,
      `Are you sure you want to mark this salary record for ${record.user_name} (${record.month_year}) as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const db = await getDB();
              await db.runAsync(
                'UPDATE salaries SET status = ?, disbursement_date = ? WHERE id = ?',
                [newStatus, disDate, record.id]
              );
              
              await loadLocalData();
              
              // Push to API
              try {
                await api.patch(`/salaries/${record.id}`, { status: newStatus, disbursement_date: disDate });
              } catch (serverErr) {
                console.log('[Payroll Sync] Status update skipped for API. Saved in SQLite.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to update payroll status.');
            }
          }
        }
      ]
    );
  };

  // Export to CSV
  const handleExport = () => {
    if (salaries.length === 0) {
      Alert.alert('No Data', 'No payroll records available to export.');
      return;
    }

    const headers = ['Employee Name', 'Month-Year', 'Base Salary (INR)', 'Commission (INR)', 'Bonus (INR)', 'Deductions (INR)', 'Net Payable (INR)', 'Disbursement Date', 'Status'];
    const rows = salaries.map(s => [
      s.user_name || 'System Employee',
      s.month_year,
      s.base_salary,
      s.commission_amount,
      s.bonus_amount,
      s.deductions,
      s.net_payable,
      s.disbursement_date || 'N/A',
      s.status.toUpperCase()
    ]);

    exportToCSV(`payroll_ledger_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // Analytics Computation
  const totalNetCost = salaries.reduce((sum, s) => sum + s.net_payable, 0);
  const disbursedCount = salaries.filter(s => s.status === 'disbursed').length;
  const pendingCount = salaries.filter(s => s.status === 'pending').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Payroll Ledger</Text>
        
        <View style={styles.headerActions}>
          <Pressable style={styles.actionIconBtn} onPress={handleExport}>
            <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
          </Pressable>
          {isAdminOrHR && (
            <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add" size={22} color={Colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Analytics Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.primary }]}>
            <Text style={styles.summaryLabel}>Total Net Payroll</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              ₹{totalNetCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.summaryLabel}>Disbursed / Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{disbursedCount} records</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.summaryLabel}>Awaiting Payout</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{pendingCount} records</Text>
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={salaries}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No payroll disbursements found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusTheme = StatusColors[item.status] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
          
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.employeeName}>{item.user_name}</Text>
                  <Text style={styles.employeeRole}>{item.user_role} · Cycle: {item.month_year}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusTheme.dot }]} />
                  <Text style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.cardBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Base Salary:</Text>
                  <Text style={styles.breakdownVal}>₹{item.base_salary.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Commissions:</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.success }]}>+₹{item.commission_amount.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Bonus:</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.success }]}>+₹{item.bonus_amount.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Deductions:</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.error }]}>-₹{item.deductions.toLocaleString()}</Text>
                </View>
              </View>

              {item.disbursement_date && (
                <View style={styles.disbursedRow}>
                  <Text style={styles.disbursedLabel}>Disbursed On:</Text>
                  <Text style={styles.disbursedVal}>{item.disbursement_date}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.netLabel}>NET PAYABLE</Text>
                  <Text style={styles.netValue}>₹{item.net_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>

                {isAdminOrHR && (
                  <View style={styles.actions}>
                    {item.status === 'pending' && (
                      <Pressable style={[styles.actionBtn, styles.primaryBtn]} onPress={() => handleUpdateStatus(item, 'processed')}>
                        <Text style={styles.actionBtnText}>Process</Text>
                      </Pressable>
                    )}
                    {item.status === 'processed' && (
                      <Pressable style={[styles.actionBtn, styles.successBtn]} onPress={() => handleUpdateStatus(item, 'disbursed')}>
                        <Text style={styles.actionBtnText}>Disburse</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── Add Salary Modal ── */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Salary Disbursement</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>SELECT EMPLOYEE / AGENT *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {users.filter(u => u.role_id !== null && !u.role?.name?.toLowerCase().includes('client')).map(u => (
                        <Pressable 
                          key={u.id} 
                          style={[
                            styles.customerChip, 
                            newSalary.user_id === u.id && styles.customerChipActive
                          ]}
                          onPress={() => setNewSalary({ ...newSalary, user_id: u.id })}
                        >
                          <Text style={[
                            styles.customerChipText, 
                            newSalary.user_id === u.id && styles.customerChipTextActive
                          ]}>
                            {u.full_name || u.fullName} ({u.role?.name})
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BASE SALARY (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newSalary.base_salary}
                  onChangeText={(val) => setNewSalary({ ...newSalary, base_salary: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>COMMISSION AMOUNT (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newSalary.commission_amount}
                  onChangeText={(val) => setNewSalary({ ...newSalary, commission_amount: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BONUS AMOUNT (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newSalary.bonus_amount}
                  onChangeText={(val) => setNewSalary({ ...newSalary, bonus_amount: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DEDUCTIONS / TAXES (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newSalary.deductions}
                  onChangeText={(val) => setNewSalary({ ...newSalary, deductions: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>MONTH CYCLE (YYYY-MM) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06"
                  placeholderTextColor={Colors.textLight}
                  value={newSalary.month_year}
                  onChangeText={(val) => setNewSalary({ ...newSalary, month_year: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddSalary} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Disburse Salary</Text>}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionIconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  
  summaryContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  summaryRow: { flexDirection: 'row', gap: 6 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  summaryLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: FontSize.md - 1, fontWeight: '900', marginTop: 2 },
  
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  employeeName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  employeeRole: { fontSize: FontSize.xs - 1, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardBreakdown: { marginVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.sm, gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  breakdownVal: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '700' },
  
  disbursedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.sm },
  disbursedLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },
  disbursedVal: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '800' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  netLabel: { fontSize: 8, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  netValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.sm },
  actionBtnText: { color: Colors.white, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  primaryBtn: { backgroundColor: Colors.primary },
  successBtn: { backgroundColor: Colors.success },
  
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
  
  pickerContainer: { height: 50, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.xs },
  customerChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  customerChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  customerChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  customerChipTextActive: { color: Colors.primary, fontWeight: '700' },
});
