import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert, Linking, Platform, Switch
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { saveFileToDevice } from '../../src/utils/fileSaver';
import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius, StatusColors } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCacheStore } from '../../src/store/cacheStore';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import DatePickerSelector from '../../src/components/DatePickerSelector';

export const MASTER_COMPANIES = [
  'ALL',
  'CHOLA',
  'SHRIRAM',
  'SBI',
  'DIGIT',
  'TATA AIG',
  'RELIANCE',
  'ICICI LOMBARD',
  'ZUNO',
  'IFFCO TOKIO',
  'MAGMA',
  'ZURICH KOTAK',
  'FUTURE GENERALI',
  'ROYAL SUNDARAM',
  'HDFC ERGO',
  'BAJAJ ALLIANZ',
  'UNITED INDIA',
  'NEW INDIA ASSURANCE',
  'NATIONAL INSURANCE',
  'ORIENTAL INSURANCE',
  'OTHER'
];

export const MASTER_CATEGORIES = [
  'ALL',
  'HGV',
  '3WPCV',
  '3W GCV',
  'LMV',
  'LCV',
  'TAXI',
  '2W',
  'BUS',
  'OTHER'
];

export default function PoliciesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');
  const isSalesPerson = !isManagerOrAdmin;

  const { cache, setCache, loadCache } = useCacheStore();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);

  // Detail Modal State
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Add Policy Form State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    policy_number: '',
    provider: 'DIGIT',
    type: 'Comprehensive',
    premium_amount: '',
    status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    lead_id: ''
  });

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await api.get<any>('/leads?limit=100');
      const leadsArr = Array.isArray(res) ? res : res.leads || res.items || [];
      setLeads(leadsArr);
      setCache('/leads', { items: leadsArr });
    } catch (err) {
      console.error('Error fetching leads in Policies:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      fetchLeads();
    }
  }, [addModalVisible]);

  useEffect(() => {
    loadCache().then(() => {
      const cachedPolicies = cache['/policies'];
      if (cachedPolicies && cachedPolicies.items) {
        setItems(cachedPolicies.items);
        setTotal(cachedPolicies.items.length);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      let policiesArr: any[] = [];

      try {
        const pData = await api.get<any[]>(`/policies${statusParam}`);
        if (Array.isArray(pData)) policiesArr = pData;
      } catch (apiErr) {
        console.warn('[Policies API error, falling back to Supabase DB]', apiErr);
      }

      // Supabase direct fallback with full lead details & customFields
      if (policiesArr.length === 0) {
        let query = supabase
          .from('policies')
          .select('id, policyNumber, provider, type, premiumAmount, status, startDate, endDate, createdAt, lead:leads(id, clientName, clientPhone, clientEmail, vehicleNo, customFields, assignee:assignedTo(fullName))')
          .order('createdAt', { ascending: false })
          .limit(200);

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data: dbPolicies } = await query;
        if (dbPolicies) {
          policiesArr = dbPolicies.map((p: any) => {
            const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {};
            const sub = cf.policySubmission || {};
            const formData = sub.formData || {};
            const isVisibleToSales = sub.visibleToSalesPerson !== undefined ? sub.visibleToSalesPerson : true;

            return {
              ...p,
              leadId: p.lead?.id,
              clientName: p.lead?.clientName || 'Direct Policy',
              clientPhone: p.lead?.clientPhone || formData.mobileNo1 || '',
              clientEmail: p.lead?.clientEmail || '',
              vehicleNo: p.lead?.vehicleNo || formData.regNo || 'N/A',
              category: formData.customerCategory || formData.cat || 'N/A',
              model: formData.model || 'N/A',
              gvw: formData.gvw || 'N/A',
              salesPersonName: p.lead?.assignee?.fullName || 'Direct',
              compiledPdfUrl: sub.compiledPdfUrl || null,
              issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
              documents: sub.documents || [],
              formData,
              visibleToSalesPerson: isVisibleToSales,
              paidAmount: parseFloat(formData.paidAmount || formData.rsFromCustomer || '0') || 0,
              pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
              paymentMode: formData.paymentMode || 'Cash',
              hpDetails: formData.hpDetails || 'N/A',
              ncb: formData.ncb || 'N/A',
            };
          });
        }
      } else {
        // Hydrate API items with customFields if available
        policiesArr = policiesArr.map((p: any) => {
          const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {};
          const sub = cf.policySubmission || {};
          const formData = sub.formData || {};
          const isVisibleToSales = sub.visibleToSalesPerson !== undefined ? sub.visibleToSalesPerson : true;

          return {
            ...p,
            leadId: p.lead?.id || p.leadId,
            clientName: p.lead?.clientName || p.clientName || 'Direct Policy',
            clientPhone: p.lead?.clientPhone || formData.mobileNo1 || '',
            vehicleNo: p.lead?.vehicleNo || formData.regNo || 'N/A',
            category: formData.customerCategory || formData.cat || 'N/A',
            model: formData.model || 'N/A',
            gvw: formData.gvw || 'N/A',
            salesPersonName: p.lead?.assignee?.fullName || p.salesPersonName || 'Direct',
            compiledPdfUrl: sub.compiledPdfUrl || p.compiledPdfUrl || null,
            issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || p.issuedPolicyPdfUrl || null,
            documents: sub.documents || [],
            formData,
            visibleToSalesPerson: isVisibleToSales,
            paidAmount: parseFloat(formData.paidAmount || formData.rsFromCustomer || '0') || 0,
            pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
            paymentMode: formData.paymentMode || 'Cash',
            hpDetails: formData.hpDetails || 'N/A',
            ncb: formData.ncb || 'N/A',
          };
        });
      }

      setItems(policiesArr);
      setTotal(policiesArr.length);
      setCache('/policies', { items: policiesArr });
    } catch (e) {
      console.error('[PoliciesScreen] Failed to load policies data', e);
    }
  }, [filter, setCache]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const previewPdf = async (url: string) => {
    if (!url) {
      Alert.alert('No Document', 'Document file is not attached yet.');
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

  const handleToggleSalesVisibility = async (policy: any) => {
    if (!policy?.leadId) return;
    const nextVal = !policy.visibleToSalesPerson;
    setTogglingVisibility(true);
    try {
      // 1. Call Backend
      try {
        await api.post('/manager/submissions', {
          leadId: policy.leadId,
          action: 'TOGGLE_VISIBILITY',
          visibleToSalesPerson: nextVal
        });
      } catch {}

      // 2. Direct Supabase DB update
      const { data: dbLead } = await supabase
        .from('leads')
        .select('customFields')
        .eq('id', policy.leadId)
        .single();

      const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
      const sub = cf.policySubmission || {};

      await supabase
        .from('leads')
        .update({
          customFields: {
            ...cf,
            policySubmission: {
              ...sub,
              visibleToSalesPerson: nextVal,
              updatedAt: new Date().toISOString()
            }
          }
        })
        .eq('id', policy.leadId);

      // 3. Update local state
      setItems(prev => prev.map(item => item.id === policy.id ? { ...item, visibleToSalesPerson: nextVal } : item));
      if (selectedPolicy && selectedPolicy.id === policy.id) {
        setSelectedPolicy((prev: any) => ({ ...prev, visibleToSalesPerson: nextVal }));
      }

      Alert.alert(
        'Visibility Updated',
        nextVal ? 'Sales person can now see the issued policy & documents.' : 'Issued policy is now hidden from the sales person.'
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update visibility setting.');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleDownloadMonthlySheet = async () => {
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
            const fileUri = FileSystem.documentDirectory + (res.fileName || 'master_policies.xlsx');
            const download = await FileSystem.downloadAsync(res.sheetUrl, fileUri);
            if (download.uri) {
              const filename = res.fileName || 'master_policies.xlsx';
              await saveFileToDevice(download.uri, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              downloaded = true;
            }
          }
        }
      } catch (serverErr) {
        console.warn('[Server monthly sheet download error, falling back to local generator]', serverErr);
      }

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
    let exportRows = filteredItems.length > 0 ? filteredItems : items;
    if (exportRows.length === 0) {
      // Direct Supabase fallback
      const { data: dbPolicies } = await supabase
        .from('policies')
        .select('id, policyNumber, provider, type, premiumAmount, status, startDate, endDate, lead:leads(clientName, clientPhone, vehicleNo, customFields, assignee:assignedTo(fullName))')
        .limit(100);

      if (dbPolicies && dbPolicies.length > 0) {
        exportRows = dbPolicies.map((p: any) => {
          const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {};
          const sub = cf.policySubmission || {};
          const formData = sub.formData || {};
          return {
            policyNumber: p.policyNumber || 'N/A',
            provider: p.provider || 'Torque',
            category: formData.customerCategory || formData.cat || 'N/A',
            vehicleNo: p.lead?.vehicleNo || 'N/A',
            model: formData.model || 'N/A',
            clientName: p.lead?.clientName || 'Customer',
            clientPhone: p.lead?.clientPhone || formData.mobileNo1 || '',
            mobileNo2: formData.mobileNo2 || '',
            gvw: formData.gvw || 'N/A',
            type: p.type || 'Comprehensive',
            startDate: p.startDate,
            endDate: p.endDate,
            netPremium: parseFloat(formData.netPremium || '0') || p.premiumAmount || 0,
            premiumAmount: p.premiumAmount || 0,
            paidAmount: parseFloat(formData.paidAmount || formData.rsFromCustomer || '0') || p.premiumAmount || 0,
            pendingAmount: parseFloat(formData.pendingAmount || '0') || 0,
            paymentMode: formData.paymentMode || 'Cash',
            salesPersonName: p.lead?.assignee?.fullName || 'Direct',
            issuedPolicyPdfUrl: sub.issuedPolicyPdfUrl || null,
            compiledPdfUrl: sub.compiledPdfUrl || null,
            formData,
          };
        });
      }
    }

    if (exportRows.length === 0) {
      Alert.alert('No Data', 'No policies found to export.');
      return;
    }

    try {
      const headers = [
        'SR NO', 'POLICY NO', 'COMPANY', 'CATEGORY', 'REG NO', 'MODEL',
        'CLIENT NAME', 'MOBILE 1', 'MOBILE 2', 'GVW', 'POLICY TYPE',
        'START DATE', 'EXPIRY DATE', 'NET PREMIUM', 'TOTAL PREMIUM',
        'PAID AMOUNT', 'PENDING DUE', 'PAYMENT MODE', 'SALES PERSON',
        'ISSUED POLICY PDF', 'MERGED DOC PDF'
      ];

      const rows = filteredItems.map((p, idx) => [
        idx + 1,
        `"${p.policyNumber || ''}"`,
        `"${p.provider || ''}"`,
        `"${p.category || ''}"`,
        `"${p.vehicleNo || ''}"`,
        `"${p.model || ''}"`,
        `"${p.clientName || ''}"`,
        `"${p.clientPhone || ''}"`,
        `"${p.formData?.mobileNo2 || ''}"`,
        `"${p.gvw || ''}"`,
        `"${p.type || ''}"`,
        `"${p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : ''}"`,
        `"${p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : ''}"`,
        p.formData?.netPremium || p.premiumAmount || 0,
        p.premiumAmount || 0,
        p.paidAmount || 0,
        p.pendingAmount || 0,
        `"${p.paymentMode || ''}"`,
        `"${p.salesPersonName || ''}"`,
        `"${p.issuedPolicyPdfUrl || ''}"`,
        `"${p.compiledPdfUrl || ''}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const filename = `Policies_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      await saveFileToDevice(fileUri, filename, 'text/csv');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export CSV');
    }
  };

  const handleAddPolicy = async () => {
    if (!newPolicy.policy_number.trim() || !newPolicy.provider.trim() || !newPolicy.type.trim() || !newPolicy.premium_amount || !newPolicy.start_date || !newPolicy.end_date || !newPolicy.lead_id) {
      Alert.alert('Error', 'All fields marked with * are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/policies', {
        policy_number: newPolicy.policy_number.trim(),
        provider: newPolicy.provider.trim(),
        type: newPolicy.type.trim(),
        premium_amount: parseFloat(newPolicy.premium_amount),
        status: newPolicy.status,
        start_date: new Date(newPolicy.start_date).toISOString(),
        end_date: new Date(newPolicy.end_date).toISOString(),
        lead_id: newPolicy.lead_id || null
      });
      setAddModalVisible(false);
      setNewPolicy({ policy_number: '', provider: 'DIGIT', type: 'Comprehensive', premium_amount: '', status: 'Active', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0], lead_id: '' });
      Alert.alert('Success', 'Policy registered successfully!');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register policy');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    // If sales person, check visibility flag
    if (isSalesPerson && item.visibleToSalesPerson === false) {
      return false;
    }

    if (companyFilter !== 'ALL' && !item.provider?.toUpperCase().includes(companyFilter)) {
      return false;
    }
    if (catFilter !== 'ALL' && !item.category?.toUpperCase().includes(catFilter)) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.policyNumber?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q) ||
      item.vehicleNo?.toLowerCase().includes(q) ||
      item.clientPhone?.includes(q) ||
      item.provider?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Policies</Text>
          <Text style={styles.subTitle}>{filteredItems.length} {filteredItems.length === 1 ? 'policy' : 'policies'} recorded</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={handleExportCSV} style={styles.csvBtn}>
            <Ionicons name="document-text-outline" size={15} color="#0284C7" />
            <Text style={styles.csvBtnText}>CSV</Text>
          </Pressable>
          {isManagerOrAdmin && (
            <Pressable
              onPress={handleDownloadMonthlySheet}
              style={styles.downloadSheetBtn}
              disabled={downloadingSheet}
            >
              {downloadingSheet ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={15} color={Colors.primary} />
                  <Text style={styles.downloadSheetText}>Master</Text>
                </>
              )}
            </Pressable>
          )}
          {isManagerOrAdmin && (
            <Pressable style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInputField}
          placeholder="Search by policy no, vehicle, client, phone..."
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

      {/* Filter Row: Company Dropdown & Status Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {['all', 'Active', 'Expired', 'Lapsed'].map(s => (
          <Pressable key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}

        <View style={styles.filterDivider} />

        {MASTER_COMPANIES.slice(0, 8).map(co => (
          <Pressable
            key={co}
            style={[styles.chip, companyFilter === co && styles.chipActiveCo]}
            onPress={() => setCompanyFilter(co)}
          >
            <Text style={[styles.chipText, companyFilter === co && styles.chipTextActive]}>{co}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Policies List */}
      <FlatList 
        data={filteredItems} 
        keyExtractor={i => i.id} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100, gap: Spacing.md }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No policies found</Text>
            <Text style={styles.emptySubtitle}>When managers upload issued policies, they appear here in complete detail.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = StatusColors[item.status] || StatusColors.active || StatusColors.pending;
          const pdfUrl = item.issuedPolicyPdfUrl || item.compiledPdfUrl;
          const expDateFormatted = item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN') : 'N/A';

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              onPress={() => setSelectedPolicy(item)}
            >
              {/* Card Top */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.clientName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={styles.vehPill}>
                      <Text style={styles.vehPillText}>{item.vehicleNo}</Text>
                    </View>
                    {item.category !== 'N/A' && (
                      <View style={styles.catPill}>
                        <Text style={styles.catPillText}>{item.category}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>
                    #{item.policyNumber} · {item.provider} · {item.type}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
                  </View>
                  {isManagerOrAdmin && (
                    <View style={[styles.visibilityBadge, item.visibleToSalesPerson ? styles.visOn : styles.visOff]}>
                      <Ionicons name={item.visibleToSalesPerson ? "eye" : "eye-off"} size={10} color={item.visibleToSalesPerson ? "#047857" : "#B91C1C"} />
                      <Text style={[styles.visibilityBadgeText, item.visibleToSalesPerson ? styles.visOnText : styles.visOffText]}>
                        {item.visibleToSalesPerson ? 'Sales: Visible' : 'Sales: Hidden'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Commercials Summary */}
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.policyLabel}>Premium</Text>
                  <Text style={styles.policyValue}>₹{Number(item.premiumAmount || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View>
                  <Text style={styles.policyLabel}>Paid / Due</Text>
                  <Text style={[styles.policyValue, { color: item.pendingAmount > 0 ? '#E11D48' : '#059669' }]}>
                    ₹{Number(item.paidAmount || 0).toLocaleString('en-IN')} {item.pendingAmount > 0 ? `(₹${item.pendingAmount} due)` : '✓'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.policyLabel}>Expiry Date</Text>
                  <Text style={styles.policyValue}>{expDateFormatted}</Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionRow}>
                {pdfUrl ? (
                  <Pressable
                    style={styles.cardPdfBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      previewPdf(pdfUrl);
                    }}
                  >
                    <Ionicons name="document-text" size={14} color="#FFFFFF" />
                    <Text style={styles.cardPdfBtnText}>Company Policy PDF</Text>
                  </Pressable>
                ) : (
                  <View style={styles.cardNoPdf}>
                    <Text style={styles.cardNoPdfText}>No PDF Attached</Text>
                  </View>
                )}

                {item.compiledPdfUrl && (
                  <Pressable
                    style={styles.cardDocBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      previewPdf(item.compiledPdfUrl);
                    }}
                  >
                    <Ionicons name="attach" size={14} color={Colors.primary} />
                    <Text style={styles.cardDocBtnText}>7-Doc Bundle</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.detailsBtn}
                  onPress={() => setSelectedPolicy(item)}
                >
                  <Text style={styles.detailsBtnText}>All 25 Fields</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ========================================================================= */}
      {/* ── POLICY DETAIL & SALES VISIBILITY MODAL ── */}
      {/* ========================================================================= */}
      {selectedPolicy && (
        <Modal
          visible={!!selectedPolicy}
          animationType="slide"
          onRequestClose={() => setSelectedPolicy(null)}
        >
          <SafeAreaView style={styles.modalSafe} edges={['top']}>
            <View style={styles.modalHeaderDark}>
              <Pressable onPress={() => setSelectedPolicy(null)} style={styles.closeBtnDark}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleDark}>Policy Particulars</Text>
                <Text style={styles.modalSubDark} numberOfLines={1}>
                  {selectedPolicy.clientName} • #{selectedPolicy.policyNumber}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{selectedPolicy.status}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80, gap: Spacing.md }}>
              
              {/* MANAGER CONTROL: SALES PERSON VISIBILITY TOGGLE */}
              {isManagerOrAdmin && (
                <View style={styles.managerControlCard}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                      <Text style={styles.managerControlTitle}>Sales Person Access</Text>
                    </View>
                    <Text style={styles.managerControlDesc}>
                      {selectedPolicy.visibleToSalesPerson
                        ? 'Sales Person CAN see this issued policy and download attached documents.'
                        : 'RESTRICTED: Sales Person CANNOT see or download this policy.'}
                    </Text>
                  </View>
                  <Switch
                    value={selectedPolicy.visibleToSalesPerson !== false}
                    onValueChange={() => handleToggleSalesVisibility(selectedPolicy)}
                    disabled={togglingVisibility}
                    trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}

              {/* 1. VEHICLE & CUSTOMER DETAILS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Vehicle & Registration</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Registration No" value={selectedPolicy.vehicleNo} highlight />
                  <DetailItem label="Category" value={selectedPolicy.category} />
                  <DetailItem label="Model" value={selectedPolicy.model} />
                  <DetailItem label="GVW / Weight" value={selectedPolicy.gvw} />
                  <DetailItem label="Hypothecation (HP)" value={selectedPolicy.hpDetails} />
                  <DetailItem label="Body Type" value={selectedPolicy.formData?.bodyTypeMatched || 'Matched'} />
                </View>
              </View>

              {/* 2. POLICY & COMMERCIAL PARTICULARS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Policy & Financial Details</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Policy Number" value={selectedPolicy.policyNumber} highlight />
                  <DetailItem label="Insurance Company" value={selectedPolicy.provider} highlight />
                  <DetailItem label="Policy Type" value={selectedPolicy.type} />
                  <DetailItem label="NCB" value={selectedPolicy.ncb} />
                  <DetailItem label="Total Premium" value={`₹${Number(selectedPolicy.premiumAmount || 0).toLocaleString('en-IN')}`} highlight />
                  <DetailItem label="Rs Paid by Client" value={`₹${Number(selectedPolicy.paidAmount || 0).toLocaleString('en-IN')}`} />
                  <DetailItem label="Pending Due" value={selectedPolicy.pendingAmount > 0 ? `₹${selectedPolicy.pendingAmount}` : 'Nil (Paid)'} />
                  <DetailItem label="Payment Mode" value={selectedPolicy.paymentMode} />
                  <DetailItem label="Start Date" value={selectedPolicy.startDate ? new Date(selectedPolicy.startDate).toLocaleDateString('en-IN') : 'N/A'} />
                  <DetailItem label="Expiry Date" value={selectedPolicy.endDate ? new Date(selectedPolicy.endDate).toLocaleDateString('en-IN') : 'N/A'} highlight />
                </View>
              </View>

              {/* 3. CONTACT & SALES EXECUTIVE */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Customer & Team</Text>
                <View style={styles.detailGrid}>
                  <DetailItem label="Client Name" value={selectedPolicy.clientName} />
                  <DetailItem label="Primary Mobile" value={selectedPolicy.clientPhone} />
                  <DetailItem label="Secondary Mobile" value={selectedPolicy.formData?.mobileNo2 || 'N/A'} />
                  <DetailItem label="Sales Executive" value={selectedPolicy.salesPersonName} />
                </View>
              </View>

              {/* 4. ATTACHED PDF DOCUMENTS */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>Attached Policy Documents</Text>

                {selectedPolicy.issuedPolicyPdfUrl ? (
                  <Pressable
                    style={styles.bigDocBtn}
                    onPress={() => previewPdf(selectedPolicy.issuedPolicyPdfUrl)}
                  >
                    <Ionicons name="document-text" size={20} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigDocBtnTitle}>Company Issued Policy PDF</Text>
                      <Text style={styles.bigDocBtnSub}>Official policy document issued by {selectedPolicy.provider}</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <View style={styles.noDocNotice}>
                    <Text style={styles.noDocNoticeText}>No company issued policy PDF attached.</Text>
                  </View>
                )}

                {selectedPolicy.compiledPdfUrl && (
                  <Pressable
                    style={[styles.bigDocBtn, { backgroundColor: '#0284C7', marginTop: 8 }]}
                    onPress={() => previewPdf(selectedPolicy.compiledPdfUrl)}
                  >
                    <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigDocBtnTitle}>Consolidated 7-Doc Bundle PDF</Text>
                      <Text style={styles.bigDocBtnSub}>Single merged PDF containing all client KYC & verification docs</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              {/* Special Remarks if any */}
              {selectedPolicy.formData?.description && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionBoxTitle}>Special Remarks</Text>
                  <Text style={styles.remarksText}>{selectedPolicy.formData.description}</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ── Add Policy Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Policy</Text>
              <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>POLICY NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. POL-98765432"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.policy_number}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, policy_number: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>INSURANCE COMPANY / PROVIDER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DIGIT, CHOLA, SBI, SHRIRAM"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.provider}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, provider: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>POLICY TYPE *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. FULL, TP, Comprehensive"
                  placeholderTextColor={Colors.textLight}
                  value={newPolicy.type}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, type: val })}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PREMIUM AMOUNT *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={newPolicy.premium_amount}
                  onChangeText={(val) => setNewPolicy({ ...newPolicy, premium_amount: val })}
                />
              </View>

              <DatePickerSelector
                label="Start Date *"
                value={newPolicy.start_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, start_date: val }))}
                placeholder="Select Start Date"
              />

              <DatePickerSelector
                label="End Date *"
                value={newPolicy.end_date}
                onChange={(val) => setNewPolicy(prev => ({ ...prev, end_date: val }))}
                placeholder="Select End Date"
              />

              <Pressable style={styles.submitBtn} onPress={handleAddPolicy} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Register Policy</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
    backgroundColor: '#FFFFFF'
  },
  menuBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text },
  subTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  csvBtn: {
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
  csvBtnText: { fontSize: 11, fontWeight: '800', color: '#0284C7' },
  downloadSheetBtn: {
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
  downloadSheetText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    gap: Spacing.sm,
  },
  searchInputField: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  filterScroll: { maxHeight: 46, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center', paddingVertical: 8 },
  filterDivider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F8FAFC' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipActiveCo: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  chipText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  chipTextActive: { color: Colors.white },

  // List Cards
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  vehPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  vehPillText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  catPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catPillText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visOn: { backgroundColor: '#DCFCE7' },
  visOff: { backgroundColor: '#FEE2E2' },
  visibilityBadgeText: { fontSize: 9, fontWeight: '800' },
  visOnText: { color: '#047857' },
  visOffText: { color: '#B91C1C' },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  policyLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  policyValue: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginTop: 1 },

  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#10B981',
  },
  cardPdfBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  cardDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cardDocBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  detailsBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  cardNoPdf: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
  },
  cardNoPdfText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.xs, paddingHorizontal: 30 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // Detail Modal
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

  managerControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  managerControlTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  managerControlDesc: { fontSize: 11, color: '#1E40AF', marginTop: 2, lineHeight: 15 },

  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionBoxTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '47%' },
  detailLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: 1 },
  detailHighlight: { fontWeight: '800', color: Colors.primary },

  bigDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bigDocBtnTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' },
  bigDocBtnSub: { color: '#DCFCE7', fontSize: 10, marginTop: 1 },
  noDocNotice: { padding: Spacing.sm, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.sm, alignItems: 'center' },
  noDocNoticeText: { fontSize: 11, color: Colors.textMuted },
  remarksText: { fontSize: FontSize.xs, color: Colors.text, lineHeight: 16 },

  // Add Policy Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: '80%', padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  closeBtn: { padding: Spacing.xs },
  modalBody: { flex: 1, marginTop: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, height: 50, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
