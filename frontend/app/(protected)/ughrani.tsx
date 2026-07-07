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

interface UghraniBook {
  id: string;
  book_name: string;
  created_at: string;
}

interface UghraniAssignment {
  id: string;
  book_id: string;
  agent_id: string;
  customer_id: string;
  amount_due: number;
  status: 'pending' | 'collected' | 'partially_collected';
  collected_amount: number;
  collected_date: string | null;
  created_at: string;
  book_name?: string;
  agent_name?: string;
  customer_name?: string;
}

export default function UghraniScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Views & Filters
  const [activeTab, setActiveTab] = useState<'books' | 'assignments'>('books');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'collected' | 'partially_collected'>('all');
  
  const [books, setBooks] = useState<UghraniBook[]>([]);
  const [assignments, setAssignments] = useState<UghraniAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modals
  const [addBookModalVisible, setAddBookModalVisible] = useState(false);
  const [addAssignmentModalVisible, setAddAssignmentModalVisible] = useState(false);
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<UghraniAssignment | null>(null);
  
  // Form States
  const [saving, setSaving] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newAssignment, setNewAssignment] = useState({
    book_id: '',
    agent_id: '',
    customer_id: '',
    amount_due: '',
  });
  
  // Collection logging Form State
  const [collectAmount, setCollectAmount] = useState('');

  const roleUpper = user?.role?.toUpperCase() || '';
  const isAdminOrManager = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'MANAGER';
  const currentAgentId = user?.id || '';

  // Load from SQLite
  const loadLocalData = async () => {
    try {
      const db = await getDB();
      
      // Load books
      const dbBooks = await db.getAllAsync<UghraniBook>(
        'SELECT * FROM ughrani_books ORDER BY created_at DESC'
      );
      
      // Load assignments (if agent, restrict to currentAgentId)
      let query = 'SELECT * FROM ughrani_assignments ORDER BY created_at DESC';
      let params: any[] = [];
      if (!isAdminOrManager) {
        query = 'SELECT * FROM ughrani_assignments WHERE agent_id = ? ORDER BY created_at DESC';
        params = [currentAgentId];
      }
      
      const dbAssignments = await db.getAllAsync<any>(query, params);
      
      // Load users
      const localUsers = await usersService.list({ limit: 100 }).catch(() => []);
      setUsers(localUsers);

      // Map names to assignments
      const mappedAssignments = dbAssignments.map(asg => {
        const book = dbBooks.find(b => b.id === asg.book_id);
        const agent = localUsers.find(u => u.id === asg.agent_id);
        const cust = localUsers.find(u => u.id === asg.customer_id);
        return {
          ...asg,
          book_name: book ? book.book_name : 'Unknown Book',
          agent_name: agent ? agent.full_name || agent.fullName : 'Unknown Agent',
          customer_name: cust ? cust.full_name || cust.fullName : 'Unknown Customer'
        };
      });

      setBooks(dbBooks);
      setAssignments(mappedAssignments);
    } catch (e) {
      console.error('[SQLite Ughrani] Load failed:', e);
    }
  };

  // Sync with Server
  const syncWithServer = async () => {
    try {
      // 1. Sync Books
      const serverBooks = await api.get<any[]>('/ughrani/books').catch(() => null);
      const db = await getDB();
      
      if (serverBooks && Array.isArray(serverBooks)) {
        for (const b of serverBooks) {
          await db.runAsync(
            'INSERT OR REPLACE INTO ughrani_books (id, book_name, created_at) VALUES (?, ?, ?)',
            [b.id, b.book_name, b.created_at]
          );
        }
      }

      // 2. Sync Assignments
      const serverAssignments = await api.get<any[]>('/ughrani/assignments').catch(() => null);
      if (serverAssignments && Array.isArray(serverAssignments)) {
        for (const a of serverAssignments) {
          await db.runAsync(
            `INSERT OR REPLACE INTO ughrani_assignments (
              id, book_id, agent_id, customer_id, amount_due, status, collected_amount, collected_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              a.id,
              a.book_id,
              a.agent_id,
              a.customer_id,
              Number(a.amount_due),
              a.status,
              Number(a.collected_amount || 0),
              a.collected_date,
              a.created_at
            ]
          );
        }
      }
      
      await loadLocalData();
    } catch (e) {
      console.warn('[Sync Ughrani] Server sync skipped/failed:', e);
    }
  };

  useEffect(() => {
    loadLocalData().then(() => {
      syncWithServer();
    });
  }, [currentAgentId]);

  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [currentAgentId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    await syncWithServer();
    setRefreshing(false);
  };

  // Add Book
  const handleAddBook = async () => {
    if (!newBookName.trim()) {
      Alert.alert('Required', 'Book name is required.');
      return;
    }

    setSaving(true);
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nowStr = new Date().toISOString();

    try {
      const db = await getDB();
      await db.runAsync(
        'INSERT INTO ughrani_books (id, book_name, created_at) VALUES (?, ?, ?)',
        [generatedId, newBookName.trim(), nowStr]
      );
      
      await loadLocalData();
      setAddBookModalVisible(false);
      setNewBookName('');
      
      // Post to API
      try {
        await api.post('/ughrani/books', { book_name: newBookName.trim() });
        syncWithServer();
      } catch (err) {
        console.log('[Ughrani API] Book POST failed, saved in SQLite.');
      }
      
      Alert.alert('Success', 'Collection book created locally.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create book.');
    } finally {
      setSaving(false);
    }
  };

  // Add Assignment
  const handleAddAssignment = async () => {
    const amt = parseFloat(newAssignment.amount_due);
    if (!newAssignment.book_id || !newAssignment.agent_id || !newAssignment.customer_id || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Input', 'All fields are required and amount must be positive.');
      return;
    }

    setSaving(true);
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nowStr = new Date().toISOString();

    try {
      const db = await getDB();
      await db.runAsync(
        `INSERT INTO ughrani_assignments (
          id, book_id, agent_id, customer_id, amount_due, status, collected_amount, collected_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generatedId,
          newAssignment.book_id,
          newAssignment.agent_id,
          newAssignment.customer_id,
          amt,
          'pending',
          0,
          null,
          nowStr
        ]
      );

      await loadLocalData();
      setAddAssignmentModalVisible(false);
      setNewAssignment({
        book_id: '',
        agent_id: '',
        customer_id: '',
        amount_due: '',
      });

      // Post to API
      try {
        await api.post('/ughrani/assignments', {
          book_id: newAssignment.book_id,
          agent_id: newAssignment.agent_id,
          customer_id: newAssignment.customer_id,
          amount_due: amt
        });
        syncWithServer();
      } catch (err) {
        console.log('[Ughrani API] Assignment POST failed, saved in SQLite.');
      }

      Alert.alert('Success', 'Assignment recorded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  // Log payment/collection
  const triggerCollect = (asg: UghraniAssignment) => {
    setSelectedAssignment(asg);
    setCollectAmount(String(asg.amount_due - asg.collected_amount));
    setCollectModalVisible(true);
  };

  const submitCollection = async () => {
    if (!selectedAssignment) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount.');
      return;
    }

    const totalCollected = Number(selectedAssignment.collected_amount || 0) + amt;
    const isFull = totalCollected >= selectedAssignment.amount_due;
    const newStatus = isFull ? 'collected' : 'partially_collected';
    const nowStr = new Date().toISOString();

    setCollectModalVisible(false);
    try {
      const db = await getDB();
      await db.runAsync(
        `UPDATE ughrani_assignments SET 
          status = ?, collected_amount = ?, collected_date = ? 
         WHERE id = ?`,
        [newStatus, totalCollected, nowStr, selectedAssignment.id]
      );

      await loadLocalData();

      // Push to API
      try {
        await api.patch(`/ughrani/assignments/${selectedAssignment.id}`, {
          status: newStatus,
          collected_amount: totalCollected,
          collected_date: nowStr
        });
      } catch (err) {
        console.log('[Ughrani API] Sync payment log failed, saved in SQLite.');
      }

      Alert.alert('Success', `Collection of ₹${amt.toLocaleString()} recorded successfully.`);
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to record collection.');
    } finally {
      setSelectedAssignment(null);
    }
  };

  // Export Book to CSV
  const handleExportBook = (book: UghraniBook) => {
    const bookAssignments = assignments.filter(a => a.book_id === book.id);
    if (bookAssignments.length === 0) {
      Alert.alert('No Data', 'No collection assignments in this book to export.');
      return;
    }

    const headers = ['Client Name', 'Collection Agent', 'Amount Due (INR)', 'Collected Amount (INR)', 'Status', 'Collection Date'];
    const rows = bookAssignments.map(a => [
      a.customer_name || 'Unknown',
      a.agent_name || 'Unknown',
      a.amount_due,
      a.collected_amount || 0,
      a.status.toUpperCase(),
      a.collected_date || 'N/A'
    ]);

    exportToCSV(`ughrani_book_${book.book_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // Compute stats for book cards
  const getBookStats = (bookId: string) => {
    const bookAsgs = assignments.filter(a => a.book_id === bookId);
    const paid = bookAsgs.filter(a => a.status === 'collected').length;
    const total = bookAsgs.length;
    const totalDue = bookAsgs.reduce((sum, a) => sum + a.amount_due, 0);
    const totalCol = bookAsgs.reduce((sum, a) => sum + (a.collected_amount || 0), 0);
    return { paid, total, totalDue, totalCol };
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(asg => {
    if (assignmentFilter === 'all') return true;
    return asg.status === assignmentFilter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Ughrani Collections</Text>
        
        {isAdminOrManager && (
          <View style={styles.headerActions}>
            {activeTab === 'books' ? (
              <Pressable style={styles.addBtn} onPress={() => setAddBookModalVisible(true)}>
                <Ionicons name="book-outline" size={20} color={Colors.primary} />
              </Pressable>
            ) : (
              <Pressable style={styles.addBtn} onPress={() => setAddAssignmentModalVisible(true)}>
                <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'books' && styles.tabActive]} 
          onPress={() => setActiveTab('books')}
        >
          <Text style={[styles.tabText, activeTab === 'books' && styles.tabTextActive]}>COLLECTION BOOKS</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'assignments' && styles.tabActive]} 
          onPress={() => setActiveTab('assignments')}
        >
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}>
            {isAdminOrManager ? 'ALL ASSIGNMENTS' : 'MY CHECKLIST'}
          </Text>
        </Pressable>
      </View>

      {/* Book tab content */}
      {activeTab === 'books' && (
        <FlatList
          data={books}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No collection books available</Text>
            </View>
          }
          renderItem={({ item }) => {
            const stats = getBookStats(item.id);
            return (
              <View style={styles.bookCard}>
                <View style={styles.bookHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookName}>{item.book_name}</Text>
                    <Text style={styles.bookMeta}>Created: {item.created_at.split('T')[0]}</Text>
                  </View>
                  <View style={styles.bookBadge}>
                    <Text style={styles.bookBadgeText}>{stats.paid}/{stats.total} paid</Text>
                  </View>
                </View>
                
                <View style={styles.bookProgressRow}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.bookSummary}>
                  <View>
                    <Text style={styles.summaryLabel}>Total Due</Text>
                    <Text style={styles.summaryVal}>₹{stats.totalDue.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.summaryLabel}>Collected</Text>
                    <Text style={[styles.summaryVal, { color: Colors.success }]}>₹{stats.totalCol.toLocaleString()}</Text>
                  </View>
                </View>

                {isAdminOrManager && (
                  <Pressable style={styles.bookExportBtn} onPress={() => handleExportBook(item)}>
                    <Ionicons name="cloud-download-outline" size={16} color={Colors.primary} />
                    <Text style={styles.bookExportText}>EXPORT BOOK DETAILS</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Assignments tab content */}
      {activeTab === 'assignments' && (
        <View style={{ flex: 1 }}>
          {/* Filters */}
          <View style={styles.subFilters}>
            {['all', 'pending', 'collected', 'partially_collected'].map(s => (
              <Pressable 
                key={s} 
                style={[styles.subChip, assignmentFilter === s && styles.subChipActive]} 
                onPress={() => setAssignmentFilter(s as any)}
              >
                <Text style={[styles.subChipText, assignmentFilter === s && styles.subChipTextActive]}>
                  {s === 'partially_collected' ? 'partial' : s}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={filteredAssignments}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 60 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>No assignments found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const statusTheme = StatusColors[item.status] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{item.customer_name}</Text>
                      <Text style={styles.bookMeta}>Book: {item.book_name}</Text>
                      {isAdminOrManager && <Text style={styles.bookMeta}>Agent: {item.agent_name}</Text>}
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusTheme.bg }]}>
                      <View style={[styles.badgeDot, { backgroundColor: statusTheme.dot }]} />
                      <Text style={[styles.badgeText, { color: statusTheme.text }]}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardStats}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Target Amount</Text>
                      <Text style={styles.statVal}>₹{Number(item.amount_due).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Collected</Text>
                      <Text style={[styles.statVal, { color: Colors.success }]}>
                        ₹{Number(item.collected_amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {item.status !== 'collected' && (
                    <Pressable style={styles.collectBtn} onPress={() => triggerCollect(item)}>
                      <Ionicons name="cash-outline" size={16} color={Colors.white} />
                      <Text style={styles.collectBtnText}>Record Payment Collection</Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ── Add Book Modal ── */}
      <Modal visible={addBookModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddBookModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Collection Book</Text>
              <Pressable onPress={() => setAddBookModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>BOOK NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Morbi Town Area"
                  placeholderTextColor={Colors.textLight}
                  value={newBookName}
                  onChangeText={setNewBookName}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddBook} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Create Book</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Assignment Modal ── */}
      <Modal visible={addAssignmentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddAssignmentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Collection Task</Text>
              <Pressable onPress={() => setAddAssignmentModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>SELECT COLLECTION BOOK *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {books.map(b => (
                        <Pressable 
                          key={b.id} 
                          style={[styles.customerChip, newAssignment.book_id === b.id && styles.customerChipActive]}
                          onPress={() => setNewAssignment({ ...newAssignment, book_id: b.id })}
                        >
                          <Text style={[styles.customerChipText, newAssignment.book_id === b.id && styles.customerChipTextActive]}>
                            {b.book_name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SELECT AGENT / FIELD STAFF *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {users.filter(u => u.role_id !== null && !u.role?.name?.toLowerCase().includes('client')).map(u => (
                        <Pressable 
                          key={u.id} 
                          style={[styles.customerChip, newAssignment.agent_id === u.id && styles.customerChipActive]}
                          onPress={() => setNewAssignment({ ...newAssignment, agent_id: u.id })}
                        >
                          <Text style={[styles.customerChipText, newAssignment.agent_id === u.id && styles.customerChipTextActive]}>
                            {u.full_name || u.fullName} ({u.role?.name})
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SELECT CLIENT / CUSTOMER *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {users.filter(u => u.role_id === null || u.role?.name?.toLowerCase().includes('client')).map(u => (
                        <Pressable 
                          key={u.id} 
                          style={[styles.customerChip, newAssignment.customer_id === u.id && styles.customerChipActive]}
                          onPress={() => setNewAssignment({ ...newAssignment, customer_id: u.id })}
                        >
                          <Text style={[styles.customerChipText, newAssignment.customer_id === u.id && styles.customerChipTextActive]}>
                            {u.full_name || u.fullName}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>AMOUNT DUE (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newAssignment.amount_due}
                  onChangeText={(val) => setNewAssignment({ ...newAssignment, amount_due: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddAssignment} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Assign Task</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Log Collection Modal ── */}
      <Modal visible={collectModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCollectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Collection</Text>
              <Pressable onPress={() => setCollectModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.bounceSub}>
                Record amount collected from {selectedAssignment?.customer_name}. Outstanding: ₹
                {selectedAssignment ? (selectedAssignment.amount_due - selectedAssignment.collected_amount).toLocaleString() : 0}
              </Text>

              <View style={[styles.field, { marginTop: Spacing.md }]}>
                <Text style={styles.label}>COLLECTED AMOUNT (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={collectAmount}
                  onChangeText={setCollectAmount}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={submitCollection}>
                <Text style={styles.submitBtnText}>Record Payment</Text>
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
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF' },
  tab: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  tabTextActive: { color: Colors.primary },
  
  bookCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  bookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  bookMeta: { fontSize: FontSize.xs - 1, color: Colors.textMuted, marginTop: 1 },
  bookBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryLight },
  bookBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase' },
  
  bookProgressRow: { marginVertical: Spacing.md },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary },
  
  bookSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  summaryVal: { fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginTop: 2 },
  
  bookExportBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  bookExportText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  
  subFilters: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs, backgroundColor: '#FFFFFF' },
  subChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  subChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  subChipText: { fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  subChipTextActive: { color: Colors.white },
  
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  clientName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.md },
  statBox: { flex: 1 },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  statVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: 2 },
  
  collectBtn: { flexDirection: 'row', height: 42, borderRadius: BorderRadius.sm, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs },
  collectBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '600' },

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
  bounceSub: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
});
