import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert, Platform, Share, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, BASE_URL } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import Sidebar from '../../src/components/Sidebar';
import AppFooter from '../../src/components/AppFooter';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface SpreadsheetFile {
  fileName: string;
  batchName: string;
  sizeBytes: number;
  importedAt?: string;
  updatedAt: string;
  dayOfWeek?: string;
  dateOnly?: string;
  totalRows: number;
  agentCount: number;
  headers: string[];
  downloadUrl: string;
}

interface SheetPreviewData {
  fileName: string;
  downloadUrl: string;
  headers: string[];
  rows: any[][];
  agentColIdx: number;
  agentRowsCount: number;
  totalRows?: number;
}

const MONTH_NAMES = [
  'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ImportedSheetsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || user?.email?.toLowerCase().includes('admin') || user?.permissions?.includes('leads.assign');

  useEffect(() => {
    if (user) {
      const r = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
      const isAdm = r === 'SUPER ADMIN' || r === 'ADMIN' || user?.email?.toLowerCase().includes('admin') || user?.permissions?.includes('leads.assign');
      if (!isAdm) {
        router.replace('/(protected)/dashboard');
      }
    }
  }, [user]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [files, setFiles] = useState<SpreadsheetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<'all' | 'has_agent'>('all');

  // Page active tab state
  const [activeTab, setActiveTab] = useState<'files' | 'renewals'>('files');
  const [expiryMonthFilter, setExpiryMonthFilter] = useState<number>(0);
  const [expiryYearFilter, setExpiryYearFilter] = useState<number>(new Date().getFullYear());

  // Preview modal state
  const [selectedFile, setSelectedFile] = useState<SpreadsheetFile | null>(null);
  const [previewData, setPreviewData] = useState<SheetPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewAgentOnly, setPreviewAgentOnly] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Pagination state for modal preview
  const [modalRows, setModalRows] = useState<any[][]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotalRows, setModalTotalRows] = useState(0);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalLoadingMore, setModalLoadingMore] = useState(false);
  const searchTimeoutRef = React.useRef<any>(null);

  // Monthly Executive Assignment States for Modal
  const [availableExecs, setAvailableExecs] = useState<any[]>([]);
  const [selectedExecIds, setSelectedExecIds] = useState<string[]>([]);
  const [execsLoading, setExecsLoading] = useState(false);
  const [execDropdownOpen, setExecDropdownOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<any>(null);

  const fetchFiles = useCallback(async (sync = false) => {
    try {
      setLoading(true);
      const url = sync ? '/import/sheets?sync=true' : '/import/sheets';
      const data = await api.get<any>(url);
      setFiles(data?.files || []);
    } catch (err: any) {
      console.warn('Failed to load spreadsheets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFiles();
    }, [fetchFiles])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFiles(true);
    setRefreshing(false);
  };

  // Auto-sync renewals master when switching tabs
  useEffect(() => {
    if (activeTab === 'renewals') {
      const renewalsFile = files.find(f => f.fileName === 'import_renewals.xlsx');
      if (renewalsFile) {
        handleOpenPreview(renewalsFile);
      }
    }
  }, [activeTab, files]);

  // Reset states when switching tabs
  useEffect(() => {
    if (activeTab === 'files') {
      setSelectedFile(null);
      setPreviewData(null);
    }
  }, [activeTab]);

  const handleOpenPreview = async (file: SpreadsheetFile) => {
    if (file.fileName !== 'import_renewals.xlsx') {
      setSelectedFile(file);
    }
    setPreviewLoading(true);
    setPreviewSearch('');
    setPreviewAgentOnly(false);
    setModalRows([]);
    setModalPage(1);
    setModalTotalRows(0);
    setModalTotalPages(1);
    setExpiryMonthFilter(0);
    setExpiryYearFilter(new Date().getFullYear());
    setAvailableExecs([]);
    setSelectedExecIds([]);
    setExecDropdownOpen(false);
    setAssignResult(null);
    try {
      // For non-renewal files on mobile, use paginated API
      if (file.fileName !== 'import_renewals.xlsx') {
        const res = await api.get<any>(`/import/sheets/${encodeURIComponent(file.fileName)}?page=1&limit=50`);
        setPreviewData({
          fileName: res.fileName,
          downloadUrl: res.downloadUrl,
          headers: res.headers || [],
          rows: [], // Don't store all rows in previewData for paginated mode
          agentColIdx: res.agentColIdx ?? -1,
          agentRowsCount: res.agentRowsCount ?? 0,
          totalRows: res.totalRows ?? 0,
        });
        setModalRows(res.rows || []);
        setModalPage(res.page || 1);
        setModalTotalRows(res.totalRows || 0);
        setModalTotalPages(res.totalPages || 1);
      } else {
        const res = await api.get<SheetPreviewData>(`/import/sheets/${encodeURIComponent(file.fileName)}`);
        setPreviewData(res);
        setModalRows(res.rows || []);
        setModalTotalRows(res.totalRows || res.rows?.length || 0);
        setModalTotalPages(1);
      }
    } catch (err: any) {
      Alert.alert('Preview Error', err.message || 'Failed to load spreadsheet details.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Load more rows (next page) for modal preview
  const loadMoreModalRows = useCallback(async () => {
    if (!selectedFile || modalLoadingMore || modalPage >= modalTotalPages) return;
    setModalLoadingMore(true);
    try {
      const nextPage = modalPage + 1;
      const searchQ = previewSearch.trim() ? `&search=${encodeURIComponent(previewSearch.trim())}` : '';
      const monthQ = expiryMonthFilter > 0 ? `&month=${expiryMonthFilter}&year=${expiryYearFilter}` : '';
      const res = await api.get<any>(
        `/import/sheets/${encodeURIComponent(selectedFile.fileName)}?page=${nextPage}&limit=50${searchQ}${monthQ}`
      );
      setModalRows(prev => [...prev, ...(res.rows || [])]);
      setModalPage(nextPage);
      setModalTotalPages(res.totalPages || 1);
      setModalTotalRows(res.totalRows || 0);
    } catch (err: any) {
      console.warn('Failed to load more rows:', err);
    } finally {
      setModalLoadingMore(false);
    }
  }, [selectedFile, modalPage, modalTotalPages, modalLoadingMore, previewSearch, expiryMonthFilter, expiryYearFilter]);

  // Debounced server-side search for modal
  const handleModalSearchChange = useCallback((text: string) => {
    setPreviewSearch(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!selectedFile || selectedFile.fileName === 'import_renewals.xlsx') return;
    searchTimeoutRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const searchQ = text.trim() ? `&search=${encodeURIComponent(text.trim())}` : '';
        const monthQ = expiryMonthFilter > 0 ? `&month=${expiryMonthFilter}&year=${expiryYearFilter}` : '';
        const res = await api.get<any>(
          `/import/sheets/${encodeURIComponent(selectedFile.fileName)}?page=1&limit=50${searchQ}${monthQ}`
        );
        setModalRows(res.rows || []);
        setModalPage(1);
        setModalTotalRows(res.totalRows || 0);
        setModalTotalPages(res.totalPages || 1);
      } catch (err: any) {
        console.warn('Server search failed:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
  }, [selectedFile, expiryMonthFilter, expiryYearFilter]);

  const fetchAvailableExecs = async (month: number, year: number) => {
    setExecsLoading(true);
    try {
      const res = await api.get<any>(`/leads/available-executives?month=${month}&year=${year}`);
      setAvailableExecs(res?.executives || []);
      const available = (res?.executives || []).filter((e: any) => !e.isOnExtendedLeave);
      setSelectedExecIds(available.map((e: any) => e.id));
    } catch (err) {
      console.warn('Failed to fetch executives:', err);
    } finally {
      setExecsLoading(false);
    }
  };

  const handleMonthFilterChange = async (month: number, year: number) => {
    setExpiryMonthFilter(month);
    setExpiryYearFilter(year);
    setAssignResult(null);
    if (!selectedFile) return;

    setPreviewLoading(true);
    try {
      const searchQ = previewSearch.trim() ? `&search=${encodeURIComponent(previewSearch.trim())}` : '';
      const monthQ = month > 0 ? `&month=${month}&year=${year}` : '';
      const res = await api.get<any>(
        `/import/sheets/${encodeURIComponent(selectedFile.fileName)}?page=1&limit=50${searchQ}${monthQ}`
      );
      setModalRows(res.rows || []);
      setModalPage(1);
      setModalTotalRows(res.totalRows || 0);
      setModalTotalPages(res.totalPages || 1);

      if (month > 0) {
        await fetchAvailableExecs(month, year);
      } else {
        setAvailableExecs([]);
        setSelectedExecIds([]);
      }
    } catch (err: any) {
      console.warn('Failed to filter by month:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAssignLeads = async () => {
    if (!selectedFile || selectedExecIds.length === 0 || expiryMonthFilter === 0) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const res = await api.post('/leads/assign-monthly', {
        importName: selectedFile.batchName === 'Imported Leads (Master)' ? null : selectedFile.batchName || null,
        month: expiryMonthFilter,
        year: expiryYearFilter,
        salesExecutiveIds: selectedExecIds
      });
      setAssignResult(res);
      
      // Native Alert Prompt on Successful Assignment
      Alert.alert(
        'Leads Assigned',
        res.message || `${modalTotalRows} leads assigned successfully!`,
        [
          {
            text: 'Go to Leads',
            onPress: () => {
              setSelectedFile(null); // Close preview modal
              router.replace('/(protected)/leads'); // Redirect to Leads tab
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );

      await handleMonthFilterChange(expiryMonthFilter, expiryYearFilter);
    } catch (err: any) {
      setAssignResult({ error: err.message || 'Assignment failed' });
      Alert.alert('Assignment Failed', err.message || 'Could not assign leads.');
    } finally {
      setAssigning(false);
    }
  };

  const handleDownloadAndShare = async (file: SpreadsheetFile) => {
    setDownloading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || '';

      const downloadUrl = file.downloadUrl.startsWith('http')
        ? file.downloadUrl
        : `${BASE_URL}${file.downloadUrl}`;

      // Append token for browser download to validate auth
      const finalUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

      if (Platform.OS === 'android') {
        const supported = await Linking.canOpenURL(finalUrl);
        if (supported) {
          await Linking.openURL(finalUrl);
          Alert.alert('Download Started', 'The file is being downloaded directly to your phone.');
        } else {
          throw new Error('No browser available to handle download.');
        }
      } else {
        const localUri = `${FileSystem.documentDirectory}${file.fileName}`;
        const { uri } = await FileSystem.downloadAsync(finalUrl, localUri);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Share ${file.batchName} Spreadsheet`,
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert('Download Complete', `File saved to ${uri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download spreadsheet.');
    } finally {
      setDownloading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (f.fileName === 'import_renewals.xlsx') return false;
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesName = f.batchName.toLowerCase().includes(term) || f.fileName.toLowerCase().includes(term);
        if (!matchesName) return false;
      }
      if (agentFilter === 'has_agent' && f.agentCount === 0) {
        return false;
      }
      return true;
    });
  }, [files, search, agentFilter]);

  // For modal preview (leads), use paginated modalRows. For renewals tab, use previewData.rows.
  const filteredPreviewRows = useMemo(() => {
    // Renewals tab uses previewData.rows (loaded fully)
    if (activeTab === 'renewals') {
      if (!previewData?.rows) return [];
      let rows = previewData.rows;

      if (previewAgentOnly && previewData.agentColIdx !== -1) {
        rows = rows.filter(r => {
          const val = String(r[previewData.agentColIdx] || '').toLowerCase().trim();
          return val === 'agent' || val.includes('agent');
        });
      }

      if (expiryMonthFilter > 0) {
        const expiryDateColIdx = previewData.headers.findIndex(h => 
          h.toLowerCase().includes('expiry') || h.toLowerCase().includes('end')
        );
        if (expiryDateColIdx !== -1) {
          rows = rows.filter(r => {
            const val = String(r[expiryDateColIdx] || '').trim();
            if (!val || val === '—') return false;
            try {
              const d = new Date(val);
              if (isNaN(d.getTime())) return false;
              return (d.getMonth() + 1) === expiryMonthFilter && d.getFullYear() === expiryYearFilter;
            } catch {
              return false;
            }
          });
        }
      }

      if (previewSearch.trim()) {
        const term = previewSearch.toLowerCase().trim();
        rows = rows.filter(r =>
          r.some(cell => String(cell || '').toLowerCase().includes(term))
        );
      }

      return rows;
    }

    // For modal preview (leads), rows are already paginated and search is server-side
    let rows = modalRows;
    if (previewAgentOnly && previewData?.agentColIdx !== undefined && previewData.agentColIdx !== -1) {
      rows = rows.filter(r => {
        const val = String(r[previewData.agentColIdx] || '').toLowerCase().trim();
        return val === 'agent' || val.includes('agent');
      });
    }
    return rows;
  }, [previewData, modalRows, previewAgentOnly, previewSearch, activeTab, expiryMonthFilter, expiryYearFilter]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <View style={styles.header}>
          <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Spreadsheets</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={Colors.error} style={{ marginBottom: 12 }} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedDesc}>Spreadsheet data is exclusively accessible to Administrators.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Imported Spreadsheets</Text>
        <Pressable style={styles.syncBtn} onPress={() => fetchFiles(true)}>
          <Ionicons name="sync" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'files' && styles.tabButtonActive]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'files' && styles.tabButtonTextActive]}>
            📂 SPREADSHEETS ({files.length - (files.some(f => f.fileName === 'import_renewals.xlsx') ? 1 : 0)})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'renewals' && styles.tabButtonActive]}
          onPress={() => setActiveTab('renewals')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'renewals' && styles.tabButtonTextActive]}>
            🔄 RENEWALS MASTER ({files.find(f => f.fileName === 'import_renewals.xlsx')?.totalRows || 0})
          </Text>
        </Pressable>
      </View>

      {/* TABS CONTENT */}
      {activeTab === 'files' && (
        <>
          {/* Search and Filters */}
          <View style={styles.searchSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search spreadsheet batch name..."
                placeholderTextColor={Colors.textLight}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                </Pressable>
              )}
            </View>

            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, agentFilter === 'all' && styles.filterChipActive]}
                onPress={() => setAgentFilter('all')}
              >
                <Text style={[styles.filterChipText, agentFilter === 'all' && styles.filterChipTextActive]}>
                  All Sheets ({filteredFiles.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, agentFilter === 'has_agent' && styles.filterChipActive]}
                onPress={() => setAgentFilter('has_agent')}
              >
                <Ionicons name="alert-circle" size={14} color={agentFilter === 'has_agent' ? '#FFFFFF' : '#D97706'} style={{ marginRight: 4 }} />
                <Text style={[styles.filterChipText, agentFilter === 'has_agent' && styles.filterChipTextActive]}>
                  With Detected Agents
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Spreadsheets List */}
          <FlatList
            data={filteredFiles}
            keyExtractor={item => item.fileName}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                {loading ? (
                  <ActivityIndicator size="large" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={48} color={Colors.textLight} />
                    <Text style={styles.emptyTitle}>No spreadsheets found</Text>
                    <Text style={styles.emptyText}>Upload leads from the Import Leads screen to generate batch sheets.</Text>
                  </>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.sheetCard, pressed && { opacity: 0.9 }]}
                onPress={() => handleOpenPreview(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="grid-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.batchName} numberOfLines={1}>{item.batchName}</Text>
                    <Text style={styles.fileNameText} numberOfLines={1}>{item.fileName}</Text>
                  </View>
                  {item.agentCount > 0 ? (
                    <View style={styles.agentBadge}>
                      <Ionicons name="alert-circle" size={12} color="#B45309" style={{ marginRight: 3 }} />
                      <Text style={styles.agentBadgeText}>{item.agentCount} Agent{item.agentCount > 1 ? 's' : ''}</Text>
                    </View>
                  ) : (
                    <View style={styles.cleanBadge}>
                      <Text style={styles.cleanBadgeText}>Direct Leads</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>TOTAL ROWS</Text>
                    <Text style={styles.detailValue}>{item.totalRows.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>IMPORTED DATE</Text>
                    <Text style={styles.detailValue}>
                      {item.importedAt ? new Date(item.importedAt).toLocaleDateString('en-IN') : 'Direct Entry'}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>DAY</Text>
                    <Text style={styles.detailValue}>{item.dayOfWeek || '—'}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.previewBtn}
                    onPress={() => handleOpenPreview(item)}
                  >
                    <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                    <Text style={styles.previewBtnText}>View Spreadsheet</Text>
                  </Pressable>

                  <Pressable
                    style={styles.shareBtn}
                    onPress={() => handleDownloadAndShare(item)}
                    disabled={downloading}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#16A34A" />
                    <Text style={styles.shareBtnText}>Share Excel</Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
        </>
      )}

      {activeTab === 'renewals' && (
        <View style={{ flex: 1 }}>
          {/* Search bar inside tab */}
          <View style={styles.renewalsSearchSection}>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search renewals (name, vehicle, policy)..."
                placeholderTextColor={Colors.textLight}
                value={previewSearch}
                onChangeText={setPreviewSearch}
              />
              {previewSearch.length > 0 && (
                <Pressable onPress={() => setPreviewSearch('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Expiry filter horizontal scrollbars */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>FILTER BY EXPIRY MONTH:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollFilters}>
              {['ALL', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.smallFilterChip, expiryMonthFilter === idx && styles.smallFilterChipActive]}
                  onPress={() => setExpiryMonthFilter(idx)}
                >
                  <Text style={[styles.smallFilterChipText, expiryMonthFilter === idx && styles.smallFilterChipTextActive]}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.filterSectionTitle, { marginTop: 6 }]}>FILTER BY EXPIRY YEAR:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollFilters}>
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <Pressable
                  key={y}
                  style={[styles.smallFilterChip, expiryYearFilter === y && styles.smallFilterChipActive]}
                  onPress={() => setExpiryYearFilter(y)}
                >
                  <Text style={[styles.smallFilterChipText, expiryYearFilter === y && styles.smallFilterChipTextActive]}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Inline Data Table */}
          {previewLoading ? (
            <View style={styles.previewLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.previewLoaderText}>Loading renewals master...</Text>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }}>
                  <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.tableHeaderCell, { width: 50 }]}>
                        <Text style={styles.tableHeaderText}>#</Text>
                      </View>
                      {(previewData?.headers || []).map((h, i) => (
                        <View key={i} style={[styles.tableHeaderCell, { width: 140 }]}>
                          <Text style={styles.tableHeaderText} numberOfLines={1}>{h}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Table Body Rows */}
                    {filteredPreviewRows.length === 0 ? (
                      <View style={styles.emptyTable}>
                        <Text style={styles.emptyTableText}>No renewals matches found</Text>
                      </View>
                    ) : (
                      filteredPreviewRows.map((row, rIdx) => (
                        <View key={rIdx} style={styles.tableRow}>
                          <View style={[styles.tableCell, { width: 50 }]}>
                            <Text style={[styles.tableCellText, { color: Colors.textMuted }]}>{rIdx + 1}</Text>
                          </View>
                          {row.map((cell: any, cIdx: number) => {
                            const valStr = cell !== null && cell !== undefined ? String(cell) : '';
                            const isLink = valStr.startsWith('http');
                            return (
                              <View key={cIdx} style={[styles.tableCell, { width: 140 }]}>
                                {isLink ? (
                                  <Pressable
                                    style={styles.pdfLinkBtn}
                                    onPress={() => Linking.openURL(valStr).catch(() => Alert.alert('Error', 'Cannot open URL'))}
                                  >
                                    <Ionicons name="document-outline" size={12} color="#0284C7" />
                                    <Text style={styles.pdfLinkText} numberOfLines={1}>View PDF</Text>
                                  </Pressable>
                                ) : (
                                  <Text style={styles.tableCellText} numberOfLines={2}>
                                    {valStr || '—'}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </ScrollView>
              {/* Row Count Badge Footer */}
              <View style={styles.tabTableFooter}>
                <Text style={styles.tabTableFooterText}>
                  Showing {filteredPreviewRows.length} of {previewData?.rows?.length || 0} active policies
                </Text>
                {previewData?.downloadUrl && (
                  <Pressable
                    style={styles.inlineDownloadBtn}
                    onPress={() => {
                      const fileObj = files.find(f => f.fileName === 'import_renewals.xlsx')
                      if (fileObj) handleDownloadAndShare(fileObj)
                    }}
                  >
                    <Ionicons name="cloud-download-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.inlineDownloadBtnText}>Download XLSX</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Spreadsheet Preview Fullscreen Modal */}
      <Modal
        visible={!!selectedFile}
        animationType="slide"
        onRequestClose={() => setSelectedFile(null)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedFile?.batchName}</Text>
              <Text style={styles.modalSub}>{selectedFile?.totalRows} Total Rows • {selectedFile?.agentCount || 0} Agents</Text>
            </View>
            <Pressable
              style={styles.modalShareIcon}
              onPress={() => selectedFile && handleDownloadAndShare(selectedFile)}
            >
              <Ionicons name="cloud-download-outline" size={22} color={Colors.primary} />
            </Pressable>
            <Pressable onPress={() => setSelectedFile(null)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={26} color={Colors.text} />
            </Pressable>
          </View>

          {/* Modal Filter Controls */}
          <View style={styles.modalFilterRow}>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search row values..."
                placeholderTextColor={Colors.textLight}
                value={previewSearch}
                onChangeText={handleModalSearchChange}
              />
              {previewSearch.length > 0 && (
                <Pressable onPress={() => handleModalSearchChange('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textLight} />
                </Pressable>
              )}
            </View>

            {selectedFile && selectedFile.agentCount > 0 && (
              <Pressable
                style={[styles.agentToggleBtn, previewAgentOnly && styles.agentToggleBtnActive]}
                onPress={() => setPreviewAgentOnly(!previewAgentOnly)}
              >
                <Ionicons name="alert-circle" size={14} color={previewAgentOnly ? '#FFFFFF' : '#B45309'} style={{ marginRight: 4 }} />
                <Text style={[styles.agentToggleBtnText, previewAgentOnly && styles.agentToggleBtnTextActive]}>
                  {previewAgentOnly ? 'Show All' : 'Only Agents'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Monthly Filter & Executive Assignment Panel */}
          {isAdmin && (
            <View style={styles.mobileFilterContainer}>
              <Text style={styles.mobileFilterLabel}>Filter Expiry Month:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {MONTH_NAMES.map((name, idx) => (
                  <Pressable
                    key={idx}
                    style={[
                      styles.mobileMonthChip,
                      expiryMonthFilter === idx && styles.mobileMonthChipActive
                    ]}
                    onPress={() => handleMonthFilterChange(idx, expiryYearFilter)}
                  >
                    <Text style={[
                      styles.mobileMonthChipText,
                      expiryMonthFilter === idx && styles.mobileMonthChipTextActive
                    ]}>
                      {name === 'All Months' ? 'All' : name.substring(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={[styles.mobileFilterLabel, { marginRight: 8, marginBottom: 0 }]}>Year:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <Pressable
                      key={y}
                      style={[
                        styles.mobileYearChip,
                        expiryYearFilter === y && styles.mobileYearChipActive
                      ]}
                      onPress={() => handleMonthFilterChange(expiryMonthFilter, y)}
                    >
                      <Text style={[
                        styles.mobileYearChipText,
                        expiryYearFilter === y && styles.mobileYearChipTextActive
                      ]}>
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Collapsible Assignment Panel */}
              {expiryMonthFilter > 0 && (
                <View style={styles.mobileAssignPanel}>
                  <View style={styles.mobileAssignHeader}>
                    <Ionicons name="people-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.mobileAssignTitle}>Assign Leads ({modalTotalRows})</Text>
                    <Pressable
                      style={styles.mobileExecDropdownToggle}
                      onPress={() => setExecDropdownOpen(!execDropdownOpen)}
                    >
                      <Text style={styles.mobileExecDropdownToggleText}>
                        {selectedExecIds.length} Executives
                      </Text>
                      <Ionicons name={execDropdownOpen ? "chevron-up" : "chevron-down"} size={12} color="#1E40AF" />
                    </Pressable>
                  </View>

                  {execDropdownOpen && (
                    <ScrollView style={styles.mobileExecListContainer} nestedScrollEnabled={true}>
                      {execsLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
                      ) : availableExecs.length === 0 ? (
                        <Text style={styles.mobileExecEmpty}>No active sales persons available.</Text>
                      ) : (
                        availableExecs.map(exec => {
                          const isSelected = selectedExecIds.includes(exec.id);
                          return (
                            <Pressable
                              key={exec.id}
                              style={styles.mobileExecRow}
                              onPress={() => {
                                setSelectedExecIds(prev =>
                                  isSelected ? prev.filter(id => id !== exec.id) : [...prev, exec.id]
                                );
                              }}
                            >
                              <Ionicons
                                name={isSelected ? "checkbox" : "square-outline"}
                                size={16}
                                color={isSelected ? Colors.primary : Colors.textLight}
                                style={{ marginRight: 8 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mobileExecName}>{exec.fullName}</Text>
                                <Text style={styles.mobileExecStats}>
                                  {exec.currentlyAssignedCount} assigned • {exec.isOnExtendedLeave ? 'On Leave' : 'Active'}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>
                  )}

                  <Pressable
                    style={[
                      styles.mobileAssignBtn,
                      (assigning || selectedExecIds.length === 0 || modalTotalRows === 0) && styles.mobileAssignBtnDisabled
                    ]}
                    disabled={assigning || selectedExecIds.length === 0 || modalTotalRows === 0}
                    onPress={handleAssignLeads}
                  >
                    {assigning ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.mobileAssignBtnText}>
                        Assign {modalTotalRows} Leads to {selectedExecIds.length} Executives
                      </Text>
                    )}
                  </Pressable>

                  {assignResult && (
                    <View style={[
                      styles.mobileResultBanner,
                      assignResult.error ? styles.mobileResultBannerError : styles.mobileResultBannerSuccess
                    ]}>
                      <Text style={[
                        styles.mobileResultText,
                        assignResult.error ? styles.mobileResultTextError : styles.mobileResultTextSuccess
                      ]}>
                        {assignResult.error ? `❌ ${assignResult.error}` : `✅ ${assignResult.message}`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Table Container — uses FlatList for virtualized rendering */}
          {previewLoading && filteredPreviewRows.length === 0 ? (
            <View style={styles.previewLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.previewLoaderText}>Loading spreadsheet...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
              <View style={{ flex: 1, width: 50 + ((previewData?.headers || []).length * 140) }}>
                {/* Sticky Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.tableHeaderCell, { width: 50 }]}>
                    <Text style={styles.tableHeaderText}>#</Text>
                  </View>
                  {(previewData?.headers || []).map((h, i) => (
                    <View key={i} style={[styles.tableHeaderCell, { width: 140 }]}>
                      <Text style={styles.tableHeaderText} numberOfLines={1}>{h}</Text>
                    </View>
                  ))}
                </View>

                {/* Virtualized Row List */}
                <FlatList
                  data={filteredPreviewRows}
                  keyExtractor={(_, index) => String(index)}
                  initialNumToRender={20}
                  maxToRenderPerBatch={15}
                  windowSize={5}
                  removeClippedSubviews={true}
                  onEndReached={() => {
                    if (modalPage < modalTotalPages && !modalLoadingMore) {
                      loadMoreModalRows();
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  ListEmptyComponent={
                    <View style={styles.emptyTable}>
                      <Text style={styles.emptyTableText}>No matching rows found in spreadsheet</Text>
                    </View>
                  }
                  ListFooterComponent={
                    modalLoadingMore ? (
                      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '600' }}>Loading more rows...</Text>
                      </View>
                    ) : modalPage < modalTotalPages ? (
                      <Pressable
                        onPress={loadMoreModalRows}
                        style={{ paddingVertical: 14, alignItems: 'center', backgroundColor: '#F0F4FF', marginTop: 2, borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary }}>Load More Rows</Text>
                      </Pressable>
                    ) : null
                  }
                  renderItem={({ item: row, index: rIdx }) => {
                    const isAgent = (previewData?.agentColIdx !== undefined &&
                      previewData.agentColIdx !== -1 &&
                      String(row[previewData.agentColIdx] || '').toLowerCase().trim() === 'agent') ||
                      row.some(cell => String(cell || '').includes('[Agent]'));

                    return (
                      <View style={[styles.tableRow, isAgent && styles.agentTableRow]}>
                        <View style={[styles.tableCell, { width: 50 }, isAgent && styles.agentTableCell]}>
                          <Text style={[styles.tableCellText, { color: Colors.textMuted }]}>{rIdx + 1}</Text>
                        </View>
                        {row.map((cell: any, cIdx: number) => {
                          const isAgentCell = cIdx === previewData?.agentColIdx && String(cell || '').toLowerCase().trim() === 'agent';
                          const valStr = cell !== null && cell !== undefined ? String(cell) : '';
                          const isLink = valStr.startsWith('http');
                          const hasAgentTag = valStr.includes('[Agent]');
                          const cleanVal = valStr.replace('[Agent]', '').trim();

                          return (
                            <View key={cIdx} style={[styles.tableCell, { width: 140 }, isAgent && styles.agentTableCell]}>
                              {isAgentCell ? (
                                <View style={styles.agentPill}>
                                  <Text style={styles.agentPillText}>AGENT 🚨</Text>
                                </View>
                              ) : isLink ? (
                                <Pressable
                                  style={styles.pdfLinkBtn}
                                  onPress={() => Linking.openURL(valStr).catch(() => Alert.alert('Error', 'Cannot open URL'))}
                                >
                                  <Ionicons name="document-outline" size={12} color="#0284C7" />
                                  <Text style={styles.pdfLinkText} numberOfLines={1}>View PDF</Text>
                                </Pressable>
                              ) : hasAgentTag ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                  <Text style={styles.tableCellText} numberOfLines={1}>{cleanVal}</Text>
                                  <View style={styles.inlineAgentBadge}>
                                    <Text style={styles.inlineAgentBadgeText}>AGENT</Text>
                                  </View>
                                </View>
                              ) : (
                                <Text style={styles.tableCellText} numberOfLines={2}>
                                  {valStr || '—'}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  }}
                />
              </View>
            </ScrollView>
          )}

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <Text style={styles.footerRowCount}>
              Showing {filteredPreviewRows.length} of {modalTotalRows || previewData?.totalRows || 0} rows
            </Text>
            <Pressable
              style={styles.footerCloseBtn}
              onPress={() => setSelectedFile(null)}
            >
              <Text style={styles.footerCloseBtnText}>Close View</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  syncBtn: { padding: Spacing.xs },
  restrictedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  restrictedTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  restrictedDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, marginLeft: Spacing.xs },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  filterChipTextActive: { color: '#FFFFFF' },

  listContainer: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: Spacing.xs },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 30 },

  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  fileNameText: { fontSize: 11, color: Colors.textMuted },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  agentBadgeText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  cleanBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cleanBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  detailCol: { alignItems: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.5 },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 2 },

  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  previewBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  // Modal Styles
  modalSafe: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  modalSub: { fontSize: 11, color: Colors.textMuted },
  modalShareIcon: { padding: Spacing.xs, marginRight: Spacing.xs },
  modalCloseBtn: { padding: Spacing.xs },

  modalFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xs,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSearchInput: { flex: 1, fontSize: 12, color: Colors.text, marginLeft: 4 },
  agentToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  agentToggleBtnActive: { backgroundColor: '#D97706', borderColor: '#B45309' },
  agentToggleBtnText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  agentToggleBtnTextActive: { color: '#FFFFFF' },

  previewLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  previewLoaderText: { fontSize: 13, color: Colors.textMuted },

  table: { borderRightWidth: 1, borderRightColor: Colors.border },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    justifyContent: 'center',
  },
  tableHeaderText: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  agentTableRow: { backgroundColor: '#FFFBEB' },
  tableCell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    justifyContent: 'center',
  },
  agentTableCell: { backgroundColor: '#FFFBEB' },
  tableCellText: { fontSize: 11, color: Colors.text },
  agentPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  agentPillText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  inlineAgentBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  inlineAgentBadgeText: {
    color: '#B91C1C',
    fontSize: 9,
    fontWeight: '900',
  },

  emptyTable: { padding: 40, alignItems: 'center' },
  emptyTableText: { fontSize: 13, color: Colors.textMuted },

  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  footerRowCount: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  footerCloseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  footerCloseBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Navigation Tabs Styles
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.text,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: Colors.text,
  },

  // Renewals inline view styles
  renewalsSearchSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textLight,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  scrollFilters: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  smallFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E2E8F0',
    marginRight: 6,
  },
  smallFilterChipActive: {
    backgroundColor: Colors.primary,
  },
  smallFilterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  smallFilterChipTextActive: {
    color: '#FFFFFF',
  },

  // PDF Link Styles
  pdfLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pdfLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },

  // Inline Table Footer
  tabTableFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  tabTableFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  inlineDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  inlineDownloadBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Monthly Filter & Executive Assignment Styles
  mobileFilterContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mobileFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mobileMonthChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E2E8F0',
    marginRight: 6,
  },
  mobileMonthChipActive: {
    backgroundColor: Colors.primary,
  },
  mobileMonthChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  mobileMonthChipTextActive: {
    color: '#FFFFFF',
  },
  mobileYearChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E2E8F0',
    marginRight: 6,
  },
  mobileYearChipActive: {
    backgroundColor: Colors.primary,
  },
  mobileYearChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  mobileYearChipTextActive: {
    color: '#FFFFFF',
  },
  mobileAssignPanel: {
    padding: Spacing.md,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    marginTop: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mobileAssignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mobileAssignTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
    flex: 1,
    marginLeft: 6,
  },
  mobileExecDropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mobileExecDropdownToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
    marginRight: 4,
  },
  mobileExecListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 8,
    maxHeight: 180,
    marginBottom: 8,
  },
  mobileExecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mobileExecName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  mobileExecStats: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  mobileExecEmpty: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  mobileAssignBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileAssignBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  mobileAssignBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileResultBanner: {
    marginTop: 8,
    padding: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  mobileResultBannerSuccess: {
    backgroundColor: '#D1FAE5',
  },
  mobileResultBannerError: {
    backgroundColor: '#FEE2E2',
  },
  mobileResultText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  mobileResultTextSuccess: {
    color: '#065F46',
  },
  mobileResultTextError: {
    color: '#991B1B',
  },
});
