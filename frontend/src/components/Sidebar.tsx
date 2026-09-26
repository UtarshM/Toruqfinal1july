import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Dimensions, ScrollView, Image, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const roleUpper = user?.role?.toUpperCase() || '';
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || isSuperAdminEmail;
  const isManager = roleUpper === 'MANAGER' || (roleUpper.includes('MANAGER') && !roleUpper.includes('HR'));
  const isAccountant = roleUpper === 'ACCOUNTANT' || roleUpper.includes('ACCOUNT') || roleUpper.includes('FINANCE');
  const isHrManager = roleUpper === 'HR MANAGER' || roleUpper === 'HR';

  const MENU_GROUPS = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', icon: 'home-outline', route: '/(protected)/dashboard', visible: true },
        { name: 'Reports', icon: 'bar-chart-outline', route: '/(protected)/reports', visible: isAdmin || isManager },
      ]
    },
    {
      label: 'SALES & CRM',
      items: [
        { name: isAdmin || isManager ? 'List Management' : 'My List', icon: 'list-outline', route: '/(protected)/leads', visible: !isHrManager && !isAccountant },
        { name: 'Today Follow-ups', icon: 'calendar-outline', route: '/(protected)/follow-ups', visible: !isHrManager && !isAccountant },
        { name: 'Renewals Pipeline', icon: 'sync-outline', route: '/(protected)/renewals', visible: !isHrManager && !isAccountant },
        { name: 'Rate Calculator', icon: 'calculator-outline', route: '/(protected)/rate-calculator', visible: !isHrManager && !isAccountant },
        { name: 'Quotations', icon: 'clipboard-outline', route: '/(protected)/quotations', visible: isAdmin || isManager || !isHrManager },
        { name: 'Policies', icon: 'shield-checkmark-outline', route: '/(protected)/policies', visible: isAdmin || isManager },
        { name: 'Import List', icon: 'cloud-upload-outline', route: '/(protected)/leads/import', visible: isAdmin },
        { name: 'Spreadsheets', icon: 'grid-outline', route: '/(protected)/sheets', visible: isAdmin },
        { name: 'CRM Pipeline', icon: 'person-add-outline', route: '/(protected)/crm', visible: !isAccountant && !isHrManager },
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { name: 'Loan Inquiries', icon: 'clipboard-outline', route: '/(protected)/loan-inquiries', visible: !isAccountant && !isHrManager },
        { name: 'Vehicle Loans', icon: 'cash-outline', route: '/(protected)/loans', visible: !isAccountant && !isHrManager },
        { name: 'Claims Hub', icon: 'document-text-outline', route: '/(protected)/claims', visible: !isHrManager && (isAdmin || isManager || roleUpper.includes('CLAIM')) },
        { name: 'RTO Work', icon: 'car-outline', route: '/(protected)/rto', visible: !isHrManager && (isAdmin || isManager || roleUpper.includes('RTO')) },
        { name: 'Fitness Desk', icon: 'fitness-outline', route: '/(protected)/fitness', visible: !isHrManager && (isAdmin || isManager || roleUpper.includes('FITNESS')) },
        { name: 'Cheques Clearing', icon: 'card-outline', route: '/(protected)/cheques', visible: isAdmin || isManager || isAccountant },
        { name: 'Ughrani (Collections)', icon: 'wallet-outline', route: '/(protected)/ughrani', visible: isAdmin || isManager || isAccountant },
      ]
    },
    {
      label: 'MANAGEMENT & FINANCE',
      items: [
        { name: 'Policy Approvals', icon: 'shield-checkmark-outline', route: '/(protected)/policy-approvals', visible: isAdmin || isManager },
        { name: 'Finance & Ledger', icon: 'wallet-outline', route: '/(protected)/finance', visible: isAdmin || isAccountant },
        { name: 'Users & Staff', icon: 'person-outline', route: '/(protected)/users', visible: isAdmin || isHrManager },
        { name: 'Onboarding Approvals', icon: 'checkmark-circle-outline', route: '/(protected)/onboarding-approvals', visible: isAdmin || isHrManager || isManager },
        { name: 'Payroll & Salaries', icon: 'cash-outline', route: '/(protected)/payroll', visible: isAdmin || isHrManager },
        { name: 'HR Desk', icon: 'people-circle-outline', route: '/(protected)/hr', visible: true },
        { name: 'Roles & Permissions', icon: 'ribbon-outline', route: '/(protected)/roles', visible: isAdmin },
        { name: 'Quotation Rates', icon: 'options-outline', route: '/(protected)/rates-management', visible: isAdmin },
        { name: 'Settings', icon: 'settings-outline', route: '/(protected)/settings', visible: true },
      ]
    }
  ];

  const filteredGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.visible)
  })).filter(group => group.items.length > 0);

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleCheckUpdate = async () => {
    if (__DEV__) {
      Alert.alert('Development Mode', 'OTA updates are disabled in development mode.');
      return;
    }
    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Update Found', 'Downloading the latest version...');
        await Updates.fetchUpdateAsync();
        Alert.alert('Update Ready', 'Restarting app with latest version...', [
          { text: 'Restart Now', onPress: async () => await Updates.reloadAsync() }
        ]);
      } else {
        Alert.alert('Up to Date ✓', 'You are already running the latest version of Torque Auto Advisor.');
      }
    } catch (e: any) {
      Alert.alert('Update Check', e?.message || 'Could not check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Drawer Content */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          {/* Navigation Links */}
          <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
            {filteredGroups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.name}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Ionicons name={item.icon as any} size={20} color={Colors.primary} style={styles.menuIcon} />
                    <Text style={styles.menuText}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Footer with Modern User Card */}
          {(() => {
            const roleTheme = isAdmin
              ? { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'SUPER ADMIN' }
              : isManager
              ? { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'MANAGER' }
              : isAccountant
              ? { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'ACCOUNTANT' }
              : isHrManager
              ? { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE', label: 'HR MANAGER' }
              : { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', label: user?.role?.toUpperCase() || 'SALES EXECUTIVE' };

            const initials = (user?.full_name || user?.name || (isSuperAdminEmail ? 'Admin' : 'U'))
              .split(' ')
              .map((p: string) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <View style={styles.footer}>
                <Pressable
                  style={styles.userProfileCard}
                  onPress={() => {
                    onClose();
                    router.push('/(protected)/settings?editName=true' as any);
                  }}
                  accessibilityLabel="Edit your profile name"
                >
                  <View style={[styles.avatarCircle, { backgroundColor: roleTheme.bg, borderColor: roleTheme.border }]}>
                    <Text style={[styles.avatarText, { color: roleTheme.text }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user?.full_name || user?.name || (isSuperAdminEmail ? 'Admin' : 'User')}
                    </Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleTheme.bg, borderColor: roleTheme.border }]}>
                      <Text style={[styles.roleBadgeText, { color: roleTheme.text }]}>
                        {roleTheme.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.editProfileChip}>
                    <Ionicons name="pencil" size={13} color={Colors.primary} />
                    <Text style={styles.editProfileText}>Edit</Text>
                  </View>
                </Pressable>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    onPress={handleCheckUpdate}
                    disabled={checkingUpdate}
                  >
                    {checkingUpdate ? (
                      <ActivityIndicator size="small" color="#16A34A" />
                    ) : (
                      <>
                        <Ionicons name="sync-outline" size={15} color="#16A34A" />
                        <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>Sync App</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={15} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Logout</Text>
                  </Pressable>
                </View>
              </View>
            );
          })()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  drawer: { 
    width: DRAWER_WIDTH, 
    height: '100%', 
    backgroundColor: Colors.background, 
    borderTopRightRadius: BorderRadius.lg, 
    borderBottomRightRadius: BorderRadius.lg, 
    shadowColor: '#000', 
    shadowOffset: { width: 4, height: 0 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 10, 
    elevation: 16 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingLeft: Spacing.xs, 
    paddingRight: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 55 : 45, 
    paddingBottom: Spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border, 
    backgroundColor: 'transparent',
    position: 'relative'
  },
  logoWrap: { 
    backgroundColor: 'transparent',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%'
  },
  logoImage: { 
    width: 220, 
    height: 60,
    marginLeft: -10,
    backgroundColor: 'transparent'
  },
  closeBtn: { 
    position: 'absolute',
    right: Spacing.md,
    top: Platform.OS === 'ios' ? 55 : 45,
    padding: Spacing.xs
  },
  menu: { flex: 1, padding: Spacing.md },
  group: { marginBottom: Spacing.lg },
  groupLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.sm, paddingHorizontal: Spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: 2 },
  menuItemPressed: { backgroundColor: Colors.surfaceMuted },
  menuIcon: { marginRight: Spacing.md },
  menuText: { fontSize: FontSize.md - 1, fontWeight: '600', color: Colors.text },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: 'transparent' },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  userName: { fontSize: FontSize.md - 1, fontWeight: '800', color: Colors.text },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 3,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  editProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  editProfileText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
});
