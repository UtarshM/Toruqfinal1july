import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  StatusBar,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { useCacheStore } from '../../src/store/cacheStore';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';

const { width } = Dimensions.get('window');

const getBannersForRole = (isAdmin: boolean, isManager: boolean, isAccountant: boolean, isHrManager: boolean) => {
  if (isAccountant) {
    return [
      {
        id: 'cheques',
        badge: 'CHEQUES & CLEARING',
        title: 'Inward Cheques Desk',
        subtitle: 'Fast Clearance & Banking Reconciliation',
        leftTag: 'STATUS TRACKING',
        leftValue: 'INWARD / DEPOSITED',
        rightTag: 'BANK DEPOSIT',
        rightValue: 'DAILY VOUCHERS',
        btnText: 'View Cheques Clearing',
        type: 'cheques',
        gradientBg: '#1E293B',
      },
      {
        id: 'ughrani',
        badge: 'COLLECTIONS & RECOVERY',
        title: 'Ughrani Debt Ledgers',
        subtitle: 'Track Field & Office Payment Recoveries',
        leftTag: 'OUTSTANDING',
        leftValue: 'ACTIVE BOOKS',
        rightTag: 'RECEIPTS',
        rightValue: 'INSTANT VOUCHER',
        btnText: 'Manage Ughrani Books',
        type: 'ughrani',
        gradientBg: '#831843',
      },
      {
        id: 'finance',
        badge: 'FINANCE & LEDGER',
        title: 'Receivables & Ledgers',
        subtitle: 'Real-time Premium Collections & Expenses',
        leftTag: 'RECONCILIATION',
        leftValue: 'DAILY AUDIT',
        rightTag: 'MONEY RECEIPTS',
        rightValue: 'PRINT & SHARE',
        btnText: 'Open Finance Desk',
        type: 'finance',
        gradientBg: '#064E3B',
      },
    ];
  }
  if (isHrManager) {
    return [
      {
        id: 'users',
        badge: 'PEOPLE & TEAM',
        title: 'Staff Directory Desk',
        subtitle: 'Manage Advisors, Telecallers & Backoffice',
        leftTag: 'ACTIVE MEMBERS',
        leftValue: 'VERIFIED KYC',
        rightTag: 'ROLES & RIGHTS',
        rightValue: 'ROLE BASED',
        btnText: 'View Staff Directory',
        type: 'users',
        gradientBg: '#3B0764',
      },
      {
        id: 'onboarding',
        badge: 'FAST-TRACK ONBOARDING',
        title: 'Candidate Approvals',
        subtitle: 'Review New Joining Requests & Docs',
        leftTag: 'DOCUMENT VERIFY',
        leftValue: 'INSTANT REVIEW',
        rightTag: 'DESK STATUS',
        rightValue: 'READY TO WORK',
        btnText: 'Review Onboarding',
        type: 'onboarding',
        gradientBg: '#1E1B4B',
      },
      {
        id: 'payroll',
        badge: 'SALARIES & PAYROLL',
        title: 'Monthly Salary Desks',
        subtitle: 'Attendance Slips, Deductions & Payouts',
        leftTag: 'ATTENDANCE',
        leftValue: 'BIOMETRIC / APP',
        rightTag: 'PAYROLL SLIPS',
        rightValue: 'MONTHLY AUDIT',
        btnText: 'View Payroll Desk',
        type: 'payroll',
        gradientBg: '#064E3B',
      },
    ];
  }
  if (isAdmin || isManager) {
    return [
      {
        id: 'insurance',
        badge: '20+ TOP INSURERS ONBOARD',
        title: 'Motor & Commercial Hub',
        subtitle: 'Tata AIG · Digit · ICICI · Chola · Shriram',
        leftTag: 'COMMISSION PAYOUT',
        leftValue: 'UP TO 25%',
        rightTag: 'POLICY ISSUANCE',
        rightValue: 'INSTANT CASHLESS',
        btnText: 'Rate Calculator & Quotes',
        type: 'quote',
        gradientBg: '#0F172A',
      },
      {
        id: 'approvals',
        badge: 'EXECUTIVE APPROVALS',
        title: 'Policy Submissions Desk',
        subtitle: 'Review & Verify Submissions Before Issuance',
        leftTag: 'PENDING VERIFY',
        leftValue: 'SAME DAY QC',
        rightTag: 'COMMISSION',
        rightValue: 'VERIFIED',
        btnText: 'Review Policy Approvals',
        type: 'approvals',
        gradientBg: '#701A75',
      },
      {
        id: 'renewals',
        badge: 'RETENTION ENGINE',
        title: 'Overdue Renewals Pipeline',
        subtitle: 'Auto Reminders & One-Click WhatsApp Follow-up',
        leftTag: 'EXPIRY RETENTION',
        leftValue: 'HIGH CONVERSION',
        rightTag: 'POLICY RENEWAL',
        rightValue: 'AUTOMATED',
        btnText: 'Open Renewals Desk',
        type: 'renewals',
        gradientBg: '#064E3B',
      },
    ];
  }
  // Default: Sales Executive / Telecaller
  return [
    {
      id: 'insurance',
      badge: '20+ TOP INSURERS ONBOARD',
      title: 'Motor & Commercial Hub',
      subtitle: 'Tata AIG · Digit · ICICI · Chola · Shriram',
      leftTag: 'COMMISSION PAYOUT',
      leftValue: 'UP TO 25%',
      rightTag: 'POLICY ISSUANCE',
      rightValue: 'INSTANT CASHLESS',
      btnText: 'Rate Calculator & Quotes',
      type: 'quote',
      gradientBg: '#0F172A',
    },
    {
      id: 'renewals',
      badge: 'RETENTION ENGINE',
      title: 'Overdue Renewals Pipeline',
      subtitle: 'Auto Reminders & One-Click WhatsApp Follow-up',
      leftTag: 'EXPIRY RETENTION',
      leftValue: 'HIGH CONVERSION',
      rightTag: 'POLICY RENEWAL',
      rightValue: 'AUTOMATED',
      btnText: 'Open Renewals Desk',
      type: 'renewals',
      gradientBg: '#064E3B',
    },
    {
      id: 'claims',
      badge: 'FAST-TRACK CLAIMS',
      title: 'Zero-Hassle Claim Intimation',
      subtitle: 'Spot Survey & Quick Desk Processing',
      leftTag: 'OD & TP CLAIMS',
      leftValue: 'DIRECT DESK',
      rightTag: 'SURVEYOR SUPPORT',
      rightValue: '24/7 HELPLINE',
      btnText: 'File New Claim',
      type: 'claim',
      gradientBg: '#831843',
    },
    {
      id: 'loans',
      badge: 'VEHICLE LOANS & REFINANCE',
      title: 'Used Vehicle Finance Desk',
      subtitle: 'Direct Tie-ups with Leading Banks & NBFCs',
      leftTag: 'FAST SANCTION',
      leftValue: 'WITHIN 24 HRS',
      rightTag: 'DOCS REQUIRED',
      rightValue: 'MINIMAL KYC',
      btnText: 'New Loan Inquiry',
      type: 'loan',
      gradientBg: '#14532D',
    },
  ];
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

  const roleUpper = user?.role?.toUpperCase() || '';
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || isSuperAdminEmail;
  const isManager = roleUpper === 'MANAGER' || (roleUpper.includes('MANAGER') && !roleUpper.includes('HR'));
  const isAccountant = roleUpper === 'ACCOUNTANT' || roleUpper.includes('ACCOUNT') || roleUpper.includes('FINANCE');
  const isHrManager = roleUpper === 'HR MANAGER' || roleUpper === 'HR' || roleUpper.includes('HR');
  const isSales = !isAdmin && !isManager && !isAccountant && !isHrManager;

  const roleTheme = isAdmin
    ? { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'SUPER ADMIN' }
    : isManager
    ? { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'MANAGER' }
    : isAccountant
    ? { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'ACCOUNTANT' }
    : isHrManager
    ? { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE', label: 'HR MANAGER' }
    : { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', label: user?.role?.toUpperCase() || 'SALES EXECUTIVE' };

  const userName = user?.full_name || user?.name || (isSuperAdminEmail ? 'Admin' : 'Torque Advisor');
  const userInitials = userName
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'TA';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const heroBanners = getBannersForRole(isAdmin, isManager, isAccountant, isHrManager);

  const [stats, setStats] = useState<any>(
    cache['/dashboard/stats']?.stats || {
      leads: 0,
      revenue: 0,
      pending: 0,
      claims: 0,
      active_policies: 0,
      renewals_count: 0,
      active_loans: 0,
      pending_rto: 0,
      pending_fitness: 0,
    }
  );
  const [items, setItems] = useState<any[]>(
    cache['/dashboard/stats']?.items || []
  );
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Timeframe Filter (Default: "This month")
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [timeframeModalVisible, setTimeframeModalVisible] = useState(false);

  // Modals
  const [fabActionVisible, setFabActionVisible] = useState(false);

  // Carousel Active Index
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  // Hydrate cache on mount
  useEffect(() => {
    loadCache().then(() => {
      const cached = cache['/dashboard/stats'];
      if (cached) {
        if (cached.stats) setStats(cached.stats);
        if (cached.items) setItems(cached.items);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [sRes, nRes] = await Promise.all([
        api.get(`/dashboard/stats?timeframe=${timeframe}`).catch(() => null),
        api.get('/notifications?limit=6').catch(() => null),
      ]);

      const sData = sRes?.data || sRes;
      const nData = nRes?.data || nRes;

      let leads = 0;
      let revenue = 0;
      let pending = 0;
      let claims = 0;
      let active_policies = 0;
      let renewals_count = 0;
      let active_loans = 0;
      let pending_rto = 0;
      let pending_fitness = 0;

      if (sData) {
        leads = sData.total_leads || sData.leads || sData.my_leads || 0;
        pending = sData.pending_followups || sData.pending || 0;
        claims = sData.active_claims || sData.claims || 0;
        active_policies = sData.active_policies || sData.policies_count || 0;
        renewals_count = sData.renewals_count || 0;
        active_loans = sData.active_loans || 0;
        pending_rto = sData.pending_rto || 0;
        pending_fitness = sData.pending_fitness || 0;

        if (sData.revenue_trend) {
          revenue = sData.revenue_trend.reduce(
            (acc: number, item: any) => acc + (Number(item._sum?.amount) || 0),
            0
          );
        } else {
          revenue = sData.revenue || 0;
        }
      }

      const newStats = {
        ...sData,
        leads,
        revenue,
        pending,
        claims,
        active_policies,
        renewals_count,
        active_loans,
        pending_rto,
        pending_fitness,
      };
      const newItems = nData?.notifications || nData || [];

      setStats(newStats);
      setItems(Array.isArray(newItems) ? newItems : []);
      setCache('/dashboard/stats', { stats: newStats, items: Array.isArray(newItems) ? newItems : [], timestamp: Date.now() });
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  }, [setCache, timeframe]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setCache('/dashboard/stats', null);
    await loadData();
    setRefreshing(false);
  };

  const handleTimeframeSelect = (tf: 'today' | 'week' | 'month' | 'year') => {
    setTimeframe(tf);
    setTimeframeModalVisible(false);
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This week';
      case 'month':
        return 'This month';
      case 'year':
        return 'This year';
    }
  };

  const handleBannerAction = (banner: any) => {
    if (banner.type === 'quote') {
      router.push('/(protected)/rate-calculator' as any);
    } else if (banner.type === 'claim') {
      router.push('/(protected)/claims' as any);
    } else if (banner.type === 'loan') {
      router.push('/(protected)/loan-inquiries' as any);
    } else if (banner.type === 'cheques') {
      router.push('/(protected)/cheques' as any);
    } else if (banner.type === 'ughrani') {
      router.push('/(protected)/ughrani' as any);
    } else if (banner.type === 'finance') {
      router.push('/(protected)/finance' as any);
    } else if (banner.type === 'users') {
      router.push('/(protected)/users' as any);
    } else if (banner.type === 'onboarding') {
      router.push('/(protected)/onboarding-approvals' as any);
    } else if (banner.type === 'payroll') {
      router.push('/(protected)/payroll' as any);
    } else if (banner.type === 'approvals') {
      router.push('/(protected)/policy-approvals' as any);
    } else if (banner.type === 'renewals') {
      router.push('/(protected)/renewals' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Drawer Sidebar */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 1. TOP HEADER (Modern, Sleek, Role-Badge Driven) */}
      <View style={styles.header}>
        {/* Left: User Profile Avatar with Initials & Online Dot */}
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.avatarButton}>
          <View style={[styles.avatarCircle, { backgroundColor: roleTheme.bg, borderColor: roleTheme.border }]}>
            <Text style={[styles.avatarInitials, { color: roleTheme.text }]}>{userInitials}</Text>
          </View>
          <View style={styles.onlineDot} />
        </Pressable>

        {/* Center: Greeting, Name & Dynamic Role Chip */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerGreeting}>{getGreeting()}</Text>
          <Text style={styles.advisorName} numberOfLines={1}>
            {userName}
          </Text>
          <View style={[styles.headerRolePill, { backgroundColor: roleTheme.bg, borderColor: roleTheme.border }]}>
            <Text style={[styles.headerRolePillText, { color: roleTheme.text }]}>
              {roleTheme.label}
            </Text>
          </View>
        </View>

        {/* Right Action Icons: Refresh & Notification */}
        <View style={styles.headerActions}>
          <Pressable onPress={onRefresh} style={styles.headerIconBtn}>
            <Ionicons name="sync-outline" size={18} color="#0F172A" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(protected)/notifications')}
            style={styles.headerIconBtn}
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            {items.length > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {items.length > 9 ? '9+' : items.length}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002FA7" />}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. HERO PROMOTIONAL CAROUSEL (Role-Tailored Banners) */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={carouselScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              if (slide !== activeBannerIndex && slide >= 0 && slide < heroBanners.length) {
                setActiveBannerIndex(slide);
              }
            }}
            scrollEventThrottle={16}
          >
            {heroBanners.map((banner) => (
              <View key={banner.id} style={[styles.heroCard, { backgroundColor: banner.gradientBg }]}>
                {/* Decorative Elements */}
                <View style={styles.heroDecorativeCircle} />

                {/* Top Tagline */}
                <View style={styles.heroTopTag}>
                  <Text style={styles.heroTopTagText}>{banner.badge}</Text>
                </View>

                {/* Main Title & Subtitle */}
                <Text style={styles.heroTitle}>{banner.title}</Text>
                <Text style={styles.heroSubtitle}>{banner.subtitle}</Text>

                {/* Center / Dual Value Badges */}
                <View style={styles.heroRewardRow}>
                  <View style={styles.heroMiniBadge}>
                    <Text style={styles.heroMiniTag}>{banner.leftTag}</Text>
                    <Text style={styles.heroMiniValue}>{banner.leftValue}</Text>
                  </View>

                  <View style={styles.heroWheelIconWrap}>
                    <Ionicons
                      name="shield-checkmark"
                      size={26}
                      color="#FBBF24"
                    />
                  </View>

                  <View style={styles.heroMiniBadge}>
                    <Text style={styles.heroMiniTag}>{banner.rightTag}</Text>
                    <Text style={styles.heroMiniValue}>{banner.rightValue}</Text>
                  </View>
                </View>

                {/* Action CTA */}
                <Pressable
                  onPress={() => handleBannerAction(banner)}
                  style={styles.heroActionBtn}
                >
                  <Text style={styles.heroActionBtnText}>{banner.btnText}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0F172A" />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Carousel Pagination Dots */}
          <View style={styles.dotsContainer}>
            {heroBanners.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeBannerIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* 3. PERFORMANCE METRICS (Fully Role-Adaptive) */}
        <View style={styles.performanceOuterCard}>
          {/* Header row with Title & Dropdown Filter */}
          <View style={styles.performanceHeaderRow}>
            <Text style={styles.sectionHeading}>
              {isAccountant
                ? 'Collections & Cash Flow'
                : isHrManager
                ? 'Staff & HR Operations'
                : isSales
                ? 'My Sales Pipeline'
                : 'Executive Performance'}
            </Text>
            <Pressable
              onPress={() => setTimeframeModalVisible(true)}
              style={styles.dropdownPill}
            >
              <Text style={styles.dropdownPillText}>{getTimeframeLabel()}</Text>
              <Ionicons name="chevron-down" size={14} color="#002FA7" />
            </Pressable>
          </View>

          {/* 3 Primary Metric Cards in a row (Role-Adaptive) */}
          {isAccountant ? (
            <View style={styles.metricsRow}>
              {/* Inward Cheques */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/cheques')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="card" size={16} color="#D97706" />
                  <Text style={styles.metricLabel}>Cheques</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.pending_cheques ?? stats.cheques_count ?? 0}
                </Text>
              </Pressable>

              {/* Ughrani Debt */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/ughrani')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="wallet" size={16} color="#DC2626" />
                  <Text style={styles.metricLabel}>Ughrani</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.ughrani_pending || 'Active'}
                </Text>
              </Pressable>

              {/* Collections Inflow */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/finance')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                  <Text style={styles.metricLabel}>Total Inflow</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.revenue ? `₹${stats.revenue.toLocaleString()}` : '₹0'}
                </Text>
              </Pressable>
            </View>
          ) : isHrManager ? (
            <View style={styles.metricsRow}>
              {/* Active Staff */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/users')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="people" size={16} color="#2563EB" />
                  <Text style={styles.metricLabel}>Staff Members</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.users_count ?? stats.active_users ?? 0}
                </Text>
              </Pressable>

              {/* Onboarding Pending */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/onboarding-approvals')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#D97706" />
                  <Text style={styles.metricLabel}>Onboarding</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.pending_onboarding ?? 0}
                </Text>
              </Pressable>

              {/* Payroll Desk */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/payroll')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                  <Text style={styles.metricLabel}>Salaries</Text>
                </View>
                <Text style={styles.metricValue}>Active</Text>
              </Pressable>
            </View>
          ) : isSales ? (
            <View style={styles.metricsRow}>
              {/* My Assigned List */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/leads')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="list" size={16} color="#2563EB" />
                  <Text style={styles.metricLabel}>My List</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.my_leads ?? stats.leads ?? 0}
                </Text>
              </Pressable>

              {/* Today's Follow-ups */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/follow-ups')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="calendar" size={16} color="#D97706" />
                  <Text style={styles.metricLabel}>Follow-ups</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.pending_followups ?? stats.pending ?? 0}
                </Text>
              </Pressable>

              {/* Renewals */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/renewals')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="sync" size={16} color="#10B981" />
                  <Text style={styles.metricLabel}>Renewals</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.renewals_count ?? 0}
                </Text>
              </Pressable>
            </View>
          ) : (
            // Admin & Manager Executive Overview
            <View style={styles.metricsRow}>
              {/* Premium */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/policies')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                  <Text style={styles.metricLabel}>Total Premium</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.revenue ? `₹${stats.revenue.toLocaleString()}` : '₹0'}
                </Text>
              </Pressable>

              {/* Policies */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/policies')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#3B82F6" />
                  <Text style={styles.metricLabel}>Policies</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.active_policies ?? stats.policies ?? 0}
                </Text>
              </Pressable>

              {/* Total List */}
              <Pressable
                style={styles.metricCard}
                onPress={() => router.push('/(protected)/leads')}
              >
                <View style={styles.metricTopRow}>
                  <Ionicons name="list" size={16} color="#7C3AED" />
                  <Text style={styles.metricLabel}>Total List</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.total_leads ?? stats.leads ?? 0}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Operational Sub-Metrics Bar (Role-Adaptive) */}
          <View style={styles.subMetricsBar}>
            {isAccountant ? (
              <>
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/cheques')}
                >
                  <Text style={styles.subMetricLabel}>CHEQUES CLEARING</Text>
                  <Text style={styles.subMetricValue}>{stats.pending_cheques ?? 0}</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/ughrani')}
                >
                  <Text style={styles.subMetricLabel}>UGHRANI LEDGERS</Text>
                  <Text style={styles.subMetricValue}>Active</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/finance')}
                >
                  <Text style={styles.subMetricLabel}>MONEY RECEIPTS</Text>
                  <Text style={styles.subMetricValue}>Vouchers</Text>
                </Pressable>
              </>
            ) : isHrManager ? (
              <>
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/users')}
                >
                  <Text style={styles.subMetricLabel}>STAFF DIRECTORY</Text>
                  <Text style={styles.subMetricValue}>{stats.users_count ?? 0}</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/hr')}
                >
                  <Text style={styles.subMetricLabel}>HR DESK</Text>
                  <Text style={styles.subMetricValue}>Active</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/onboarding-approvals')}
                >
                  <Text style={styles.subMetricLabel}>NEW JOINING</Text>
                  <Text style={styles.subMetricValue}>{stats.pending_onboarding ?? 0}</Text>
                </Pressable>
              </>
            ) : isSales ? (
              <>
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/policies')}
                >
                  <Text style={styles.subMetricLabel}>POLICIES ISSUED</Text>
                  <Text style={styles.subMetricValue}>{stats.active_policies ?? 0}</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/rate-calculator')}
                >
                  <Text style={styles.subMetricLabel}>RATE CALCULATOR</Text>
                  <Text style={[styles.subMetricValue, { color: '#002FA7' }]}>Quotes</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/claims')}
                >
                  <Text style={styles.subMetricLabel}>ACTIVE CLAIMS</Text>
                  <Text style={styles.subMetricValue}>{stats.active_claims ?? 0}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/policy-approvals')}
                >
                  <Text style={styles.subMetricLabel}>APPROVALS PENDING</Text>
                  <Text style={styles.subMetricValue}>{stats.pending_approvals ?? 0}</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/renewals')}
                >
                  <Text style={styles.subMetricLabel}>RENEWALS DUE</Text>
                  <Text style={styles.subMetricValue}>{stats.renewals_count ?? 0}</Text>
                </Pressable>
                <View style={styles.subMetricDivider} />
                <Pressable
                  style={styles.subMetricItem}
                  onPress={() => router.push('/(protected)/claims')}
                >
                  <Text style={styles.subMetricLabel}>ACTIVE CLAIMS</Text>
                  <Text style={styles.subMetricValue}>{stats.active_claims ?? 0}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* 4. RECOMMENDED MODULES (Role-Filtered Grid) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Quick Access Modules</Text>

          {isAccountant ? (
            <>
              <View style={styles.recommendedGrid}>
                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/cheques')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="card" size={24} color="#D97706" />
                  </View>
                  <Text style={styles.recItemTitle}>Cheques</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/ughrani')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="wallet" size={24} color="#DC2626" />
                  </View>
                  <Text style={styles.recItemTitle}>Ughrani</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/finance')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="cash" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.recItemTitle}>Finance Desk</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/quotations')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="clipboard" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.recItemTitle}>Quotations</Text>
                </Pressable>
              </View>

              <View style={styles.secondaryRecRow}>
                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/rate-calculator')}
                >
                  <Ionicons name="calculator-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Rate Calc</Text>
                </Pressable>
                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/settings')}
                >
                  <Ionicons name="settings-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Settings</Text>
                </Pressable>
              </View>
            </>
          ) : isHrManager ? (
            <>
              <View style={styles.recommendedGrid}>
                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/users')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="people" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.recItemTitle}>Staff Users</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/onboarding-approvals')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#7E22CE" />
                  </View>
                  <Text style={styles.recItemTitle}>Onboarding</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/hr')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="person-circle" size={24} color="#D97706" />
                  </View>
                  <Text style={styles.recItemTitle}>HR Desk</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/payroll')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="cash" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.recItemTitle}>Payroll</Text>
                </Pressable>
              </View>

              <View style={styles.secondaryRecRow}>
                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/settings')}
                >
                  <Ionicons name="settings-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Settings</Text>
                </Pressable>
              </View>
            </>
          ) : isSales ? (
            <>
              <View style={styles.recommendedGrid}>
                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/leads')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="list" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.recItemTitle}>My List</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/follow-ups')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="calendar" size={24} color="#D97706" />
                  </View>
                  <Text style={styles.recItemTitle}>Follow-ups</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/rate-calculator')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="calculator" size={24} color="#059669" />
                  </View>
                  <Text style={styles.recItemTitle}>Rate Calc</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/renewals')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="repeat" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.recItemTitle}>Renewals</Text>
                </Pressable>
              </View>

              <View style={styles.secondaryRecRow}>
                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/quotations')}
                >
                  <Ionicons name="clipboard-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Quotations</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/claims')}
                >
                  <Ionicons name="document-text-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Claims Hub</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/loan-inquiries' as any)}
                >
                  <Ionicons name="cash-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Loans Desk</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/fitness')}
                >
                  <Ionicons name="fitness-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Fitness Desk</Text>
                </Pressable>
              </View>
            </>
          ) : (
            // Admin & Manager Core Modules
            <>
              <View style={styles.recommendedGrid}>
                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/leads')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="list" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.recItemTitle}>List Management</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/policy-approvals')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="shield-checkmark" size={24} color="#DC2626" />
                  </View>
                  <Text style={styles.recItemTitle}>Approvals</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/renewals')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="repeat" size={24} color="#16A34A" />
                  </View>
                  <Text style={styles.recItemTitle}>Renewals</Text>
                </Pressable>

                <Pressable
                  style={styles.recommendedItem}
                  onPress={() => router.push('/(protected)/rate-calculator')}
                >
                  <View style={[styles.recIconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="calculator" size={24} color="#7E22CE" />
                  </View>
                  <Text style={styles.recItemTitle}>Rate Calc</Text>
                </Pressable>
              </View>

              <View style={styles.secondaryRecRow}>
                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/cheques')}
                >
                  <Ionicons name="card-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Cheques</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/ughrani')}
                >
                  <Ionicons name="wallet-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Ughrani</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/finance')}
                >
                  <Ionicons name="cash-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Finance</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/claims')}
                >
                  <Ionicons name="document-text-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Claims</Text>
                </Pressable>

                <Pressable
                  style={styles.secRecPill}
                  onPress={() => router.push('/(protected)/reports')}
                >
                  <Ionicons name="bar-chart-outline" size={14} color="#002FA7" />
                  <Text style={styles.secRecPillText}>Reports</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* 5. RECENT UPDATES & INQUIRIES */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activitySectionTitle}>Recent Activity & Inquiries</Text>
            <Pressable onPress={() => router.push('/(protected)/notifications')}>
              <Text style={styles.seeAllText}>View All</Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="flash-outline" size={28} color="#94A3B8" />
              <Text style={styles.emptyActivityText}>No recent updates logged yet.</Text>
            </View>
          ) : (
            items.slice(0, 4).map((item, idx) => (
              <View key={idx} style={styles.activityItem}>
                <View style={styles.activityIconCircle}>
                  <Ionicons name="flash" size={14} color="#002FA7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {item.title || 'New inquiry logged'}
                  </Text>
                  <Text style={styles.activitySub}>
                    {item.message || 'Updated in Torque CRM'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 6. FLOATING ACTION BUTTON (Role Adaptive) */}
      <Pressable
        style={styles.fabButton}
        onPress={() => setFabActionVisible(true)}
      >
        <Ionicons name="flash" size={24} color="#FFFFFF" />
      </Pressable>

      {/* 7. STICKY BOTTOM FOOTER (Role-Adaptive Footer) */}
      <AppFooter active="home" />

      {/* MODAL: TIMEFRAME SELECTOR */}
      <Modal
        visible={timeframeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeframeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTimeframeModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Performance Timeframe</Text>
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'year', label: 'This Year' },
            ].map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.timeframeOption,
                  timeframe === opt.key && styles.timeframeOptionActive,
                ]}
                onPress={() => handleTimeframeSelect(opt.key as any)}
              >
                <Text
                  style={[
                    styles.timeframeOptionText,
                    timeframe === opt.key && styles.timeframeOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {timeframe === opt.key && (
                  <Ionicons name="checkmark" size={18} color="#002FA7" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* MODAL: QUICK ACTIONS FAB (Role Adaptive) */}
      <Modal
        visible={fabActionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFabActionVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFabActionVisible(false)}
        >
          <View style={styles.fabActionSheet}>
            <Text style={styles.fabSheetTitle}>Quick Actions</Text>

            {isAccountant ? (
              <>
                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/cheques');
                  }}
                >
                  <Ionicons name="card" size={20} color="#D97706" />
                  <Text style={styles.fabSheetItemText}>Inward / Deposit Cheque</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/ughrani');
                  }}
                >
                  <Ionicons name="wallet" size={20} color="#DC2626" />
                  <Text style={styles.fabSheetItemText}>Log Ughrani Collection</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/finance');
                  }}
                >
                  <Ionicons name="cash" size={20} color="#16A34A" />
                  <Text style={styles.fabSheetItemText}>Open Finance Ledger</Text>
                </Pressable>
              </>
            ) : isHrManager ? (
              <>
                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/users');
                  }}
                >
                  <Ionicons name="person-add" size={20} color="#2563EB" />
                  <Text style={styles.fabSheetItemText}>Add Staff Member</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/onboarding-approvals');
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#7E22CE" />
                  <Text style={styles.fabSheetItemText}>Review Onboardings</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/payroll');
                  }}
                >
                  <Ionicons name="cash" size={20} color="#16A34A" />
                  <Text style={styles.fabSheetItemText}>View Payroll Slips</Text>
                </Pressable>
              </>
            ) : isSales ? (
              <>
                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/leads');
                  }}
                >
                  <Ionicons name="list" size={20} color="#002FA7" />
                  <Text style={styles.fabSheetItemText}>New List Entry</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/follow-ups');
                  }}
                >
                  <Ionicons name="calendar" size={20} color="#6366F1" />
                  <Text style={styles.fabSheetItemText}>Schedule Customer Follow-up</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/rate-calculator');
                  }}
                >
                  <Ionicons name="calculator" size={20} color="#059669" />
                  <Text style={styles.fabSheetItemText}>Rate Calculator & Quotes</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/claims');
                  }}
                >
                  <Ionicons name="document-text" size={20} color="#DC2626" />
                  <Text style={styles.fabSheetItemText}>File Claim Intimation</Text>
                </Pressable>
              </>
            ) : (
              // Admin & Manager
              <>
                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/leads');
                  }}
                >
                  <Ionicons name="list" size={20} color="#002FA7" />
                  <Text style={styles.fabSheetItemText}>New List Entry</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/policy-approvals');
                  }}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#DC2626" />
                  <Text style={styles.fabSheetItemText}>Review Policy Approvals</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/renewals');
                  }}
                >
                  <Ionicons name="repeat" size={20} color="#16A34A" />
                  <Text style={styles.fabSheetItemText}>Renewals Pipeline</Text>
                </Pressable>

                <Pressable
                  style={styles.fabSheetItem}
                  onPress={() => {
                    setFabActionVisible(false);
                    router.push('/(protected)/cheques');
                  }}
                >
                  <Ionicons name="card" size={20} color="#D97706" />
                  <Text style={styles.fabSheetItemText}>Cheques Clearing Desk</Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.fabSheetItem}
              onPress={() => {
                setFabActionVisible(false);
                Linking.openURL('tel:9510819589').catch(() => {});
              }}
            >
              <Ionicons name="call" size={20} color="#2563EB" />
              <Text style={styles.fabSheetItemText}>Call Support Desk</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* 1. Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarButton: { position: 'relative' },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerCenter: { flex: 1, marginLeft: 10 },
  headerGreeting: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  advisorName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  headerRolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 3,
  },
  headerRolePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
  },
  brandTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  sopPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  sopPillText: { fontSize: 11, fontWeight: '700', color: '#002FA7' },

  /* 2. Hero Carousel */
  carouselContainer: { marginTop: 12, marginBottom: 4 },
  heroCard: {
    width: width - 32,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroDecorativeCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroTopTagText: { color: '#E2E8F0', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.2 },
  heroSubtitle: { color: '#93C5FD', fontSize: 12, fontWeight: '600', marginTop: 2 },
  heroRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  heroMiniBadge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  heroMiniTag: { color: '#CBD5E1', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  heroMiniValue: { color: '#FEF08A', fontSize: 11, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  heroWheelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroActionBtnText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: { height: 5, borderRadius: 2.5 },
  dotActive: { width: 18, backgroundColor: '#002FA7' },
  dotInactive: { width: 5, backgroundColor: '#CBD5E1' },

  /* 3. My Performance Section */
  performanceOuterCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  performanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dropdownPillText: { fontSize: 12, fontWeight: '700', color: '#002FA7' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  metricValue: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  subMetricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subMetricItem: { flex: 1, alignItems: 'center' },
  subMetricDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  subMetricLabel: { fontSize: 8, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.3 },
  subMetricValue: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginTop: 1 },

  /* 4. Recommended For You / Core SOP Modules */
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  recommendedItem: { alignItems: 'center', width: (width - 64) / 4 },
  recIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  recItemTitle: { fontSize: 11, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  secondaryRecRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  secRecPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secRecPillText: { fontSize: 11, fontWeight: '700', color: '#334155' },

  /* 5. Vehicle Categories Section */
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewQuotesBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewQuotesText: { fontSize: 12, fontWeight: '700', color: '#002FA7' },
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryCard: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },

  /* 6. Recent Activity */
  activitySection: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activitySectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  seeAllText: { fontSize: 12, fontWeight: '700', color: '#002FA7' },
  emptyActivity: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyActivityText: { fontSize: 12, color: '#94A3B8' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  activitySub: { fontSize: 11, color: '#64748B', marginTop: 1 },

  /* 7. Floating Action Button */
  fabButton: {
    position: 'absolute',
    bottom: 74,
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#002FA7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#002FA7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  timeframeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  timeframeOptionActive: { backgroundColor: '#EFF6FF' },
  timeframeOptionText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  timeframeOptionTextActive: { color: '#002FA7', fontWeight: '800' },

  /* SOP Modal */
  sopModalContainer: {
    flex: 1,
    marginTop: 60,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sopModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sopModalHeading: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sopSectionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sopTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sopCardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  sopCardDesc: { fontSize: 12, color: '#475569', lineHeight: 18 },
  sopActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#002FA7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  sopActionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  /* Rewards Modal */
  rewardsModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  rewardsHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  rewardsSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginVertical: 10 },
  wheelContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F59E0B',
    marginVertical: 16,
  },
  wheelGraphic: { justifyContent: 'center', alignItems: 'center' },
  wonBanner: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  wonBannerTitle: { fontSize: 14, fontWeight: '800', color: '#047857' },
  wonBannerText: { fontSize: 13, color: '#065F46', marginTop: 2 },
  spinBtn: {
    width: '100%',
    backgroundColor: '#002FA7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  spinBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  /* Brand Modal */
  brandModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  visitingCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  vcCompany: { color: '#93C5FD', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  vcName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 6 },
  vcRole: { color: '#CBD5E1', fontSize: 11, fontWeight: '600', marginTop: 2 },
  vcDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
  vcDetail: { color: '#E2E8F0', fontSize: 12, marginTop: 4 },
  shareBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#002FA7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBrandBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  /* FAB Action Sheet */
  fabActionSheet: {
    width: '100%',
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  fabSheetTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  fabSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  fabSheetItemText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
});
