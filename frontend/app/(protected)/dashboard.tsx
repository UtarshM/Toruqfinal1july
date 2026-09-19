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

// Banners for Hero Carousel matching partner reference design
const HERO_BANNERS = [
  {
    id: 'malamaal',
    badge: 'EVERY MONDAY TO SUNDAY | Motor & Health Policies',
    title: 'MALAMAAL Weekly',
    subtitle: 'Torque Partner Rewards & Incentives',
    leftTag: 'GUARANTEED INSTANT REWARD',
    leftValue: '50-1,000 COINS',
    rightTag: 'GRAND WEEKLY LOTTERY',
    rightValue: 'UP TO 20,000 COINS',
    btnText: 'Spin Lucky Wheel',
    type: 'reward',
    gradientBg: '#1E3A8A',
  },
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
    id: 'claims',
    badge: 'FAST-TRACK CLAIMS SOP',
    title: 'Zero-Hassle Claim Intimation',
    subtitle: 'Spot Survey, Video & Recording SOP',
    leftTag: 'OD & TP CLAIMS',
    leftValue: 'DIRECT DESK',
    rightTag: 'SURVEYOR SUPPORT',
    rightValue: '24/7 HELPLINE',
    btnText: 'File New Claim (SOP)',
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cache, setCache, loadCache } = useCacheStore();

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
  const [sopModalVisible, setSopModalVisible] = useState(false);
  const [rewardsModalVisible, setRewardsModalVisible] = useState(false);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [fabActionVisible, setFabActionVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'motor' | 'commercial'>('all');

  // Carousel Active Index
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  // Lucky Wheel Spin Simulation State
  const [spinning, setSpinning] = useState(false);
  const [wonCoins, setWonCoins] = useState<number | null>(null);

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
      const [sData, nData] = await Promise.all([
        api.get(`/dashboard/stats?timeframe=${timeframe}`).catch(() => null),
        api.get('/notifications?limit=6').catch(() => null),
      ]);

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
      const newItems = nData?.notifications || [];

      setStats(newStats);
      setItems(newItems);
      setCache('/dashboard/stats', { stats: newStats, items: newItems, timestamp: Date.now() });
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

  const handleBannerAction = (banner: (typeof HERO_BANNERS)[0]) => {
    if (banner.type === 'reward') {
      setRewardsModalVisible(true);
    } else if (banner.type === 'quote') {
      router.push('/(protected)/quotations' as any);
    } else if (banner.type === 'claim') {
      router.push('/(protected)/claims' as any);
    } else if (banner.type === 'loan') {
      router.push('/(protected)/loan-inquiries' as any);
    }
  };

  const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/(protected)/quotation-new',
      params: { category },
    } as any);
  };

  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setWonCoins(null);
    setTimeout(() => {
      const prizes = [50, 100, 150, 200, 500, 1000];
      const selected = prizes[Math.floor(Math.random() * prizes.length)];
      setWonCoins(selected);
      setSpinning(false);
    }, 1800);
  };

  const userName = user?.full_name || user?.name || 'Torque Advisor';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Drawer Sidebar */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 1. TOP HEADER (Matching reference screenshot) */}
      <View style={styles.header}>
        {/* Left: User Profile Avatar */}
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.avatarButton}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color="#2563EB" />
          </View>
          <View style={styles.onlineDot} />
        </Pressable>

        {/* Center / Welcome text */}
        <View style={styles.headerCenter}>
          <Text style={styles.brandTitle}>Torque Auto Advisor</Text>
          <Text style={styles.advisorName} numberOfLines={1}>
            {userName}
          </Text>
        </View>

        {/* Right Action Icons: Notification Bell (with badge), SOP/Tickets pill, Gift icon */}
        <View style={styles.headerActions}>
          {/* Notification Bell */}
          <Pressable
            onPress={() => router.push('/(protected)/notifications')}
            style={styles.headerIconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {items.length > 0 ? (items.length > 9 ? '9+' : items.length) : '4'}
              </Text>
            </View>
          </Pressable>

          {/* ? SOPs / Help Pill */}
          <Pressable onPress={() => setSopModalVisible(true)} style={styles.sopPillBtn}>
            <Ionicons name="help-circle-outline" size={16} color="#002FA7" />
            <Text style={styles.sopPillText}>SOPs</Text>
          </Pressable>

          {/* Gift / Rewards Icon */}
          <Pressable onPress={() => setRewardsModalVisible(true)} style={styles.headerIconBtn}>
            <Ionicons name="gift-outline" size={21} color="#002FA7" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002FA7" />}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. HERO PROMOTIONAL CAROUSEL (MALAMAAL Weekly & Torque Business Highlights) */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={carouselScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              if (slide !== activeBannerIndex && slide >= 0 && slide < HERO_BANNERS.length) {
                setActiveBannerIndex(slide);
              }
            }}
            scrollEventThrottle={16}
          >
            {HERO_BANNERS.map((banner) => (
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
                      name={banner.type === 'reward' ? 'sparkles' : 'shield-checkmark'}
                      size={28}
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
            {HERO_BANNERS.map((_, i) => (
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

        {/* 3. MY PERFORMANCE SECTION (Styled identically to the reference screenshot) */}
        <View style={styles.performanceOuterCard}>
          {/* Header row with Title & Dropdown Filter */}
          <View style={styles.performanceHeaderRow}>
            <Text style={styles.sectionHeading}>My Performance</Text>
            <Pressable
              onPress={() => setTimeframeModalVisible(true)}
              style={styles.dropdownPill}
            >
              <Text style={styles.dropdownPillText}>{getTimeframeLabel()}</Text>
              <Ionicons name="chevron-down" size={14} color="#002FA7" />
            </Pressable>
          </View>

          {/* 3 Primary Metric Cards in a row */}
          <View style={styles.metricsRow}>
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

            {/* Premium */}
            <Pressable
              style={styles.metricCard}
              onPress={() => router.push('/(protected)/policies')}
            >
              <View style={styles.metricTopRow}>
                <Ionicons name="cash" size={16} color="#10B981" />
                <Text style={styles.metricLabel}>Premium</Text>
              </View>
              <Text style={styles.metricValue}>
                {stats.revenue ? `₹${stats.revenue.toLocaleString()}` : '₹0'}
              </Text>
            </Pressable>

            {/* Renewals */}
            <Pressable
              style={styles.metricCard}
              onPress={() => router.push('/(protected)/renewals')}
            >
              <View style={styles.metricTopRow}>
                <Ionicons name="sync" size={16} color="#F59E0B" />
                <Text style={styles.metricLabel}>Renewals</Text>
              </View>
              <Text style={styles.metricValue}>
                {stats.renewals_count ?? 0}
              </Text>
            </Pressable>
          </View>

          {/* Operational Sub-Metrics Bar */}
          <View style={styles.subMetricsBar}>
            <Pressable
              style={styles.subMetricItem}
              onPress={() => router.push('/(protected)/claims')}
            >
              <Text style={styles.subMetricLabel}>ACTIVE CLAIMS</Text>
              <Text style={styles.subMetricValue}>{stats.active_claims ?? 0}</Text>
            </Pressable>
            <View style={styles.subMetricDivider} />
            <Pressable
              style={styles.subMetricItem}
              onPress={() => router.push('/(protected)/loan-inquiries' as any)}
            >
              <Text style={styles.subMetricLabel}>LOAN INQUIRIES</Text>
              <Text style={styles.subMetricValue}>{stats.active_loans ?? 0}</Text>
            </Pressable>
            <View style={styles.subMetricDivider} />
            <Pressable
              style={styles.subMetricItem}
              onPress={() => router.push('/(protected)/rto')}
            >
              <Text style={styles.subMetricLabel}>RTO & FITNESS</Text>
              <Text style={styles.subMetricValue}>
                {(stats.pending_rto ?? 0) + (stats.pending_fitness ?? 0)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4. RECOMMENDED FOR YOU / CORE SOP MODULES (Styled like reference screenshot) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Recommended For You</Text>

          <View style={styles.recommendedGrid}>
            {/* 1. Claims Hub */}
            <Pressable
              style={styles.recommendedItem}
              onPress={() => router.push('/(protected)/claims')}
            >
              <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="document-text" size={24} color="#2563EB" />
              </View>
              <Text style={styles.recItemTitle}>Claims Hub</Text>
            </Pressable>

            {/* 2. Loan Inquiries */}
            <Pressable
              style={styles.recommendedItem}
              onPress={() => router.push('/(protected)/loan-inquiries' as any)}
            >
              <View style={[styles.recIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cash" size={24} color="#D97706" />
              </View>
              <Text style={styles.recItemTitle}>Loans Desk</Text>
            </Pressable>

            {/* 3. RTO Work */}
            <Pressable
              style={styles.recommendedItem}
              onPress={() => router.push('/(protected)/rto')}
            >
              <View style={[styles.recIconWrap, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="car-sport" size={24} color="#DB2777" />
              </View>
              <Text style={styles.recItemTitle}>RTO Work</Text>
            </Pressable>

            {/* 4. My Brand */}
            <Pressable
              style={styles.recommendedItem}
              onPress={() => setBrandModalVisible(true)}
            >
              <View style={[styles.recIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="newspaper" size={24} color="#0284C7" />
              </View>
              <Text style={styles.recItemTitle}>My Brand</Text>
            </Pressable>
          </View>

          {/* Secondary Operations Row */}
          <View style={styles.secondaryRecRow}>
            <Pressable
              style={styles.secRecPill}
              onPress={() => router.push('/(protected)/fitness')}
            >
              <Ionicons name="fitness-outline" size={14} color="#002FA7" />
              <Text style={styles.secRecPillText}>Fitness Desk</Text>
            </Pressable>

            <Pressable
              style={styles.secRecPill}
              onPress={() => router.push('/(protected)/ughrani')}
            >
              <Ionicons name="wallet-outline" size={14} color="#002FA7" />
              <Text style={styles.secRecPillText}>Ughrani (Collections)</Text>
            </Pressable>

            <Pressable
              style={styles.secRecPill}
              onPress={() => router.push('/(protected)/rate-calculator')}
            >
              <Ionicons name="calculator-outline" size={14} color="#002FA7" />
              <Text style={styles.secRecPillText}>Rate Calc</Text>
            </Pressable>

            <Pressable
              style={styles.secRecPill}
              onPress={() => router.push('/(protected)/quotations')}
            >
              <Ionicons name="clipboard-outline" size={14} color="#002FA7" />
              <Text style={styles.secRecPillText}>Quotations</Text>
            </Pressable>
          </View>
        </View>



        {/* 6. RECENT UPDATES & SCHEDULED FOLLOW-UPS */}
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

      {/* 7. FLOATING ACTION BUTTON (Quick SOP Actions & Support) */}
      <Pressable
        style={styles.fabButton}
        onPress={() => setFabActionVisible(true)}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
      </Pressable>

      {/* 8. STICKY BOTTOM FOOTER (4 Core Tabs: Home, Leads, Follow-ups, Settings) */}
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

      {/* MODAL: TORQUE SOPS & HELP DESK */}
      <Modal
        visible={sopModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSopModalVisible(false)}
      >
        <View style={styles.sopModalContainer}>
          <View style={styles.sopModalHeader}>
            <Text style={styles.sopModalHeading}>Torque Operational SOPs</Text>
            <Pressable onPress={() => setSopModalVisible(false)}>
              <Ionicons name="close-circle" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView style={{ padding: 16 }}>
            {/* 1. Claims SOP */}
            <View style={styles.sopSectionCard}>
              <View style={styles.sopTitleRow}>
                <Ionicons name="document-text" size={18} color="#2563EB" />
                <Text style={styles.sopCardTitle}>1. Claims Intimation SOP</Text>
              </View>
              <Text style={styles.sopCardDesc}>
                • Collect: Vehicle Reg Number, Category, Insurance Co, Policy PDF.{'\n'}
                • Customer details: Contact Person Name, Mobile, Accident Date/Time/Location.{'\n'}
                • Upload: OD/TP claim declaration, Spot photos, Intimation call recording.
              </Text>
              <Pressable
                style={styles.sopActionBtn}
                onPress={() => {
                  setSopModalVisible(false);
                  router.push('/(protected)/claims');
                }}
              >
                <Text style={styles.sopActionBtnText}>Open Claims Desk</Text>
              </Pressable>
            </View>

            {/* 2. Loan Inquiries SOP */}
            <View style={styles.sopSectionCard}>
              <View style={styles.sopTitleRow}>
                <Ionicons name="cash" size={18} color="#16A34A" />
                <Text style={styles.sopCardTitle}>2. Loan Inquiries SOP</Text>
              </View>
              <Text style={styles.sopCardDesc}>
                • Inward logging: Inward Date, Customer Name, Mobile, Vehicle No, Category.{'\n'}
                • Finance details: Required Amount, Sanctioned Amount, Disbursed Date.{'\n'}
                • Partner NBFC/Bank name, Payout %, Payout Amount, Reason if not done.
              </Text>
              <Pressable
                style={styles.sopActionBtn}
                onPress={() => {
                  setSopModalVisible(false);
                  router.push('/(protected)/loan-inquiries' as any);
                }}
              >
                <Text style={styles.sopActionBtnText}>Open Loan Inquiries Desk</Text>
              </Pressable>
            </View>

            {/* 3. RTO & Fitness SOP */}
            <View style={styles.sopSectionCard}>
              <View style={styles.sopTitleRow}>
                <Ionicons name="car-sport" size={18} color="#D97706" />
                <Text style={styles.sopCardTitle}>3. RTO Work & Fitness SOP</Text>
              </View>
              <Text style={styles.sopCardDesc}>
                • Work types: New DL, Faceless Renewal, Heavy License, Truck CF, TO Permit.{'\n'}
                • Financials: Work Amount, Jama, Baki, Mobile No, Remarks & Receipts.
              </Text>
              <Pressable
                style={styles.sopActionBtn}
                onPress={() => {
                  setSopModalVisible(false);
                  router.push('/(protected)/rto');
                }}
              >
                <Text style={styles.sopActionBtnText}>Open RTO Desk</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: MALAMAAL REWARDS & LUCKY WHEEL */}
      <Modal
        visible={rewardsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRewardsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rewardsModalCard}>
            <View style={styles.rewardsHeader}>
              <Text style={styles.rewardsTitle}>MALAMAAL Weekly Rewards</Text>
              <Pressable onPress={() => setRewardsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.rewardsSub}>
              Spin the lucky wheel for policy bookings & claim timely payouts!
            </Text>

            {/* Lucky Wheel Graphic Simulation */}
            <View style={styles.wheelContainer}>
              <View
                style={[
                  styles.wheelGraphic,
                  spinning && { transform: [{ rotate: '720deg' }] },
                ]}
              >
                <Ionicons name="trophy" size={54} color="#F59E0B" />
              </View>
            </View>

            {wonCoins !== null ? (
              <View style={styles.wonBanner}>
                <Text style={styles.wonBannerTitle}>Congratulations!</Text>
                <Text style={styles.wonBannerText}>
                  You won <Text style={{ fontWeight: '900', color: '#10B981' }}>{wonCoins} Torque Coins</Text>!
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSpinWheel}
              disabled={spinning}
              style={[styles.spinBtn, spinning && { opacity: 0.7 }]}
            >
              <Text style={styles.spinBtnText}>
                {spinning ? 'Spinning the Wheel...' : 'Spin Wheel (Free)'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: MY BRAND (Digital Visiting Card & Marketing Poster) */}
      <Modal
        visible={brandModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.brandModalCard}>
            <View style={styles.rewardsHeader}>
              <Text style={styles.rewardsTitle}>My Digital Brand</Text>
              <Pressable onPress={() => setBrandModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* Visiting Card Preview */}
            <View style={styles.visitingCard}>
              <Text style={styles.vcCompany}>TORQUE AUTO ADVISOR</Text>
              <Text style={styles.vcName}>{userName}</Text>
              <Text style={styles.vcRole}>Authorized Insurance & Finance Partner</Text>
              <View style={styles.vcDivider} />
              <Text style={styles.vcDetail}>📞 {user?.email || 'torqueautoadvisor@gmail.com'}</Text>
              <Text style={styles.vcDetail}>🛡️ Motor · Commercial · Health · Loans · RTO</Text>
            </View>

            <Pressable
              onPress={() => {
                Alert.alert(
                  'Share Brand',
                  `Sharing visiting card for ${userName} via WhatsApp...`
                );
                setBrandModalVisible(false);
              }}
              style={styles.shareBrandBtn}
            >
              <Ionicons name="share-social" size={16} color="#FFFFFF" />
              <Text style={styles.shareBrandBtnText}>Share Digital Visiting Card</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: QUICK SOP FAB ACTIONS */}
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
            <Text style={styles.fabSheetTitle}>Quick Actions & SOPs</Text>

            <Pressable
              style={styles.fabSheetItem}
              onPress={() => {
                setFabActionVisible(false);
                router.push('/(protected)/leads');
              }}
            >
              <Ionicons name="people" size={20} color="#002FA7" />
              <Text style={styles.fabSheetItemText}>New Vehicle Lead</Text>
            </Pressable>

            <Pressable
              style={styles.fabSheetItem}
              onPress={() => {
                setFabActionVisible(false);
                router.push('/(protected)/claims');
              }}
            >
              <Ionicons name="document-text" size={20} color="#DC2626" />
              <Text style={styles.fabSheetItemText}>File Claim Intimation (SOP)</Text>
            </Pressable>

            <Pressable
              style={styles.fabSheetItem}
              onPress={() => {
                setFabActionVisible(false);
                router.push('/(protected)/loan-inquiries' as any);
              }}
            >
              <Ionicons name="cash" size={20} color="#16A34A" />
              <Text style={styles.fabSheetItemText}>New Loan Inquiry (SOP)</Text>
            </Pressable>

            <Pressable
              style={styles.fabSheetItem}
              onPress={() => {
                setFabActionVisible(false);
                router.push('/(protected)/rto');
              }}
            >
              <Ionicons name="car" size={20} color="#D97706" />
              <Text style={styles.fabSheetItemText}>Submit RTO / Fitness Work</Text>
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
                Linking.openURL('tel:9510819589').catch(() => {});
              }}
            >
              <Ionicons name="call" size={20} color="#2563EB" />
              <Text style={styles.fabSheetItemText}>Call Admin Desk</Text>
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
  brandTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase' },
  advisorName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
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
