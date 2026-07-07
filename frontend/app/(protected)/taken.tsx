import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { getDB } from '../../src/lib/db';
import { useAuth } from '../../src/context/AuthContext';
import { usersService, User } from '../../src/services/users';

const { width } = Dimensions.get('window');
const LANE_WIDTH = width * 0.8;

type TakenStatus = 'collected_from_client' | 'submitted_to_office' | 'processing' | 'completed';

interface TakenCase {
  id: string;
  client_name: string;
  document_name: string;
  status: TakenStatus;
  updated_at: string;
}

const STATUS_LANES: { key: TakenStatus; label: string; icon: string; color: string }[] = [
  { key: 'collected_from_client', label: 'Collected from Client', icon: 'people-outline', color: '#3B82F6' },
  { key: 'submitted_to_office', label: 'Submitted to Office', icon: 'business-outline', color: '#F59E0B' },
  { key: 'processing', label: 'Processing', icon: 'time-outline', color: '#06B6D4' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline', color: '#10B981' },
];

export default function TakenCasesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [cases, setCases] = useState<TakenCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [newCase, setNewCase] = useState({
    client_name: '',
    document_name: '',
    customer_id: '',
  });

  // Load from local SQLite
  const loadLocalData = async () => {
    try {
      const db = await getDB();
      const dbCases = await db.getAllAsync<any>(
        'SELECT * FROM taken_cases ORDER BY updated_at DESC'
      );
      
      const localUsers = await usersService.list({ limit: 100 }).catch(() => []);
      setUsers(localUsers);
      
      setCases(dbCases);
    } catch (e) {
      console.error('[SQLite Taken] Load failed:', e);
    }
  };

  // Sync with Server
  const syncWithServer = async () => {
    try {
      const serverCases = await api.get<any[]>('/taken-cases').catch(() => null);
      if (!serverCases || !Array.isArray(serverCases)) {
        console.log('[Sync Taken] Backend not reachable. Relying on local database.');
        return;
      }

      const db = await getDB();
      for (const c of serverCases) {
        await db.runAsync(
          'INSERT OR REPLACE INTO taken_cases (id, client_name, document_name, status, updated_at) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.client_name, c.document_name, c.status, c.updated_at]
        );
      }
      
      await loadLocalData();
    } catch (e) {
      console.warn('[Sync Taken] Server sync skipped/failed:', e);
    }
  };

  useEffect(() => {
    loadLocalData().then(() => {
      syncWithServer();
    });
  }, []);

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

  // Add Case
  const handleAddCase = async () => {
    // Determine client name
    let clientName = newCase.client_name.trim();
    if (newCase.customer_id) {
      const selectedUser = users.find(u => u.id === newCase.customer_id);
      if (selectedUser) {
        clientName = selectedUser.full_name || selectedUser.fullName || '';
      }
    }

    if (!clientName || !newCase.document_name.trim()) {
      Alert.alert('Required Fields', 'Please select or enter a Client Name and enter the Document Name.');
      return;
    }

    setSaving(true);
    const generatedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nowStr = new Date().toISOString();

    const localRecord: TakenCase = {
      id: generatedId,
      client_name: clientName,
      document_name: newCase.document_name.trim(),
      status: 'collected_from_client',
      updated_at: nowStr,
    };

    try {
      const db = await getDB();
      await db.runAsync(
        'INSERT INTO taken_cases (id, client_name, document_name, status, updated_at) VALUES (?, ?, ?, ?, ?)',
        [localRecord.id, localRecord.client_name, localRecord.document_name, localRecord.status, localRecord.updated_at]
      );

      await loadLocalData();
      setAddModalVisible(false);
      setNewCase({
        client_name: '',
        document_name: '',
        customer_id: '',
      });

      // Post to API
      try {
        await api.post('/taken-cases', {
          client_name: localRecord.client_name,
          document_name: localRecord.document_name,
          status: localRecord.status,
        });
        syncWithServer();
      } catch (err) {
        console.log('[Taken API] POST failed, saved locally in SQLite.');
      }

      Alert.alert('Success', 'Document tracking case initialized.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create case.');
    } finally {
      setSaving(false);
    }
  };

  // Move to Next Lane
  const handleTransition = async (item: TakenCase) => {
    let nextStatus: TakenStatus | null = null;
    if (item.status === 'collected_from_client') nextStatus = 'submitted_to_office';
    else if (item.status === 'submitted_to_office') nextStatus = 'processing';
    else if (item.status === 'processing') nextStatus = 'completed';

    if (!nextStatus) return;

    try {
      const db = await getDB();
      const nowStr = new Date().toISOString();
      
      await db.runAsync(
        'UPDATE taken_cases SET status = ?, updated_at = ? WHERE id = ?',
        [nextStatus, nowStr, item.id]
      );

      await loadLocalData();

      // Push to API
      try {
        await api.patch(`/taken-cases/${item.id}`, { status: nextStatus });
      } catch (err) {
        console.log('[Taken API] Status transition sync failed, saved in SQLite.');
      }
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to transition case status.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Taken Cases</Text>
        
        <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Pull-to-refresh info */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
        <Text style={styles.infoBannerText}>Scroll horizontally to view the logistics pipeline lanes.</Text>
      </View>

      {/* Kanban Scroll View */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.kanbanContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {STATUS_LANES.map(lane => {
          const laneItems = cases.filter(c => c.status === lane.key);
          
          return (
            <View key={lane.key} style={styles.lane}>
              <View style={[styles.laneHeader, { borderLeftColor: lane.color }]}>
                <Ionicons name={lane.icon as any} size={18} color={lane.color} />
                <Text style={styles.laneLabel}>{lane.label}</Text>
                <View style={[styles.laneBadge, { backgroundColor: lane.color + '15' }]}>
                  <Text style={[styles.laneBadgeText, { color: lane.color }]}>{laneItems.length}</Text>
                </View>
              </View>

              <FlatList
                data={laneItems}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.laneList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyLane}>
                    <Ionicons name="folder-open-outline" size={32} color={Colors.textLight} />
                    <Text style={styles.emptyLaneText}>No cases in this stage</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.caseCard}>
                    <Text style={styles.clientName}>{item.client_name}</Text>
                    <Text style={styles.docName}>{item.document_name}</Text>
                    <Text style={styles.updatedAt}>Updated: {item.updated_at.split('T')[0]}</Text>

                    {item.status !== 'completed' && (
                      <Pressable 
                        style={[styles.moveBtn, { backgroundColor: lane.color }]} 
                        onPress={() => handleTransition(item)}
                      >
                        <Text style={styles.moveBtnText}>
                          {item.status === 'collected_from_client' && 'Submit to Office'}
                          {item.status === 'submitted_to_office' && 'Mark Processing'}
                          {item.status === 'processing' && 'Mark Completed'}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                      </Pressable>
                    )}
                  </View>
                )}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* ── Add Case Modal ── */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Document Pipeline Case</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>SELECT CLIENT (FROM SYSTEM)</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {users.filter(u => u.role_id === null || u.role?.name?.toLowerCase().includes('client')).map(u => (
                        <Pressable 
                          key={u.id} 
                          style={[
                            styles.customerChip, 
                            newCase.customer_id === u.id && styles.customerChipActive
                          ]}
                          onPress={() => setNewCase({ ...newCase, customer_id: u.id, client_name: '' })}
                        >
                          <Text style={[
                            styles.customerChipText, 
                            newCase.customer_id === u.id && styles.customerChipTextActive
                          ]}>
                            {u.full_name || u.fullName}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>OR ENTER CLIENT NAME (IF EXTERNAL) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={Colors.textLight}
                  value={newCase.client_name}
                  onChangeText={(val) => setNewCase({ ...newCase, client_name: val, customer_id: '' })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DOCUMENT NAME / LIFECYCLE TARGET *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. RC Book, Driving License, Insurance Copy"
                  placeholderTextColor={Colors.textLight}
                  value={newCase.document_name}
                  onChangeText={(val) => setNewCase({ ...newCase, document_name: val })}
                />
              </View>

              <Pressable style={styles.submitBtn} onPress={handleAddCase} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Initialize Tracking</Text>}
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
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: Colors.primaryLight + '40', borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoBannerText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  
  kanbanContainer: { padding: Spacing.md, gap: Spacing.md, flexDirection: 'row' },
  lane: { width: LANE_WIDTH, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, maxHeight: '95%' },
  laneHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, borderLeftWidth: 3, paddingLeft: Spacing.sm },
  laneLabel: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginLeft: Spacing.sm, flex: 1 },
  laneBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  laneBadgeText: { fontSize: 10, fontWeight: '800' },
  
  laneList: { paddingVertical: Spacing.md, gap: Spacing.sm },
  caseCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.xs },
  clientName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  docName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  updatedAt: { fontSize: 10, color: Colors.textLight },
  
  moveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, gap: 4 },
  moveBtnText: { color: Colors.white, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  emptyLane: { alignItems: 'center', paddingVertical: 60, gap: Spacing.xs },
  emptyLaneText: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },
  
  pickerContainer: { height: 50, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.xs },
  customerChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  customerChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  customerChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  customerChipTextActive: { color: Colors.primary, fontWeight: '700' },
});
