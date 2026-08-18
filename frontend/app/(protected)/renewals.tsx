import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  TextInput, Linking, Platform, Alert, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../src/components/Sidebar';
import { useAuth } from '../../src/context/AuthContext';
import { MASTER_COMPANIES, MASTER_CATEGORIES } from './policies';

const URGENCY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: '30days', label: '30 Days' },
  { key: '60days', label: '60 Days' },
];

export default function RenewalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');

  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // Selected item for 25 fields detail modal
  const [selectedRenewal, setSelectedRenewal] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (urgency !== 'all') params.set('urgency', urgency);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      
      let fetchedItems: any[] = [];
      let fetchedSummary: any = {};

      try {
        const res = await api.get<any>(`/renewals${query}`);
        if (res?.items) {
          fetchedItems = res.items;
          fetchedSummary = res.summary || {};
        }
      } catch (apiErr) {
        console.warn('[Renewals API err, falling back to Supabase DB]', apiErr);
      }

      if (fetchedItems.length === 0) {
        const now = new Date();
        const { data: dbLeads } = await supabase
          .from('leads')
          .select('id, clientName, clientPhone, clientEmail, vehicleNo, expiryDate, status, customFields, assignee:assignedTo(fullName)')
          .not('expiryDate', 'is', null)
          .is('deletedAt', null)
          .order('expiryDate', { ascending: true })
          .limit(300);

        if (dbLeads) {
          fetchedItems = dbLeads.map((l: any) => {
            const exp = new Date(l.expiryDate);
            const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let itemUrgency = '60days';
            if (daysLeft < 0) itemUrgency = 'overdue';
            else if (daysLeft <= 30) itemUrgency = '30days';

            const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {};
            const sub = cf.policySubmission || {};
            const formData = sub.formData || {};

            return {
              id: l.id,
              leadId: l.id,
              clientName: l.clientName || 'Customer',
              clientPhone: l.clientPhone || formData.mobileNo1 || '',
              mobileNo2: formData.mobileNo2 || '',
              clientEmail: l.clientEmail || '',
              vehicleNo: l.vehicleNo || formData.regNo || 'N/A',
              category: formData.customerCategory || formData.cat || 'N/A',
              model: formData.model || 'N/A',
              gvw: formData.gvw || 'N/A',
              via: formData.via || 'Direct',
              expiryDate: l.expiryDate,
              daysRemaining: daysLeft,
              urgencyCategory: itemUrgency,
              policyNumber: sub.policyNumber || sub.issuedPolicyNumber || formData.policyNumber || 'N/A',
              provider: sub.issuedProvider || formData.provider || formData.insCompany || 'N/A',
              type: formData.policyType || 'N/A',
              netPremium: parseFloat(formData.netPremium || '0') || 0,
              totalPremium: parseFloat(formData.totalPremium || formData.rsFromCustomer || sub.issuedPremium || '0') || 0,
              paidAmount: parseFloat(formData.paidAmount || formData.rsFromCustomer || '0') || 0,
              pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
              paymentMode: formData.paymentMode || 'Cash',
              compiledPdfUrl: sub.compiledPdfUrl || null,
              issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
              renewalStatus: cf.renewalStatus || (daysLeft < 0 ? 'Overdue / Expired' : 'Pending Contact'),
              salesPersonName: l.assignee?.fullName || 'Unassigned',
              hpDetails: formData.hpDetails || 'N/A',
              ncb: formData.ncb || 'N/A',
              formData,
              documents: sub.documents || [],
            };
          }).filter((item: any) => {
            if (urgency !== 'all' && item.urgencyCategory !== urgency) return false;
            if (companyFilter !== 'ALL' && !item.provider?.toUpperCase().includes(companyFilter)) return false;
            if (catFilter !== 'ALL' && !item.category?.toUpperCase().includes(catFilter)) return false;
            if (search.trim()) {
              const q = search.toLowerCase();
              return (
                item.clientName?.toLowerCase().includes(q) ||
                item.vehicleNo?.toLowerCase().includes(q) ||
                item.clientPhone?.includes(q) ||
                item.policyNumber?.toLowerCase().includes(q) ||
                item.provider?.toLowerCase().includes(q)
              );
            }
            return true;
          });

          fetchedSummary = {
            totalRenewals: fetchedItems.length,
            overdueCount: fetchedItems.filter((i: any) => i.daysRemaining < 0).length,
            expiring30Days: fetchedItems.filter((i: any) => i.daysRemaining >= 0 && i.daysRemaining <= 30).length,
            renewedCount: fetchedItems.filter((i: any) => i.renewalStatus === 'Renewed').length,
            totalVolume: fetchedItems.reduce((sum: number, i: any) => sum + (i.totalPremium || 0), 0),
          };
        }
      }

      setItems(fetchedItems);
      setSummary(fetchedSummary);
    } catch (e) {
      console.error('[RenewalsScreen] Error loading renewals:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [urgency, companyFilter, catFilter, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const previewPdf = async (url: string) => {
    if (!url) {
      Alert.alert('No Document', 'Document file is not attached.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      Linking.openURL(url);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Phone number not available for this client.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not initiate call.'));
  };

  const handleWhatsApp = (item: any) => {
    if (!item.clientPhone) {
      Alert.alert('No Phone', 'Phone number not available for this client.');
      return;
    }
    const cleanPhone = item.clientPhone.replace(/[^0-9]/g, '');
    const expDateStr = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : 'upcoming';
    const message = encodeURIComponent(
      `Hello ${item.clientName},\n\nThis is regarding the renewal of your Motor Insurance Policy for vehicle *${item.vehicleNo}* (Policy #${item.policyNumber}).\n\nExpiry Date: *${expDateStr}*\nInsurance Provider: *${item.provider}*\n\nPlease let us know if you would like us to process the renewal with the best rates.\n\nThank you,\n*Torque Auto Advisor*`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp.');
    });
  };

  const handleDownloadMonthlyMasterSheet = async () => {
    setDownloadingSheet(true);
    try {
      let downloaded = false;
      try {
        const res = await api.get<any>('/manager/monthly-sheet');
        if (res?.sheetUrl && (res.totalPolicies > 0 || res.count > 0)) {
          if (Platform.OS === 'web') {
            Linking.openURL(res.sheetUrl);
            downloaded = true;
          } else {
            const fileUri = FileSystem.documentDirectory + (res.fileName || 'master_renewals.xlsx');
            const download = await FileSystem.downloadAsync(res.sheetUrl, fileUri);
            if (download.uri) {
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(download.uri, {
                  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  dialogTitle: 'Master Policy Excel Sheet'
                });
              } else {
                Alert.alert('Downloaded', 'Excel sheet saved to your phone.');
              }
              downloaded = true;
            }
          }
        }
      } catch (serverErr) {
        console.warn('[Server monthly-sheet download error, falling back to local generator]', serverErr);
      }

      // If server returned no data or failed, immediately generate locally from items on screen!
      if (!downloaded) {
        await handleExportCSV();
      }
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not download master sheet.');
    } finally {
      setDownloadingSheet(false);
    }
  };

  const handleExportCSV = async () => {
    let exportRows = items;
    if (exportRows.length === 0) {
      // Fallback: Query Supabase directly
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('id, clientName, clientPhone, vehicleNo, expiryDate, status, customFields, assignee:assignedTo(fullName)')
        .not('expiryDate', 'is', null)
        .is('deletedAt', null)
        .limit(100);

      if (dbLeads && dbLeads.length > 0) {
        exportRows = dbLeads.map((l: any) => {
          const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {};
          const sub = cf.policySubmission || {};
          const formData = sub.formData || {};
          return {
            vehicleNo: l.vehicleNo || formData.regNo || 'N/A',
            category: formData.customerCategory || formData.cat || 'N/A',
            clientPhone: l.clientPhone || formData.mobileNo1 || '',
            mobileNo2: formData.mobileNo2 || '',
            clientName: l.clientName || 'Customer',
            model: formData.model || 'N/A',
            gvw: formData.gvw || 'N/A',
            expiryDate: l.expiryDate,
            provider: sub.issuedProvider || formData.provider || formData.insCompany || 'N/A',
            type: formData.policyType || 'N/A',
            via: formData.via || 'Direct',
            netPremium: parseFloat(formData.netPremium || '0') || 0,
            totalPremium: parseFloat(formData.totalPremium || formData.rsFromCustomer || sub.issuedPremium || '0') || 0,
            paidAmount: parseFloat(formData.paidAmount || formData.rsFromCustomer || '0') || 0,
            pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
            policyNumber: sub.policyNumber || sub.issuedPolicyNumber || formData.policyNumber || 'N/A',
            salesPersonName: l.assignee?.fullName || 'Direct',
            issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
            compiledPdfUrl: sub.compiledPdfUrl || null,
          };
        });
      }
    }

    if (exportRows.length === 0) {
      Alert.alert('No Data', 'No policies found to export.');
      return;
    }

    setExportingCSV(true);
    try {
      const headers = [
        'SR NO', 'REG NO', 'CAT', 'MOBILE NO 1', 'MOBILE NO 2', 'NAME', 'MODEL',
        'GVW', 'EXP DATE', 'COMPANY', 'TP/FULL/SAOD', 'VIA', 'NET PREMIUM',
        'TOTAL PREMIUM', 'RS FROM CUSTOMER (PAID)', 'PENDING DUE', 'POLICY NUMBER',
        'SALES EXECUTIVE', 'ISSUED POLICY PDF', 'MERGED 7-DOC PDF'
      ];

      const rows = exportRows.map((r, idx) => [
        idx + 1,
        `"${r.vehicleNo || ''}"`,
        `"${r.category || ''}"`,
        `"${r.clientPhone || ''}"`,
        `"${r.mobileNo2 || ''}"`,
        `"${r.clientName || ''}"`,
        `"${r.model || ''}"`,
        `"${r.gvw || ''}"`,
        `"${r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-IN') : ''}"`,
        `"${r.provider || ''}"`,
        `"${r.type || ''}"`,
        `"${r.via || 'Direct'}"`,
        r.netPremium || 0,
        r.totalPremium || 0,
        r.paidAmount || 0,
        r.pendingAmount || 0,
        `"${r.policyNumber || ''}"`,
        `"${r.salesPersonName || ''}"`,
        `"${r.issuedPolicyPdfUrl || ''}"`,
        `"${r.compiledPdfUrl || ''}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const filename = `Renewals_Master_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Download Renewals Master Sheet' });
      } else {
        Alert.alert('Exported', `File saved to ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export sheet');
    } finally {
      setExportingCSV(false);
    }
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) return { label: `${Math.abs(days)}d OVERDUE`, bg: '#FEE2E2', text: '#DC2626' };
    if (days === 0) return { label: 'EXPIRES TODAY', bg: '#FEF3C7', text: '#D97706' };
    if (days <= 30) return { label: `${days}d LEFT`, bg: '#FEF3C7', text: '#D97706' };
    return { label: `${days}d LEFT`, bg: '#DCFCE7', text: '#16A34A' };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Renewals</Text>
          <Text style={styles.subTitle}>1-Year Expiry & Re-issuance Pipeline</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleExportCSV}
            style={styles.csvExportBtn}
            disabled={exportingCSV}
          >
            {exportingCSV ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={15} color="#0284C7" />
                <Text style={styles.csvExportBtnText}>CSV</Text>
              </>
            )}
          </Pressable>

          {isManagerOrAdmin && (
            <Pressable
              onPress={handleDownloadMonthlyMasterSheet}
              style={styles.excelBtn}
              disabled={downloadingSheet}
            >
              {downloadingSheet ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color={Colors.primary} />
                  <Text style={styles.excelBtnText}>Excel</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{summary.totalRenewals ?? items.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
          <Text style={[styles.summaryNum, { color: '#DC2626' }]}>{summary.overdueCount ?? 0}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
          <Text style={[styles.summaryNum, { color: '#D97706' }]}>{summary.expiring30Days ?? 0}</Text>
          <Text style={styles.summaryLabel}>30 Days</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
          <Text style={[styles.summaryNum, { color: '#16A34A' }]}>{summary.renewedCount ?? 0}</Text>
          <Text style={styles.summaryLabel}>Renewed</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle, client, phone, policy no..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Urgency & Company Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {URGENCY_TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.urgencyTab, urgency === tab.key && styles.urgencyTabActive]}
            onPress={() => setUrgency(tab.key)}
          >
            <Text style={[styles.urgencyTabText, urgency === tab.key && styles.urgencyTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}

        <View style={styles.filterDivider} />

        {MASTER_COMPANIES.slice(0, 8).map(co => (
          <Pressable
            key={co}
            style={[styles.urgencyTab, companyFilter === co && styles.tabActiveCo]}
            onPress={() => setCompanyFilter(co)}
          >
            <Text style={[styles.urgencyTabText, companyFilter === co && styles.urgencyTabTextActive]}>
              {co}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Renewals FlatList */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading renewals pipeline...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100, gap: Spacing.md }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="refresh-circle-outline" size={56} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No Renewals Found</Text>
              <Text style={styles.emptySubtitle}>All issued policies with expiry dates automatically populate here for sales re-engagement.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const urgencyBadge = getUrgencyBadge(item.daysRemaining);
            const expFormatted = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : 'N/A';

            return (
              <View style={styles.renewalCard}>
                
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.srNoText}>#{index + 1}</Text>
                      <Text style={styles.clientName}>{item.clientName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View style={styles.vehBadge}>
                        <Text style={styles.vehBadgeText}>{item.vehicleNo}</Text>
                      </View>
                      {item.category !== 'N/A' && (
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.urgencyBadge, { backgroundColor: urgencyBadge.bg }]}>
                    <Text style={[styles.urgencyBadgeText, { color: urgencyBadge.text }]}>
                      {urgencyBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Policy Specs Row */}
                <View style={styles.specsRow}>
                  <View style={styles.specCol}>
                    <Text style={styles.specLabel}>POLICY NO</Text>
                    <Text style={styles.specVal} numberOfLines={1}>{item.policyNumber}</Text>
                  </View>
                  <View style={styles.specCol}>
                    <Text style={styles.specLabel}>COMPANY</Text>
                    <Text style={styles.specVal}>{item.provider}</Text>
                  </View>
                  <View style={styles.specCol}>
                    <Text style={styles.specLabel}>EXPIRY DATE</Text>
                    <Text style={[styles.specVal, { color: item.daysRemaining < 0 ? '#DC2626' : Colors.text }]}>
                      {expFormatted}
                    </Text>
                  </View>
                </View>

                {/* Finance Row */}
                <View style={styles.financeRow}>
                  <View style={styles.financeTile}>
                    <Text style={styles.financeLabel}>Total Premium</Text>
                    <Text style={styles.financeVal}>₹{Number(item.totalPremium || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.financeTile}>
                    <Text style={styles.financeLabel}>Amount Paid</Text>
                    <Text style={[styles.financeVal, { color: '#059669' }]}>₹{Number(item.paidAmount || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.financeTile}>
                    <Text style={styles.financeLabel}>Pending Due</Text>
                    <Text style={[styles.financeVal, { color: item.pendingAmount > 0 ? '#DC2626' : '#059669' }]}>
                      {item.pendingAmount > 0 ? `₹${Number(item.pendingAmount).toLocaleString('en-IN')}` : 'Nil ✓'}
                    </Text>
                  </View>
                </View>

                {/* Document Previews */}
                <View style={styles.docButtonsRow}>
                  {item.issuedPolicyPdfUrl && (
                    <Pressable
                      style={styles.pdfBtn}
                      onPress={() => previewPdf(item.issuedPolicyPdfUrl)}
                    >
                      <Ionicons name="document-text" size={14} color="#FFFFFF" />
                      <Text style={styles.pdfBtnText}>Company Policy PDF</Text>
                    </Pressable>
                  )}
                  {item.compiledPdfUrl && (
                    <Pressable
                      style={styles.mergedDocBtn}
                      onPress={() => previewPdf(item.compiledPdfUrl)}
                    >
                      <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                      <Text style={styles.mergedDocBtnText}>7-Doc Bundle</Text>
                    </Pressable>
                  )}
                </View>

                {/* Action Toolbar */}
                <View style={styles.actionToolbar}>
                  <Pressable
                    style={styles.actionBtnCall}
                    onPress={() => handleCall(item.clientPhone)}
                  >
                    <Ionicons name="call" size={15} color="#0284C7" />
                    <Text style={styles.actionBtnCallText}>Call</Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionBtnWa}
                    onPress={() => handleWhatsApp(item)}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
                    <Text style={styles.actionBtnWaText}>WhatsApp</Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionBtnParticulars}
                    onPress={() => setSelectedRenewal(item)}
                  >
                    <Ionicons name="list" size={15} color="#475569" />
                    <Text style={styles.actionBtnParticularsText}>25 Fields</Text>
                  </Pressable>

                  <Pressable
                    style={styles.actionBtnLead}
                    onPress={() => router.push(`/(protected)/lead/${item.leadId}` as any)}
                  >
                    <Ionicons name="person" size={15} color={Colors.primary} />
                    <Text style={styles.actionBtnLeadText}>Lead</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* ── 25 FIELDS & KYC PARTICULAR MODAL ── */}
      {/* ========================================================================= */}
      {selectedRenewal && (
        <Modal
          visible={!!selectedRenewal}
          animationType="slide"
          onRequestClose={() => setSelectedRenewal(null)}
        >
          <SafeAreaView style={styles.modalSafe} edges={['top']}>
            <View style={styles.modalHeaderDark}>
              <Pressable onPress={() => setSelectedRenewal(null)} style={styles.closeBtnDark}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleDark}>Renewal 25 Particulars</Text>
                <Text style={styles.modalSubDark} numberOfLines={1}>
                  {selectedRenewal.clientName} • {selectedRenewal.vehicleNo}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80, gap: Spacing.md }}>
              
              {/* VEHICLE & CUSTOMER */}
              <View style={styles.particularsCard}>
                <Text style={styles.particularsCardTitle}>Vehicle & Registration</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Reg No" value={selectedRenewal.vehicleNo} highlight />
                  <DetailItem label="Category" value={selectedRenewal.category} />
                  <DetailItem label="Model" value={selectedRenewal.model} />
                  <DetailItem label="GVW / Weight" value={selectedRenewal.gvw} />
                  <DetailItem label="HP (Hypothecation)" value={selectedRenewal.hpDetails} />
                  <DetailItem label="Body Type Matched" value={selectedRenewal.formData?.bodyTypeMatched || 'Matched'} />
                </View>
              </View>

              {/* COMMERCIALS & RATES */}
              <View style={styles.particularsCard}>
                <Text style={styles.particularsCardTitle}>Commercials & Rates</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Policy Number" value={selectedRenewal.policyNumber} highlight />
                  <DetailItem label="Insurance Company" value={selectedRenewal.provider} highlight />
                  <DetailItem label="Policy Type" value={selectedRenewal.type} />
                  <DetailItem label="Total Premium" value={`₹${Number(selectedRenewal.totalPremium || 0).toLocaleString('en-IN')}`} highlight />
                  <DetailItem label="Net Premium" value={`₹${Number(selectedRenewal.netPremium || 0).toLocaleString('en-IN')}`} />
                  <DetailItem label="Rs from Customer" value={`₹${Number(selectedRenewal.paidAmount || 0).toLocaleString('en-IN')}`} />
                  <DetailItem label="Pending Due" value={selectedRenewal.pendingAmount > 0 ? `₹${selectedRenewal.pendingAmount}` : 'Nil'} />
                  <DetailItem label="Payment Mode" value={selectedRenewal.paymentMode} />
                  <DetailItem label="Expiry Date" value={selectedRenewal.expiryDate ? new Date(selectedRenewal.expiryDate).toLocaleDateString('en-IN') : 'N/A'} highlight />
                  <DetailItem label="VIA Channel" value={selectedRenewal.via} />
                </View>
              </View>

              {/* CONTACTS & TEAM */}
              <View style={styles.particularsCard}>
                <Text style={styles.particularsCardTitle}>Contacts & Verifications</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Primary Mobile" value={selectedRenewal.clientPhone} />
                  <DetailItem label="Secondary Mobile" value={selectedRenewal.mobileNo2 || 'N/A'} />
                  <DetailItem label="NCB" value={selectedRenewal.ncb} />
                  <DetailItem label="NCB Confirmation SS" value={selectedRenewal.formData?.ncbConfirmation || 'N/A'} />
                  <DetailItem label="IMP Date Msg SS" value={selectedRenewal.formData?.impDateMsgSS || 'N/A'} />
                  <DetailItem label="Rate Confirmation SS" value={selectedRenewal.formData?.rateConfirmationSS || 'N/A'} />
                  <DetailItem label="Inspection Status" value={selectedRenewal.formData?.inspectionStatus || 'Done / N.A.'} />
                  <DetailItem label="Sales Person" value={selectedRenewal.salesPersonName} />
                </View>
              </View>

              {/* ATTACHED DOCUMENTS */}
              <View style={styles.particularsCard}>
                <Text style={styles.particularsCardTitle}>Documents</Text>
                {selectedRenewal.issuedPolicyPdfUrl && (
                  <Pressable
                    style={styles.modalDocBtn}
                    onPress={() => previewPdf(selectedRenewal.issuedPolicyPdfUrl)}
                  >
                    <Ionicons name="document-text" size={18} color="#FFFFFF" />
                    <Text style={styles.modalDocBtnText}>Open Company Issued Policy PDF</Text>
                  </Pressable>
                )}
                {selectedRenewal.compiledPdfUrl && (
                  <Pressable
                    style={[styles.modalDocBtn, { backgroundColor: '#0284C7', marginTop: 8 }]}
                    onPress={() => previewPdf(selectedRenewal.compiledPdfUrl)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalDocBtnText}>Open Merged 7-Document Bundle PDF</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function DetailItem({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  menuBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  subTitle: { fontSize: 10, color: Colors.textMuted, marginTop: 1, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  csvExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  csvExportBtnText: { fontSize: 11, fontWeight: '800', color: '#0284C7' },
  excelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  excelBtnText: { fontSize: 11, fontWeight: '800', color: Colors.primary },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryNum: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.text },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },

  filterScroll: { maxHeight: 46, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Colors.border, marginTop: 6 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center', paddingVertical: 6 },
  filterDivider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 4 },
  urgencyTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  urgencyTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabActiveCo: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  urgencyTabText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  urgencyTabTextActive: { color: '#FFFFFF' },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },

  renewalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  srNoText: { fontSize: 11, fontWeight: '800', color: Colors.textMuted },
  clientName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  vehBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  vehBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  catBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyBadgeText: { fontSize: 10, fontWeight: '800' },

  specsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    padding: 8,
  },
  specCol: { flex: 1 },
  specLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  specVal: { fontSize: 11, fontWeight: '800', color: Colors.text, marginTop: 2 },

  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  financeTile: { alignItems: 'center', flex: 1 },
  financeLabel: { fontSize: 9, fontWeight: '700', color: '#047857' },
  financeVal: { fontSize: 12, fontWeight: '900', color: '#065F46', marginTop: 1 },

  docButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  pdfBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  mergedDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  mergedDocBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  actionToolbar: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  actionBtnCallText: { fontSize: 11, fontWeight: '800', color: '#0284C7' },
  actionBtnWa: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  actionBtnWaText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  actionBtnParticulars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  actionBtnParticularsText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  actionBtnLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: Colors.primary + '12',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  actionBtnLeadText: { fontSize: 11, fontWeight: '800', color: Colors.primary },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm, paddingHorizontal: 30 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // Particulars Modal
  modalSafe: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  closeBtnDark: { padding: Spacing.xs },
  modalTitleDark: { color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: '800' },
  modalSubDark: { color: '#94A3B8', fontSize: FontSize.xs, marginTop: 1 },
  modalScroll: { flex: 1 },

  particularsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  particularsCardTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '47%' },
  detailLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: 1 },
  detailHighlight: { fontWeight: '800', color: Colors.primary },

  modalDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalDocBtnText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' },
});
