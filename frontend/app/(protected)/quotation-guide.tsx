import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';
import {
  GVW_BRACKETS,
  GCV_RULES,
  PCV_RULES,
  TP_GCV_RATES,
  TP_LMV_RATES,
  TP_2W_RATES,
  RTO_LIST,
  POLICY_DOWNLOAD_LINKS,
  LMV_ADDON_DICTIONARY,
  SPECIAL_OPERATIONAL_RULES,
  recommendBestInsurers,
} from '../../src/data/quotationGuideData';

type GuideTab = 'finder' | 'gcv' | 'pcv_lmv' | 'tp_rto' | 'links';

export default function QuotationGuideScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideTab>('finder');
  const [searchQuery, setSearchQuery] = useState('');

  // Smart Finder state
  const [vehicleType, setVehicleType] = useState<'GCV' | 'PCV' | 'LMV' | '3W' | 'TRACTOR' | 'BIKE'>('GCV');
  const [gvwBracket, setGvwBracket] = useState<string>('0-2500');
  const [policyType, setPolicyType] = useState<'ALL' | 'NORMAL' | 'NIL_DEP' | 'TP'>('ALL');
  const [rtoInput, setRtoInput] = useState<string>('');
  const [isTanker, setIsTanker] = useState(false);
  const [isWaterMilk, setIsWaterMilk] = useState(false);

  // GCV filter
  const [gcvFilterBracket, setGcvFilterBracket] = useState<string>('ALL');
  const [gcvFilterPolicy, setGcvFilterPolicy] = useState<'ALL' | 'NORMAL' | 'NIL_DEP'>('ALL');

  const recommendation = useMemo(() => {
    return recommendBestInsurers({
      vehicleType,
      gvwBracket,
      policyType,
      rtoCode: rtoInput.trim().toUpperCase(),
      isTanker,
      isWaterMilk,
    });
  }, [vehicleType, gvwBracket, policyType, rtoInput, isTanker, isWaterMilk]);

  const filteredGcvRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GCV_RULES.filter((r) => {
      if (gcvFilterBracket !== 'ALL' && r.gvw !== gcvFilterBracket) return false;
      if (gcvFilterPolicy !== 'ALL' && r.policyType !== gcvFilterPolicy && r.policyType !== 'ALL') return false;
      if (!q) return true;
      return (
        r.company.toLowerCase().includes(q) ||
        r.gvw.toLowerCase().includes(q) ||
        r.declinedRto.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q) ||
        r.quoteFrom.toLowerCase().includes(q)
      );
    });
  }, [gcvFilterBracket, gcvFilterPolicy, searchQuery]);

  const filteredRtos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return RTO_LIST;
    return RTO_LIST.filter(
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Quotation Guide</Text>
          <Text style={styles.headerSub}>Underwriting Rules, GVW Matrix, RTOs & Portals</Text>
        </View>
        <View style={styles.badgeAllRoles}>
          <Text style={styles.badgeAllRolesText}>ALL STAFF</Text>
        </View>
      </View>

      {/* Top Tabs */}
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {[
            { key: 'finder', label: 'Smart Finder', icon: 'sparkles' },
            { key: 'gcv', label: 'GCV Matrix', icon: 'bus' },
            { key: 'pcv_lmv', label: 'PCV & LMV', icon: 'car' },
            { key: 'tp_rto', label: 'TP & RTOs', icon: 'map' },
            { key: 'links', label: 'Portal Links', icon: 'link' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setActiveTab(t.key as GuideTab)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : '#475569'}
                />
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Bar for searchable tabs */}
      {(activeTab === 'gcv' || activeTab === 'tp_rto') && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'gcv'
                ? 'Search company, RTO (e.g. GJ03), or remarks...'
                : 'Search RTO code (e.g. GJ-03) or city...'
            }
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
        {/* TAB 1: SMART FINDER */}
        {activeTab === 'finder' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>1. Vehicle & Policy Selection</Text>

              <Text style={styles.fieldLabel}>Vehicle Segment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {(['GCV', 'PCV', 'LMV', '3W', 'TRACTOR', 'BIKE'] as const).map((vt) => (
                  <Pressable
                    key={vt}
                    style={[styles.selectChip, vehicleType === vt && styles.selectChipActive]}
                    onPress={() => setVehicleType(vt)}
                  >
                    <Text style={[styles.selectChipText, vehicleType === vt && styles.selectChipTextActive]}>
                      {vt}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {vehicleType === 'GCV' && (
                <>
                  <Text style={styles.fieldLabel}>GVW Bracket (kg)</Text>
                  <View style={styles.wrapRow}>
                    {GVW_BRACKETS.map((b) => (
                      <Pressable
                        key={b.id}
                        style={[styles.selectChip, gvwBracket === b.id && styles.selectChipActive]}
                        onPress={() => setGvwBracket(b.id)}
                      >
                        <Text style={[styles.selectChipText, gvwBracket === b.id && styles.selectChipTextActive]}>
                          {b.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Policy Cover Type</Text>
              <View style={styles.chipRow}>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'NORMAL', label: 'Normal' },
                  { id: 'NIL_DEP', label: 'Nil Dep' },
                  { id: 'TP', label: 'Only TP' },
                ].map((pt) => (
                  <Pressable
                    key={pt.id}
                    style={[styles.selectChip, policyType === pt.id && styles.selectChipActive]}
                    onPress={() => setPolicyType(pt.id as any)}
                  >
                    <Text style={[styles.selectChipText, policyType === pt.id && styles.selectChipTextActive]}>
                      {pt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>RTO Code (Optional, e.g. GJ03)</Text>
              <TextInput
                style={styles.textInput}
                value={rtoInput}
                onChangeText={(v) => setRtoInput(v.toUpperCase())}
                placeholder="e.g. GJ03, GJ01, GJ12"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />

              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleChip, isTanker && styles.toggleChipActive]}
                  onPress={() => setIsTanker(!isTanker)}
                >
                  <Ionicons name={isTanker ? 'checkbox' : 'square-outline'} size={16} color={isTanker ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.toggleChipText, isTanker && styles.toggleChipTextActive]}>Tanker</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleChip, isWaterMilk && styles.toggleChipActive]}
                  onPress={() => setIsWaterMilk(!isWaterMilk)}
                >
                  <Ionicons name={isWaterMilk ? 'checkbox' : 'square-outline'} size={16} color={isWaterMilk ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.toggleChipText, isWaterMilk && styles.toggleChipTextActive]}>Water / Milk</Text>
                </Pressable>
              </View>
            </View>

            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <View style={styles.warnCard}>
                {recommendation.warnings.map((w, idx) => (
                  <View key={idx} style={styles.warnRow}>
                    <Ionicons name="warning" size={16} color="#B45309" />
                    <Text style={styles.warnText}>{w}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Pick */}
            {recommendation.topPick && (
              <View style={styles.topPickCard}>
                <View style={styles.topPickBadgeRow}>
                  <Text style={styles.topPickBadge}>★ TOP CHOICE (#1)</Text>
                  <Text style={styles.topPickGroup}>{recommendation.topPick.groupCode}</Text>
                </View>
                <Text style={styles.topPickCompany}>{recommendation.topPick.company}</Text>
                <Text style={styles.topPickSub}>Quote From: {recommendation.topPick.quoteFrom || 'Standard'}</Text>
                <View style={styles.metaGrid}>
                  <Text style={styles.metaLine}>• Inspection: {recommendation.topPick.inspection || 'Check'}</Text>
                  <Text style={styles.metaLine}>• PA Cover: {recommendation.topPick.paCover || 'As per rule'}</Text>
                  {recommendation.topPick.discount ? (
                    <Text style={styles.metaLine}>• Discount Guide: {recommendation.topPick.discount}</Text>
                  ) : null}
                  {recommendation.topPick.modelAndRto ? (
                    <Text style={styles.metaLine}>• Model / RTO: {recommendation.topPick.modelAndRto}</Text>
                  ) : null}
                  {recommendation.topPick.remarks ? (
                    <Text style={styles.metaRemark}>Note: {recommendation.topPick.remarks}</Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Alternatives */}
            {recommendation.alternatives.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Backup Insurer Choices</Text>
                {recommendation.alternatives.map((alt, i) => (
                  <View key={i} style={styles.altItem}>
                    <View style={styles.altHeader}>
                      <Text style={styles.altRank}>Choice #{alt.rank}</Text>
                      <Text style={styles.altCompany}>{alt.company}</Text>
                      <Text style={styles.altQuote}>{alt.quoteFrom}</Text>
                    </View>
                    {alt.remarks ? <Text style={styles.altRemarks}>{alt.remarks}</Text> : null}
                    {alt.warningAlert ? <Text style={styles.altWarn}>⚠ {alt.warningAlert}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {/* Key Operational Rules */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Important Operational Rules</Text>
              {SPECIAL_OPERATIONAL_RULES.map((rule, idx) => (
                <View key={idx} style={styles.opRuleCard}>
                  <Text style={styles.opRuleTitle}>{rule.title}</Text>
                  <Text style={styles.opRuleEn}>{rule.detail}</Text>
                  <Text style={styles.opRuleGu}>{rule.gujarati}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: GCV MATRIX */}
        {activeTab === 'gcv' && (
          <View style={{ gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                style={[styles.selectChip, gcvFilterBracket === 'ALL' && styles.selectChipActive]}
                onPress={() => setGcvFilterBracket('ALL')}
              >
                <Text style={[styles.selectChipText, gcvFilterBracket === 'ALL' && styles.selectChipTextActive]}>All GVW</Text>
              </Pressable>
              {GVW_BRACKETS.map((b) => (
                <Pressable
                  key={b.id}
                  style={[styles.selectChip, gcvFilterBracket === b.id && styles.selectChipActive]}
                  onPress={() => setGcvFilterBracket(b.id)}
                >
                  <Text style={[styles.selectChipText, gcvFilterBracket === b.id && styles.selectChipTextActive]}>{b.id}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.chipRow}>
              {(['ALL', 'NORMAL', 'NIL_DEP'] as const).map((pt) => (
                <Pressable
                  key={pt}
                  style={[styles.selectChip, gcvFilterPolicy === pt && styles.selectChipActive]}
                  onPress={() => setGcvFilterPolicy(pt)}
                >
                  <Text style={[styles.selectChipText, gcvFilterPolicy === pt && styles.selectChipTextActive]}>{pt}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.countText}>Showing {filteredGcvRules.length} rules</Text>

            {filteredGcvRules.map((r, idx) => (
              <View key={idx} style={styles.ruleCard}>
                <View style={styles.ruleCardHeader}>
                  <View style={styles.choicePill}>
                    <Text style={styles.choicePillText}>#{r.choice}</Text>
                  </View>
                  <Text style={styles.ruleCompany}>{r.company}</Text>
                  <Text style={styles.ruleGvwBadge}>{r.gvw}</Text>
                </View>
                <Text style={styles.ruleMeta}>
                  Type: {r.policyType} • Quote From: {r.quoteFrom || '—'} • Inspection: {r.inspection || '—'}
                </Text>
                {r.declinedRto ? (
                  <Text style={styles.declinedText}>Declined RTO/Cases: {r.declinedRto}</Text>
                ) : null}
                {r.modelAndRto ? <Text style={styles.ruleDetail}>Model/RTO: {r.modelAndRto}</Text> : null}
                {r.remarks ? <Text style={styles.ruleDetail}>Remarks: {r.remarks}</Text> : null}
                {r.paCover ? <Text style={styles.ruleDetail}>PA Cover: {r.paCover}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: PCV & LMV */}
        {activeTab === 'pcv_lmv' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PCV Rules (Taxi, Bus, Auto, School Bus)</Text>
              {PCV_RULES.map((p, i) => (
                <View key={i} style={styles.ruleCard}>
                  <View style={styles.ruleCardHeader}>
                    <View style={styles.choicePill}>
                      <Text style={styles.choicePillText}>#{p.choice}</Text>
                    </View>
                    <Text style={styles.ruleCompany}>{p.company}</Text>
                    <Text style={styles.ruleGvwBadge}>{p.quoteFrom}</Text>
                  </View>
                  <Text style={styles.ruleDetail}>{p.category}</Text>
                  <Text style={styles.ruleMeta}>Inspection: {p.inspection || '—'} • Discount: {p.discount || '—'}</Text>
                  {p.declined ? <Text style={styles.declinedText}>Declined: {p.declined}</Text> : null}
                  {p.remarks ? <Text style={styles.ruleDetail}>Remarks: {p.remarks}</Text> : null}
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>LMV Add-on Dictionary</Text>
              {LMV_ADDON_DICTIONARY.map((a, i) => (
                <View key={i} style={styles.addonRow}>
                  <Text style={styles.addonName}>{a.addon} ({a.shortForm})</Text>
                  <Text style={styles.addonDesc}>
                    Tata: {a.tata} • Digit: {a.digit} • ICICI: {a.icici} • SBI: {a.sbi} • HDFC: {a.hdfc}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 4: TP RATES & RTO LIST */}
        {activeTab === 'tp_rto' && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>TP GCV Rates</Text>
              {TP_GCV_RATES.map((t, i) => (
                <View key={i} style={styles.tpRow}>
                  <View style={styles.tpHeader}>
                    <Text style={styles.tpGvw}>{t.gvw}</Text>
                    <Text style={styles.tpPrem}>Std TP: ₹{t.premium}</Text>
                  </View>
                  <Text style={styles.tpComp}>{t.company}</Text>
                  <Text style={styles.tpRate}>{t.rate}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>TP LMV & 2-Wheeler Rates</Text>
              {TP_LMV_RATES.map((l, i) => (
                <View key={`lmv-${i}`} style={styles.tpSimpleRow}>
                  <Text style={styles.tpSimpleLeft}>
                    {l.segment ? `${l.segment} — ` : ''}{l.plan}
                  </Text>
                  <Text style={styles.tpSimpleVal}>₹{l.rate}</Text>
                </View>
              ))}
              {TP_2W_RATES.map((b, i) => (
                <View key={`2w-${i}`} style={styles.tpSimpleRow}>
                  <Text style={styles.tpSimpleLeft}>{b.category} ({b.company})</Text>
                  <Text style={styles.tpSimpleVal}>₹{b.rate}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gujarat RTO Codes ({filteredRtos.length})</Text>
              {filteredRtos.map((r) => (
                <View key={r.code} style={styles.rtoRow}>
                  <Text style={styles.rtoCode}>{r.code}</Text>
                  <Text style={styles.rtoName}>{r.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 5: PORTAL LINKS */}
        {activeTab === 'links' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Policy Download & Portal Links</Text>
            {POLICY_DOWNLOAD_LINKS.map((item, idx) => (
              <View key={idx} style={styles.linkCard}>
                <Text style={styles.linkCompany}>{item.company}</Text>
                {item.note ? <Text style={styles.linkNote}>{item.note}</Text> : null}
                <View style={styles.linkBtnRow}>
                  {item.link1 && item.link1.startsWith('http') ? (
                    <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(item.link1)}>
                      <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.linkBtnText}>Open Portal 1</Text>
                    </Pressable>
                  ) : null}
                  {item.link2 && item.link2.startsWith('http') ? (
                    <Pressable style={[styles.linkBtn, { backgroundColor: '#0F172A' }]} onPress={() => Linking.openURL(item.link2)}>
                      <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.linkBtnText}>Portal 2</Text>
                    </Pressable>
                  ) : item.link2 ? (
                    <Text style={styles.linkNote}>Secondary: {item.link2}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AppFooter active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  menuBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  badgeAllRoles: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeAllRolesText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  tabBarWrap: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabBar: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: { backgroundColor: '#002FA7' },
  tabChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tabChipTextActive: { color: '#FFFFFF' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#0F172A', fontWeight: '600' },
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectChipActive: { backgroundColor: '#002FA7', borderColor: '#002FA7' },
  selectChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  selectChipTextActive: { color: '#FFFFFF' },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  toggleChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  toggleChipTextActive: { color: '#FFFFFF' },
  warnCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  warnRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E' },
  topPickCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  topPickBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topPickBadge: { fontSize: 10, fontWeight: '900', color: '#FACC15', letterSpacing: 0.6 },
  topPickGroup: { fontSize: 11, fontWeight: '800', color: '#93C5FD' },
  topPickCompany: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  topPickSub: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  metaGrid: { marginTop: 6, gap: 4 },
  metaLine: { fontSize: 12, color: '#E2E8F0', fontWeight: '600' },
  metaRemark: { fontSize: 12, color: '#FDE68A', fontWeight: '700', marginTop: 4 },
  altItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  altHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altRank: { fontSize: 11, fontWeight: '800', color: '#002FA7' },
  altCompany: { fontSize: 13, fontWeight: '900', color: '#0F172A', flex: 1 },
  altQuote: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  altRemarks: { fontSize: 11, color: '#475569' },
  altWarn: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  opRuleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  opRuleTitle: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  opRuleEn: { fontSize: 11, color: '#334155', lineHeight: 16 },
  opRuleGu: { fontSize: 11, color: '#002FA7', fontWeight: '600', lineHeight: 16 },
  countText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  ruleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choicePill: { backgroundColor: '#002FA7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  choicePillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  ruleCompany: { flex: 1, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  ruleGvwBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ruleMeta: { fontSize: 11, fontWeight: '700', color: '#475569' },
  declinedText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  ruleDetail: { fontSize: 11, color: '#334155', lineHeight: 16 },
  addonRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    gap: 2,
  },
  addonName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  addonDesc: { fontSize: 11, color: '#475569' },
  tpRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  tpHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tpGvw: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  tpPrem: { fontSize: 11, fontWeight: '800', color: '#059669' },
  tpComp: { fontSize: 11, fontWeight: '700', color: '#002FA7' },
  tpRate: { fontSize: 11, color: '#334155', lineHeight: 16 },
  tpSimpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tpSimpleLeft: { flex: 1, fontSize: 11, fontWeight: '600', color: '#334155' },
  tpSimpleVal: { fontSize: 12, fontWeight: '900', color: '#002FA7' },
  rtoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  rtoCode: { fontSize: 12, fontWeight: '900', color: '#002FA7', width: 58 },
  rtoName: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1E293B' },
  linkCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  linkCompany: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  linkNote: { fontSize: 11, color: '#64748B' },
  linkBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#002FA7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});
