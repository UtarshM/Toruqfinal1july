import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  StatusBar, 
  Alert, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard 
} from 'react-native';
import AppFooter from '../../src/components/AppFooter';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { checkAndApplyUpdate } from '../../src/components/UpdateManager';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { getDB } from '../../src/lib/db';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import { saveFileToDevice } from '../../src/utils/fileSaver';

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editName?: string; edit?: string }>();
  const { user, logout, updateUser, refreshUser } = useAuth();

  // Edit Name Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || user?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // OTA Update Check State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const roleUpper = user?.role?.toUpperCase() || '';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN';

  const handleOpenEditModal = () => {
    setEditName(user?.name || user?.full_name || '');
    setEditPhone(user?.phone || '');
    setModalVisible(true);
  };

  // Auto-open modal if navigated with ?editName=true
  useEffect(() => {
    if (params.editName === 'true' || params.edit === 'true') {
      handleOpenEditModal();
    }
  }, [params.editName, params.edit, user?.name, user?.full_name]);

  const handleSaveName = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Validation Error', 'Please enter a valid full name (at least 2 characters).');
      return;
    }

    setIsSaving(true);
    const trimmedPhone = editPhone.trim();

    // 1. Instant Optimistic UI update
    await updateUser({
      name: trimmedName,
      full_name: trimmedName,
      phone: trimmedPhone || user?.phone || '',
    }).catch(() => {});

    setModalVisible(false);
    Alert.alert('Success 🎉', `Your name has been updated to "${trimmedName}".`);

    // 2. Sync to Backend in background
    try {
      try {
        await api.patch('/auth/me', {
          fullName: trimmedName,
          personalMobile: trimmedPhone || undefined,
        });
      } catch (err: any) {
        if (user?.id) {
          await api.patch(`/users/${user.id}`, {
            fullName: trimmedName,
            personalMobile: trimmedPhone || undefined,
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[settings] Background sync error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      await checkAndApplyUpdate(true);
    } catch (err: any) {
      Alert.alert('Update Check', err?.message || 'Failed to check for updates.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const sections = [
    { title: 'Account', items: [
      { 
        label: 'Edit Name & Profile', 
        icon: 'person-outline', 
        desc: 'Change your full name and contact details',
        onPress: handleOpenEditModal
      },
      { label: 'Change PIN', icon: 'keypad-outline', desc: 'Update your 4-digit PIN' },
      { label: 'Security', icon: 'shield-outline', desc: 'Password and authentication' },
    ]},
    { title: 'App Settings', items: [
      {
        label: 'Check for Updates (OTA)',
        icon: 'cloud-download-outline',
        desc: 'Download latest app improvements over-the-air',
        onPress: handleCheckUpdate
      },
      { label: 'Notifications', icon: 'notifications-outline', desc: 'Manage push notifications', onPress: () => router.push('/(protected)/notifications') },
      { label: 'Data & Storage', icon: 'cloud-outline', desc: 'Cache and data management' },
      { label: 'Language', icon: 'language-outline', desc: 'App language preferences' },
    ]},
    { title: 'About', items: [
      { label: 'Help & Support', icon: 'help-circle-outline', desc: 'Get help and FAQs' },
      { label: 'Terms of Service', icon: 'document-outline', desc: 'Terms and conditions' },
      { label: 'Privacy Policy', icon: 'lock-closed-outline', desc: 'How we handle your data' },
      { label: 'Version', icon: 'information-circle-outline', desc: 'Torque Auto Advisor v2.0.0' },
    ]},
  ];

  const adminSection = isAdmin ? {
    title: 'Administration',
    items: [
      { 
        label: 'System Backup', 
        icon: 'cloud-download-outline', 
        desc: 'Generate and export full SQL backup of the database',
        onPress: async () => {
          Alert.alert(
            'System Backup',
            'Generate a secure database backup SQL dump now?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Generate SQL',
                onPress: async () => {
                  try {
                    const response = await api.get('/system/backup').catch(() => null);
                    let sqlContent = `-- Torque Auto Advisor SQL Backup\n-- Generated on ${new Date().toISOString()}\n\n`;
                    
                    if (response && response.sql) {
                      sqlContent += response.sql;
                    } else {
                      sqlContent += `-- SQLite Local DB Backup\n`;
                      const db = await getDB();
                      
                      const tables = ['general_cache', 'cheques', 'ughrani_books', 'ughrani_assignments', 'taken_cases', 'salaries'];
                      for (const t of tables) {
                        sqlContent += `\n-- Table: ${t}\n`;
                        const rows = await db.getAllAsync(`SELECT * FROM ${t}`).catch(() => []);
                        sqlContent += `-- Found ${rows.length} records inside local table\n`;
                      }
                    }

                    const fileUri = `${FileSystem.documentDirectory}torque_backup_${new Date().toISOString().split('T')[0]}.sql`;
                    await FileSystem.writeAsStringAsync(fileUri, sqlContent);
                    
                    const filename = `torque_backup_${new Date().toISOString().split('T')[0]}.sql`;
                    await saveFileToDevice(fileUri, filename, 'application/x-sql');
                  } catch (e: any) {
                    Alert.alert('Backup Error', e.message || 'Failed to trigger database backup.');
                  }
                }
              }
            ]
          );
        }
      }
    ]
  } : null;

  const activeSections = [
    ...sections,
    ...(adminSection ? [adminSection] : [])
  ];

  // Group permissions by module safely
  const permGroups: Record<string, string[]> = {};
  (user?.permissions || []).forEach(p => {
    if (!p) return;
    const permStr = typeof p === 'string' ? p : ((p as any)?.name || (p as any)?.permission || (p as any)?.action || '');
    if (!permStr || typeof permStr !== 'string') return;

    if (permStr === '*') {
      if (!permGroups['ALL']) permGroups['ALL'] = [];
      permGroups['ALL'].push('Full Access');
      return;
    }

    const parts = permStr.split('.');
    if (parts.length > 1) {
      const mod = parts[0] || 'GENERAL';
      const action = parts.slice(1).join('.') || parts[0];
      if (!permGroups[mod]) permGroups[mod] = [];
      permGroups[mod].push(action);
    } else {
      const mod = 'GENERAL';
      const action = parts[0] || 'access';
      if (!permGroups[mod]) permGroups[mod] = [];
      permGroups[mod].push(action);
    }
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll}>

        {/* Profile Card with Edit Name Action */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || user?.full_name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || user?.full_name || '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            {user?.phone ? <Text style={styles.profilePhone}>{user.phone}</Text> : null}
          </View>
          <Pressable 
            testID="edit-profile-btn"
            style={styles.editBtn}
            onPress={handleOpenEditModal}
          >
            <Ionicons name="pencil" size={15} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {!user?.is_active && (
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text style={styles.pendingText}>Account Pending Approval</Text>
          </View>
        )}

        {/* Dedicated OTA Update Card */}
        <View style={styles.otaCard}>
          <View style={styles.otaHeader}>
            <View style={styles.otaIconWrap}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.otaTitle}>Over-The-Air (OTA) Updates</Text>
                <View style={styles.channelBadge}>
                  <Text style={styles.channelText}>{(Updates.channel || 'preview').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.otaDesc}>Instant updates without reinstalling APK</Text>
            </View>
          </View>

          <View style={styles.otaFooter}>
            <View style={styles.otaMeta}>
              <Text style={styles.otaMetaLabel}>Version: <Text style={styles.otaMetaVal}>v2.0.0</Text></Text>
              <Text style={styles.otaMetaDot}>•</Text>
              <Text style={styles.otaMetaLabel}>Runtime: <Text style={styles.otaMetaVal}>{Updates.runtimeVersion || '2.0.0'}</Text></Text>
            </View>
            <Pressable
              testID="ota-check-button"
              style={[styles.otaCheckBtn, isCheckingUpdate && { opacity: 0.7 }]}
              onPress={handleCheckUpdate}
              disabled={isCheckingUpdate}
            >
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.otaCheckBtnText}>Check Updates</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* My Role Card */}
        <View style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.roleName}>{user?.role || 'No Role Assigned'}</Text>
          </View>

          {Object.keys(permGroups).length > 0 ? (
            <>
              <Text style={styles.roleSubtitle}>Your Permissions</Text>
              <View style={styles.permGrid}>
                {Object.entries(permGroups).map(([mod, actions]) => (
                  <View key={mod} style={styles.permModule}>
                    <Text style={styles.permModName}>{String(mod || '').toUpperCase()}</Text>
                    <View style={styles.permActions}>
                      {(actions || []).filter(Boolean).map((a, idx) => {
                        const label = typeof a === 'string' ? a.replace(/_/g, ' ') : String(a || '');
                        return (
                          <View key={`${a}-${idx}`} style={styles.permChip}>
                            <Text style={styles.permChipText}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noPerms}>No permissions assigned. Contact your admin.</Text>
          )}
        </View>

        {/* Settings Sections */}
        {activeSections.map((sec, si) => (
          <View key={si}>
            <Text style={styles.sectionTitle}>{String(sec?.title || '').toUpperCase()}</Text>
            {(sec?.items || []).map((item: any, ii: number) => {
              const label = String(item?.label || '');
              const testId = `setting-${label.toLowerCase().replace(/\s+/g, '-')}`;
              return (
                <Pressable
                  key={ii}
                  testID={testId}
                  style={styles.item}
                  onPress={item?.onPress}
                >
                  <Ionicons name={(item?.icon as any) || 'ellipse-outline'} size={22} color={Colors.textMuted} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>{label}</Text>
                    <Text style={styles.itemDesc}>{item?.desc || ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable
          testID="logout-btn"
          style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace('/'); }}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name & Profile Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) setModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardWrap}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Edit Name & Profile</Text>
                    <Text style={styles.modalSubtitle}>Update your display name visible across the app.</Text>
                  </View>
                  <Pressable 
                    onPress={() => setModalVisible(false)}
                    disabled={isSaving}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Full Name <Text style={{ color: Colors.error }}>*</Text>
                    </Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        testID="edit-fullname-input"
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Enter your full name"
                        placeholderTextColor={Colors.textLight}
                        style={styles.textInput}
                        autoCapitalize="words"
                        autoCorrect={false}
                        editable={!isSaving}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        testID="edit-phone-input"
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="Enter your mobile number"
                        placeholderTextColor={Colors.textLight}
                        style={styles.textInput}
                        keyboardType="phone-pad"
                        editable={!isSaving}
                      />
                    </View>
                  </View>

                  <View style={styles.roleNotice}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.roleNoticeText}>
                      Role: <Text style={{ fontWeight: '800' }}>{user?.role || 'Staff'}</Text> • Email: {user?.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="save-name-btn"
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSaveName}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AppFooter active="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  scroll: { flex: 1 },

  profileCard: {
    backgroundColor: Colors.white, margin: Spacing.lg, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
  },
  avatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '900' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  profilePhone: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, fontWeight: '600' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primary + '30'
  },
  editBtnText: {
    color: Colors.primary, fontSize: FontSize.xs, fontWeight: '800'
  },

  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.warningBg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.warning + '40'
  },
  pendingText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },

  // Dedicated OTA Update Card
  otaCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  otaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  otaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otaTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  channelBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  channelText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  otaDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  otaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  otaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otaMetaLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  otaMetaVal: {
    fontWeight: '700',
    color: Colors.textMuted,
  },
  otaMetaDot: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  otaCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  otaCheckBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  roleCard: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.primaryLight
  },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  roleName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  roleSubtitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, marginBottom: Spacing.md },
  permGrid: { gap: Spacing.md },
  permModule: {},
  permModName: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.xs },
  permActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: BorderRadius.full
  },
  permChipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  noPerms: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight,
    letterSpacing: 1.2, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    marginTop: Spacing.md
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted
  },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  itemDesc: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, margin: Spacing.xl,
    paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error + '30'
  },
  logoutText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.error },

  // Edit Name Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalKeyboardWrap: {
    width: '100%',
    maxWidth: 440,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F8FAFC',
  },
  modalBody: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  roleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F8FAFC',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleNoticeText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
