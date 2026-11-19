import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/utils/theme';
import AppFooter from '../../src/components/AppFooter';
import Sidebar from '../../src/components/Sidebar';

interface SopItem {
  id: string;
  category: string;
  title: string;
  steps: string[];
  importantNote?: string;
  badge: string;
}

const SOP_DATA: SopItem[] = [
  {
    id: '1',
    category: 'POLICY ISSUANCE',
    badge: 'Core Workflow',
    title: 'Standard Operating Procedure: New Policy Entry & KYC',
    steps: [
      '1. Verify customer RC copy and previous policy copy (ensure chassis and engine numbers match).',
      '2. Calculate gross and net premium using Torque Rate Calculator with appropriate NCB/discount slabs.',
      '3. Collect customer KYC documents: Aadhaar card / PAN card / GST certificate for company vehicles.',
      '4. Generate quotation and confirm policy issuance approval from Manager or Admin.',
      '5. Complete 25-field Policy Submission Form and attach proposal copy and payment screenshot.',
      '6. Download the final PDF and dispatch via WhatsApp / Email to customer immediately upon issuance.'
    ],
    importantNote: 'Always verify existing NCB status before locking discounts to avoid penalty or cancellation.'
  },
  {
    id: '2',
    category: 'CLAIMS DESK',
    badge: 'Urgent',
    title: 'Claims Registration & Advance Payment Workflow',
    steps: [
      '1. Intimate claim immediately upon customer accident report (within 24 hours).',
      '2. Collect spot photos, FIR/Panchnama (if third party/major injury), driver license, and RC copy.',
      '3. Submit claim into Torque Claims Hub and assign a dedicated surveyor.',
      '4. For cashless claims, coordinate with network garage and upload repair estimate.',
      '5. If claim advance payment is authorized, log payment voucher in Finance under Claim Advance.',
      '6. Track overdue claims daily until final surveyor approval and payment settlement.'
    ],
    importantNote: 'Overdue claims beyond 7 days must be escalated directly to Management.'
  },
  {
    id: '3',
    category: 'RTO & PERMIT',
    badge: 'Compliance',
    title: 'Commercial Vehicle Fitness & Permit Processing',
    steps: [
      '1. Check vehicle tax receipt, pending e-challans, and valid insurance before applying.',
      '2. Collect old fitness certificate and speed governor calibration certificate.',
      '3. Book RTO inspection slot via Vahan portal and submit physical documents at RTO counter.',
      '4. Track "Fitness To Be Done" and "Permit To Be Done" queues in the operations dashboard.',
      '5. Once issued, upload digital copy in PDF Section and deliver hard copy to customer.'
    ]
  },
  {
    id: '4',
    category: 'RENEWALS',
    badge: 'Revenue',
    title: 'Renewal Allotment & Payment Collection',
    steps: [
      '1. Review Alloted Renewal List daily on your dashboard.',
      '2. Initiate customer follow-up 45 days, 30 days, 15 days, and 3 days before expiry.',
      '3. Send renewal quote comparison (Third Party vs Comprehensive vs Zero Dep).',
      '4. Upon payment receipt, record transaction in "Payment Taken Detail".',
      '5. Update lead status to "Policy Done" and tag policy number.'
    ]
  },
  {
    id: '5',
    category: 'HR & DISCIPLINE',
    badge: 'Rules',
    title: 'Leave Policy, Late Mark, and Penalties Guide',
    steps: [
      '1. All leaves must be applied at least 24 hours in advance using the mobile APPLY button.',
      '2. Working hours start at 9:30 AM. More than 15 minutes delay counts as Late Mark.',
      '3. 3 Late Marks in a calendar month result in half-day deduction as per HR Policy.',
      '4. Unapproved absences without prior notice attract daily hisab penalty.',
      '5. Monthly salary calculation sheets are finalized on the 1st of every month.'
    ]
  }
];

export default function SopsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const filtered = SOP_DATA.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Standard Operating Procedures</Text>
            <Text style={styles.headerSubtitle}>Torque Auto Advisor • Master Guidelines</Text>
          </View>
        </View>
        <Pressable onPress={() => setSidebarVisible(true)} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={26} color="#0F172A" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search SOP guidelines, rules, or workflows..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              <Pressable
                style={styles.cardHeader}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                    <View style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>{item.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#64748B"
                  style={{ marginLeft: 8 }}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.cardBody}>
                  <View style={styles.divider} />
                  <Text style={styles.stepHeading}>Step-by-Step Execution:</Text>
                  {item.steps.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#002FA7" style={{ marginTop: 2, marginRight: 8 }} />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  {item.importantNote && (
                    <View style={styles.noteBox}>
                      <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={styles.noteText}>{item.importantNote}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AppFooter active="home" />
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 6, borderRadius: 10, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  categoryBadge: { fontSize: 10, fontWeight: '800', color: '#002FA7', letterSpacing: 0.5 },
  miniBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  miniBadgeText: { fontSize: 9.5, fontWeight: '700', color: '#1D4ED8' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 20 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  stepHeading: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  stepText: { flex: 1, fontSize: 12.5, color: '#475569', lineHeight: 18 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 11.5, color: '#991B1B', fontWeight: '600', lineHeight: 16 },
});
