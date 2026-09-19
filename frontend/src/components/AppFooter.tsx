/**
 * AppFooter – shared sticky bottom tab bar styled to match reference partner app.
 * Features 5 core tabs: Home, Sell, Leads, Renewals, Bookings.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const TABS = [
  { label: 'Home',       icon: 'home',      iconOutline: 'home-outline',      route: '/(protected)/dashboard' },
  { label: 'Leads',      icon: 'people',    iconOutline: 'people-outline',    route: '/(protected)/leads' },
  { label: 'Follow-ups', icon: 'calendar',  iconOutline: 'calendar-outline',  route: '/(protected)/follow-ups' },
  { label: 'Settings',   icon: 'settings',  iconOutline: 'settings-outline',  route: '/(protected)/settings' },
];

interface Props {
  active?: 'home' | 'leads' | 'follow-ups' | 'settings' | 'renewals' | 'bookings' | 'sell';
}

export default function AppFooter({ active }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (active) {
      const map: Record<string, string> = {
        home: '/(protected)/dashboard',
        leads: '/(protected)/leads',
        'follow-ups': '/(protected)/follow-ups',
        settings: '/(protected)/settings',
        renewals: '/(protected)/renewals',
        bookings: '/(protected)/policies',
        sell: '/(protected)/quotation-new',
      };
      return map[active] === route;
    }
    return pathname.startsWith(route.replace('/(protected)', ''));
  };

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : Math.max(insets.bottom, 10) },
      ]}
    >
      {TABS.map((tab) => {
        const isCurrent = isActive(tab.route);
        return (
          <Pressable
            key={tab.label}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => router.push(tab.route as any)}
          >
            {isCurrent && <View style={styles.activeTopLine} />}
            <Ionicons
              name={(isCurrent ? tab.icon : tab.iconOutline) as any}
              size={22}
              color={isCurrent ? '#002FA7' : '#94a3b8'}
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
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    gap: 3,
    position: 'relative',
  },
  tabPressed: { opacity: 0.75 },
  label: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: '#002FA7',
    fontWeight: '700',
  },
  activeTopLine: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#002FA7',
  },
});

