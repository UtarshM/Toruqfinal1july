/**
 * AppFooter – Modern, Role-Adaptive Sticky Bottom Navigation Bar
 * Dynamically switches core tabs based on user role (Admin, Manager, Sales, Accountant, HR).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface TabItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function AppFooter({ active }: { active?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const roleUpper = (user?.role || '').toUpperCase();
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';
  const isAdmin = roleUpper.includes('ADMIN') || isSuperAdminEmail;
  const isManager = roleUpper.includes('MANAGER') && !roleUpper.includes('HR');
  const isAccountant = roleUpper.includes('ACCOUNT') || roleUpper.includes('FINANCE');
  const isHr = roleUpper.includes('HR');

  // Role-adaptive bottom tabs
  let tabs: TabItem[] = [];

  if (isAccountant) {
    tabs = [
      { label: 'Home', icon: 'home', iconOutline: 'home-outline', route: '/(protected)/dashboard' },
      { label: 'Cheques', icon: 'card', iconOutline: 'card-outline', route: '/(protected)/cheques' },
      { label: 'Ughrani', icon: 'wallet', iconOutline: 'wallet-outline', route: '/(protected)/ughrani' },
      { label: 'Finance', icon: 'cash', iconOutline: 'cash-outline', route: '/(protected)/finance' },
      { label: 'Settings', icon: 'settings', iconOutline: 'settings-outline', route: '/(protected)/settings' },
    ];
  } else if (isHr) {
    tabs = [
      { label: 'Home', icon: 'home', iconOutline: 'home-outline', route: '/(protected)/dashboard' },
      { label: 'HR Desk', icon: 'people', iconOutline: 'people-outline', route: '/(protected)/hr' },
      { label: 'Users', icon: 'person', iconOutline: 'person-outline', route: '/(protected)/users' },
      { label: 'Payroll', icon: 'receipt', iconOutline: 'receipt-outline', route: '/(protected)/payroll' },
      { label: 'Settings', icon: 'settings', iconOutline: 'settings-outline', route: '/(protected)/settings' },
    ];
  } else if (isAdmin || isManager) {
    tabs = [
      { label: 'Home', icon: 'home', iconOutline: 'home-outline', route: '/(protected)/dashboard' },
      { label: 'Leads', icon: 'people', iconOutline: 'people-outline', route: '/(protected)/leads' },
      { label: 'Approvals', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline', route: '/(protected)/policy-approvals' },
      { label: 'Renewals', icon: 'sync', iconOutline: 'sync-outline', route: '/(protected)/renewals' },
      { label: 'Settings', icon: 'settings', iconOutline: 'settings-outline', route: '/(protected)/settings' },
    ];
  } else {
    // Sales Executive / Telecaller
    tabs = [
      { label: 'Home', icon: 'home', iconOutline: 'home-outline', route: '/(protected)/dashboard' },
      { label: 'My Leads', icon: 'people', iconOutline: 'people-outline', route: '/(protected)/leads' },
      { label: 'Follow-ups', icon: 'calendar', iconOutline: 'calendar-outline', route: '/(protected)/follow-ups' },
      { label: 'Renewals', icon: 'sync', iconOutline: 'sync-outline', route: '/(protected)/renewals' },
      { label: 'Settings', icon: 'settings', iconOutline: 'settings-outline', route: '/(protected)/settings' },
    ];
  }

  const isTabActive = (route: string) => {
    if (active) {
      const cleanTarget = route.replace('/(protected)/', '');
      return active.toLowerCase().includes(cleanTarget);
    }
    const cleanRoute = route.replace('/(protected)', '');
    return pathname.startsWith(cleanRoute);
  };

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {tabs.map((tab) => {
        const isCurrent = isTabActive(tab.route);
        return (
          <Pressable
            key={tab.label}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => router.push(tab.route as any)}
          >
            {isCurrent && <View style={styles.activePillIndicator} />}
            <Ionicons
              name={(isCurrent ? tab.icon : tab.iconOutline) as any}
              size={21}
              color={isCurrent ? '#DC2626' : '#64748B'}
            />
            <Text style={[styles.label, isCurrent && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
  },
  tabPressed: { opacity: 0.7 },
  label: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  activePillIndicator: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#DC2626',
  },
});
