import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { decode } from 'base64-arraybuffer';

import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import AppFooter from '../../src/components/AppFooter';
import LeadPolicySubmissionModal from '../../src/components/LeadPolicySubmissionModal';

const LIVE_BASE_URL = 'https://admin-panel-delta-steel.vercel.app';

const resolveMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${LIVE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

type TabKey = 'Pending_Review' | 'Approved' | 'Issued' | 'Reverted' | 'all';

interface TabItem {
  key: TabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'Pending_Review', label: 'Pending Review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Issued', label: 'Policy Issued' },
  { key: 'Reverted', label: 'Reverted' },
  { key: 'all', label: 'All Submissions' },
];

const DOCUMENT_CATEGORIES: Record<string, string> = {
  IMP_DATE_SS: 'IMP Date Msg SS',
  NCB_CONFIRMATION_SS: 'NCB Confirmation SS',
  PAN_CARD: 'PAN Card',
  PREVIOUS_POLICY: 'Previous Policy',
  QUOTATION: 'Quotation',
  RC_BOOK: 'RC Book',
  VEHICLE_PHOTO: 'Vehicle Photo',
  rc_book: 'RC Book',
  previous_policy: 'Previous Policy',
  pan_card: 'PAN Card',
  vehicle_photo: 'Vehicle Photo',
  ncb_confirmation: 'NCB Confirmation',
  quotation_copy: 'Quotation',
  imp_date_message: 'IMP Date Msg SS'
};

export default function PolicyApprovalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = user?.role?.toUpperCase() || '';
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER');

  const [activeTab, setActiveTab] = useState<TabKey>('Pending_Review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<string, boolean>>({});

  // Full Policy Edit Modal
  const [selectedLeadModal, setSelectedLeadModal] = useState<any>(null);

  // Single PDF Compilation State
  const [compilingLeadId, setCompilingLeadId] = useState<string | null>(null);

  // Revert Modal State
  const [revertItem, setRevertItem] = useState<any>(null);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);

  // Issue Policy Modal State
  const [issueItem, setIssueItem] = useState<any>(null);
  const [policyNo, setPolicyNo] = useState('');
  const [provider, setProvider] = useState('Go Digit');
  const [premium, setPremium] = useState('');
  const [pickedPolicyFile, setPickedPolicyFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [issuing, setIssuing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedLeadIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadSubmissions = useCallback(async () => {
    try {
      let items: any[] = [];

      // 1. Backend Manager Submissions API
      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== 'all') queryParams.set('status', activeTab);
        if (search.trim()) queryParams.set('search', search.trim());
        const res = await api.get<any>(`/manager/submissions?${queryParams.toString()}`);
        if (res?.submissions) {
          items = res.submissions;
        }
      } catch (apiErr) {
        console.warn('[API fetch fallback to Supabase directly]', apiErr);
      }

      // 2. Direct Supabase Query Fallback
      if (items.length === 0) {
        const { data: dbLeads, error: dbErr } = await supabase
          .from('leads')
          .select('id, clientName, clientPhone, clientEmail, vehicleNo, status, customFields, assignee:assignedTo(id, fullName)')
          .not('customFields', 'is', null)
          .is('deletedAt', null)
          .order('updatedAt', { ascending: false })
          .limit(100);

        if (!dbErr && dbLeads) {
          items = dbLeads
            .filter((l: any) => {
              const cf = l.customFields;
              return cf && typeof cf === 'object' && cf.policySubmission;
            })
            .map((l: any) => {
              const cf = l.customFields as any;
              const sub = cf.policySubmission || {};
              return {
                leadId: l.id,
                clientName: l.clientName || 'Customer',
                clientPhone: l.clientPhone || '',
                vehicleNo: l.vehicleNo || 'N/A',
                leadStatus: l.status,
                assignee: l.assignee,
                submission: sub,
                updatedAt: sub.updatedAt || l.updatedAt
              };
            });
        }
      }

      // Local Filtering
      const filtered = items.filter((item: any) => {
        const sub = item.submission || {};
        const st = sub.status || 'Draft';

        if (activeTab !== 'all') {
          if (activeTab === 'Pending_Review' && st !== 'Pending_Review') return false;
          if (activeTab === 'Approved' && st !== 'Approved' && st !== 'Documents_Approved') return false;
          if (activeTab === 'Issued' && st !== 'Issued' && st !== 'Policy_Issued') return false;
          if (activeTab === 'Reverted' && st !== 'Reverted') return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchClient = (item.clientName || '').toLowerCase().includes(q);
          const matchVehicle = (item.vehicleNo || '').toLowerCase().includes(q);
          const matchPhone = (item.clientPhone || '').includes(q);
          const matchAgent = (item.assignee?.fullName || sub.salesPersonName || '').toLowerCase().includes(q);
          return matchClient || matchVehicle || matchPhone || matchAgent;
        }

        return true;
      });

      setSubmissions(filtered);
    } catch (e) {
      console.warn('[Policy Approvals] Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useFocusEffect(
    useCallback(() => {
      loadSubmissions();
    }, [loadSubmissions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  const previewPdf = async (url: string) => {
    if (!url) return;
    const fullUrl = resolveMediaUrl(url);
    try {
      if (Platform.OS === 'web') {
        window.open(fullUrl, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(fullUrl);
      }
    } catch (err) {
      Linking.openURL(fullUrl).catch(() => Alert.alert('Error', 'Could not open PDF viewer'));
    }
  };

  const downloadPdf = async (url: string, vehicleNo: string) => {
    if (!url) return;
    const fullUrl = resolveMediaUrl(url);
    try {
      const cleanReg = (vehicleNo || 'lead').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Policy_Bundle_${cleanReg}_${Date.now()}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);
      if (downloadResult.status !== 200) throw new Error('Download failed');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save / Share Consolidated Policy PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('PDF Saved! 💾', `File saved at: ${localUri}`);
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Could not download PDF');
    }
  };

  const handleCompileOnDemand = async (item: any) => {
    const sub = item.submission || {};
    const docs = sub.documents || [];
    if (docs.length === 0) {
      // Prompt user to open edit form and upload docs
      setSelectedLeadModal(item);
      return;
    }

    setCompilingLeadId(item.leadId);
    try {
      const formData = sub.formData || {};
      const clientName = item.clientName || 'Customer';
      const regNumber = formData.regNo || item.vehicleNo || 'N/A';
      const phoneNum = formData.mobileNo1 || item.clientPhone || 'N/A';

      const docPagesHtml = await Promise.all(
        docs.map(async (doc: any, i: number) => {
          let imgSrc = resolveMediaUrl(doc.filePath);
          const isPdf = doc.filePath?.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf';

          if (isPdf) {
            return `
              <div style="page-break-before: always; padding-top: 16px;">
                <div style="background: #0284c7; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 14px; font-weight: 800; margin-bottom: 12px;">
                  <span>Document ${i + 1} of ${docs.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
                </div>
                <div style="text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; background: #fafafa;">
                  <p style="font-size: 16px; font-weight: bold; color: #0f172a;">Attached PDF Document: ${doc.fileName}</p>
                  <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Direct Link: <a href="${imgSrc}" target="_blank" style="color: #0284c7;">${imgSrc}</a></p>
                </div>
              </div>
            `;
          }

          try {
            if (Platform.OS !== 'web' && imgSrc.startsWith('http')) {
              const localTmp = `${FileSystem.cacheDirectory}compile_doc_${i}_${Date.now()}.jpg`;
              const downloadRes = await FileSystem.downloadAsync(imgSrc, localTmp);
              if (downloadRes?.uri) {
                const b64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                imgSrc = `data:image/jpeg;base64,${b64}`;
              }
            }
          } catch (e) {
            console.warn('[Doc base64 inline fallback]', e);
          }

          return `
            <div style="page-break-before: always; padding-top: 16px;">
              <div style="background: #0284c7; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 14px; font-weight: 800; margin-bottom: 12px;">
                <span>Document ${i + 1} of ${docs.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
              </div>
              <div style="text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fafafa;">
                <img style="max-width: 100%; max-height: 750px; object-fit: contain; border-radius: 6px;" src="${imgSrc}" />
              </div>
            </div>
          `;
        })
      );

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 24px; background: #ffffff; }
              .brand-card { background: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
              .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
              .brand-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
              .section-header { font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 4px; margin: 16px 0 10px 0; text-transform: uppercase; }
              .grid { display: flex; flex-wrap: wrap; margin: -4px; }
              .col { width: 50%; padding: 4px; }
              .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
              .lbl { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; }
              .val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            </style>
          </head>
          <body>
            <div class="brand-card">
              <div class="brand-title">TORQUE AUTO ADVISOR</div>
              <div class="brand-sub">Policy Submission & Document Verification Bundle</div>
              <div style="margin-top: 8px; font-size: 11px; color: #38bdf8;">Client: ${clientName} | Vehicle: ${regNumber} | Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>

            <div class="section-header">1. Policy Particulars</div>
            <div class="grid">
              <div class="col"><div class="box"><div class="lbl">Vehicle Registration No</div><div class="val">${regNumber}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Client Mobile Number</div><div class="val">${phoneNum}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Insurance Company</div><div class="val">${formData.insCompany || formData.policyType || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Payment Mode</div><div class="val">${formData.paymentMode || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Total / Gross Premium</div><div class="val">₹${formData.rsFromCustomer || formData.finalGrossPremium || formData.rate || '0'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Policy Expiry Date</div><div class="val">${formData.expDate || 'N/A'}</div></div></div>
            </div>

            ${docPagesHtml.join('')}
          </body>
        </html>
      `;

      if (Platform.OS !== 'web') {
        const { uri: generatedPdfUri } = await Print.printToFileAsync({ html: htmlContent });
        const pdfBase64 = await FileSystem.readAsStringAsync(generatedPdfUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        const pdfBytes = decode(pdfBase64);
        const pdfStoragePath = `lead-documents/${item.leadId}/compiled_single_policy_${Date.now()}.pdf`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(pdfStoragePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(pdfStoragePath);

          // Update database
          const { data: dbLead } = await supabase
            .from('leads')
            .select('customFields')
            .eq('id', item.leadId)
            .single();

          const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
          const prevSub = cf.policySubmission || {};

          await supabase
            .from('leads')
            .update({
              customFields: {
                ...cf,
                policySubmission: {
                  ...prevSub,
                  compiledPdfUrl: publicUrl,
                  updatedAt: new Date().toISOString()
                }
              }
            })
            .eq('id', item.leadId);

          loadSubmissions();
          previewPdf(publicUrl);
        }
      }
    } catch (compileErr: any) {
      Alert.alert('Compilation Error', compileErr.message || 'Could not compile Single PDF');
    } finally {
      setCompilingLeadId(null);
    }
  };

  const handleApprove = async (item: any) => {
    Alert.alert(
      'Approve Policy Documents',
      `Confirm approval of policy documents for ${item.clientName} (${item.vehicleNo})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve ✓',
          onPress: async () => {
            try {
              const { data: dbLead } = await supabase
                .from('leads')
                .select('customFields')
                .eq('id', item.leadId)
                .single();

              const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
              const prevSub = cf.policySubmission || {};

              await supabase
                .from('leads')
                .update({
                  customFields: {
                    ...cf,
                    policySubmission: {
                      ...prevSub,
                      status: 'Approved',
                      reviewedAt: new Date().toISOString(),
                      reviewedBy: user?.fullName || 'Manager',
                      updatedAt: new Date().toISOString(),
                      history: [
                        ...(prevSub.history || []),
                        {
                          action: 'APPROVED',
                          by: user?.fullName || 'Manager',
                          userId: user?.id,
                          timestamp: new Date().toISOString(),
                          notes: 'Approved by Manager in Policy Approvals'
                        }
                      ]
                    }
                  }
                })
                .eq('id', item.leadId);

              try {
                await api.post('/manager/submissions', {
                  leadId: item.leadId,
                  action: 'APPROVE',
                  notes: 'Approved by Manager in Policy Approvals'
                });
              } catch {}

              Alert.alert('Approved ✓', 'Policy documents approved.');
              loadSubmissions();
            } catch (e: any) {
              Alert.alert('Approval Failed', e.message || 'Could not approve');
            }
          }
        }
      ]
    );
  };

  const handleConfirmRevert = async () => {
    if (!revertItem) return;
    if (!revertReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear reason for returning the submission.');
      return;
    }

    setReverting(true);
    try {
      const reason = revertReason.trim();
      const { data: dbLead } = await supabase
        .from('leads')
        .select('customFields')
        .eq('id', revertItem.leadId)
        .single();

      const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
      const prevSub = cf.policySubmission || {};

      await supabase
        .from('leads')
        .update({
          customFields: {
            ...cf,
            policySubmission: {
              ...prevSub,
              status: 'Reverted',
              revertReason: reason,
              reviewedAt: new Date().toISOString(),
              reviewedBy: user?.fullName || 'Manager',
              updatedAt: new Date().toISOString(),
              history: [
                ...(prevSub.history || []),
                {
                  action: 'REVERTED',
                  by: user?.fullName || 'Manager',
                  userId: user?.id,
                  timestamp: new Date().toISOString(),
                  notes: reason
                }
              ]
            }
          }
        })
        .eq('id', revertItem.leadId);

      try {
        await api.post('/manager/submissions', {
          leadId: revertItem.leadId,
          action: 'REVERT',
          notes: reason
        });
      } catch {}

      Alert.alert('Reverted', 'Submission has been returned to the sales representative.');
      setRevertItem(null);
      setRevertReason('');
      loadSubmissions();
    } catch (e: any) {
      Alert.alert('Revert Failed', e.message || 'Could not revert');
    } finally {
      setReverting(false);
    }
  };

  const handlePickPolicyDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setPickedPolicyFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf'
        });
      }
    } catch (e: any) {
      Alert.alert('File Picker Error', e.message || 'Could not pick document');
    }
  };

  const handleConfirmIssueAndUploadPolicy = async () => {
    if (!issueItem) return;
    if (!policyNo.trim()) {
      Alert.alert('Policy Number Required', 'Please enter the issued Policy Number.');
      return;
    }

    setIssuing(true);
    try {
      const pNo = policyNo.trim();
      const prov = provider.trim() || 'Go Digit';
      const prem = parseFloat(premium) || 0;
      let issuedPdfUrl: string | null = null;

      // Upload policy file if attached
      if (pickedPolicyFile) {
        try {
          const base64Data = await FileSystem.readAsStringAsync(pickedPolicyFile.uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          const fileBytes = decode(base64Data);
          const ext = pickedPolicyFile.name.split('.').pop() || 'pdf';
          const storagePath = `lead-documents/${issueItem.leadId}/issued_company_policy_${Date.now()}.${ext}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileBytes, {
              contentType: pickedPolicyFile.type || 'application/pdf',
              upsert: true
            });

          if (!uploadErr && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(storagePath);
            issuedPdfUrl = publicUrl;
          }
        } catch (uploadE) {
          console.warn('[Policy document upload warning]', uploadE);
        }
      }

      // Direct Supabase DB update
      const { data: dbLead } = await supabase
        .from('leads')
        .select('customFields')
        .eq('id', issueItem.leadId)
        .single();

      const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
      const prevSub = cf.policySubmission || {};

      await supabase
        .from('leads')
        .update({
          status: 'Won',
          customFields: {
            ...cf,
            policySubmission: {
              ...prevSub,
              status: 'Issued',
              issuedPolicyNumber: pNo,
              issuedProvider: prov,
              issuedPremium: prem,
              issuedPolicyPdfUrl: issuedPdfUrl || prevSub.issuedPolicyPdfUrl,
              issuedAt: new Date().toISOString(),
              issuedBy: user?.fullName || 'Manager',
              updatedAt: new Date().toISOString(),
              history: [
                ...(prevSub.history || []),
                {
                  action: 'POLICY_ISSUED',
                  by: user?.fullName || 'Manager',
                  userId: user?.id,
                  timestamp: new Date().toISOString(),
                  notes: `Policy #${pNo} issued (${prov}, ₹${prem})`
                }
              ]
            }
          }
        })
        .eq('id', issueItem.leadId);

      try {
        await api.post('/manager/submissions', {
          leadId: issueItem.leadId,
          action: 'ISSUE_POLICY',
          policyData: {
            policyNumber: pNo,
            provider: prov,
            premiumAmount: prem,
            issuedPolicyPdfUrl: issuedPdfUrl,
            type: issueItem.submission?.formData?.policyType || 'Comprehensive'
          }
        });
      } catch {}

      Alert.alert('Policy Issued Successfully! 🎉', `Policy #${pNo} recorded.`);
      setIssueItem(null);
      setPolicyNo('');
      setPremium('');
      setPickedPolicyFile(null);
      loadSubmissions();
    } catch (e: any) {
      Alert.alert('Policy Issuance Error', e.message || 'Could not issue policy');
    } finally {
      setIssuing(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Pending_Review':
        return { label: 'PENDING REVIEW', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'Approved':
      case 'Documents_Approved':
        return { label: 'DOCS APPROVED', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'Issued':
      case 'Policy_Issued':
        return { label: 'POLICY ISSUED', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'Reverted':
        return { label: 'REVERTED', bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
      default:
        return { label: 'DRAFT', bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          <Text style={styles.headerTitle}>Policy Approvals</Text>
          <Text style={styles.headerSubtitle}>Manager Verification & Issuance</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search client, vehicle no, sales agent..."
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

      {/* Modern Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Submissions List */}
      {loading ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.leadId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Submissions Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'No results matched your search query.' : `No submissions found in this tab.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sub = item.submission || {};
            const formData = sub.formData || {};
            const docs = sub.documents || [];
            const st = sub.status || 'Draft';
            const badge = getStatusBadge(st);
            const hasPdf = !!sub.compiledPdfUrl;
            const hasIssuedPdf = !!sub.issuedPolicyPdfUrl;
            const salesName = item.assignee?.fullName || sub.salesPersonName || 'Sales Executive';
            const isExpanded = !!expandedLeadIds[item.leadId];
            const isCompilingThis = compilingLeadId === item.leadId;

            const grossPrem = formData.rsFromCustomer || formData.finalGrossPremium || formData.rate || '0';
            const netPrem = formData.netPremium || '0';
            const insCo = formData.insCompany || formData.policyType || 'Comprehensive';

            return (
              <View style={styles.modernCard}>
                {/* 1. Header Row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.vehIconBox}>
                    <Ionicons name="car-sport" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={styles.cardClientName} numberOfLines={1}>{item.clientName}</Text>
                    <View style={styles.regPill}>
                      <Text style={styles.regPillText}>{item.vehicleNo}</Text>
                    </View>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.badgePillText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* 2. Submitter Info */}
                <View style={styles.submitterBar}>
                  <View style={styles.subLeft}>
                    <Ionicons name="person-circle-outline" size={14} color="#64748B" />
                    <Text style={styles.subText}>Sales: <Text style={styles.subBold}>{salesName}</Text></Text>
                  </View>
                  {sub.submittedAt && (
                    <Text style={styles.dateText}>{new Date(sub.submittedAt).toLocaleDateString('en-IN')}</Text>
                  )}
                </View>

                {/* 3. Clean Stats Summary Tiles */}
                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    <Text style={styles.statTileLabel}>GROSS PREMIUM</Text>
                    <Text style={[styles.statTileVal, { color: '#059669' }]}>₹{grossPrem}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statTileLabel}>NET PREMIUM</Text>
                    <Text style={styles.statTileVal}>₹{netPrem}</Text>
                  </View>
                  <View style={styles.statTile}>
                    <Text style={styles.statTileLabel}>DOCUMENTS</Text>
                    <Text style={[styles.statTileVal, { color: docs.length >= 7 ? '#059669' : '#D97706' }]}>
                      {docs.length} / 7
                    </Text>
                  </View>
                </View>

                {/* Reverted Feedback Banner */}
                {st === 'Reverted' && sub.revertReason && (
                  <View style={styles.revertBox}>
                    <Ionicons name="alert-circle" size={15} color="#E11D48" />
                    <Text style={styles.revertBoxText}>Reason: {sub.revertReason}</Text>
                  </View>
                )}

                {/* 4. Single Master PDF Action Strip */}
                <View style={styles.pdfStrip}>
                  {hasPdf ? (
                    <>
                      <Pressable
                        style={styles.primaryPdfBtn}
                        onPress={() => previewPdf(sub.compiledPdfUrl)}
                      >
                        <Ionicons name="eye" size={15} color="#FFFFFF" />
                        <Text style={styles.primaryPdfBtnText}>Preview Single PDF</Text>
                      </Pressable>

                      <Pressable
                        style={styles.secondaryPdfBtn}
                        onPress={() => downloadPdf(sub.compiledPdfUrl, item.vehicleNo)}
                      >
                        <Ionicons name="download-outline" size={15} color="#0F172A" />
                        <Text style={styles.secondaryPdfBtnText}>Save</Text>
                      </Pressable>
                    </>
                  ) : docs.length > 0 ? (
                    <Pressable
                      style={styles.compileBtn}
                      onPress={() => handleCompileOnDemand(item)}
                      disabled={isCompilingThis}
                    >
                      {isCompilingThis ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={15} color={Colors.primary} />
                          <Text style={styles.compileBtnText}>Compile & Preview Single PDF</Text>
                        </>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.uploadPromptBtn}
                      onPress={() => setSelectedLeadModal(item)}
                    >
                      <Ionicons name="cloud-upload-outline" size={15} color={Colors.primary} />
                      <Text style={styles.uploadPromptBtnText}>Upload Documents & Fill Form</Text>
                    </Pressable>
                  )}
                </View>

                {/* 5. Issued Policy Copy Button (If Available) */}
                {hasIssuedPdf && (
                  <Pressable
                    style={styles.issuedPolicyDocBtn}
                    onPress={() => previewPdf(sub.issuedPolicyPdfUrl)}
                  >
                    <Ionicons name="checkmark-done-circle" size={16} color="#059669" />
                    <Text style={styles.issuedPolicyDocText}>View Insurer Issued Policy PDF</Text>
                  </Pressable>
                )}

                {/* 6. Expand / Collapse Full Details Toggle */}
                <Pressable onPress={() => toggleExpand(item.leadId)} style={styles.expandToggleBtn}>
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? 'Hide Details' : `View Full Details & Documents (${docs.length})`}
                  </Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#64748B" />
                </Pressable>

                {/* 7. Expanded Full Particulars & Document Grid */}
                {isExpanded && (
                  <View style={styles.expandedDrawer}>
                    <Text style={styles.drawerHeading}>Policy Particulars</Text>
                    <View style={styles.drawerGrid}>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Policy Type</Text><Text style={styles.drawerVal}>{formData.policyType || insCo}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Customer Type</Text><Text style={styles.drawerVal}>{formData.customerType || 'Existing'}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Category</Text><Text style={styles.drawerVal}>{formData.customerCategory || 'MVC'}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Payment Mode</Text><Text style={styles.drawerVal}>{formData.paymentMode || 'Cash'}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>NCB Bonus</Text><Text style={styles.drawerVal}>{formData.ncbPercent || '0'}%</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Expiry Date</Text><Text style={styles.drawerVal}>{formData.expDate || '-'}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Hypothecation</Text><Text style={styles.drawerVal}>{formData.hpDetails || formData.hypothecation || 'None'}</Text></View>
                      <View style={styles.drawerGridCol}><Text style={styles.drawerLbl}>Rate Confirmation</Text><Text style={styles.drawerVal}>{formData.rateConfirmationSS || 'YES'}</Text></View>
                    </View>

                    <Text style={[styles.drawerHeading, { marginTop: 12 }]}>Uploaded Documents ({docs.length})</Text>
                    {docs.length === 0 ? (
                      <Text style={styles.noDocsNotice}>No documents attached to this submission yet.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docThumbScroll}>
                        {docs.map((doc: any, idx: number) => {
                          const fullDocUrl = resolveMediaUrl(doc.filePath);
                          const isDocPdf = doc.filePath?.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf';
                          return (
                            <Pressable
                              key={idx}
                              style={styles.docThumbBox}
                              onPress={() => previewPdf(fullDocUrl)}
                            >
                              {isDocPdf ? (
                                <View style={styles.docPdfPlaceholder}>
                                  <Ionicons name="document-text" size={24} color={Colors.primary} />
                                  <Text style={styles.docPdfPlaceholderText}>PDF</Text>
                                </View>
                              ) : (
                                <Image source={{ uri: fullDocUrl }} style={styles.docImg} resizeMode="cover" />
                              )}
                              <Text style={styles.docThumbName} numberOfLines={2}>
                                {doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* 8. Manager Action Toolbar */}
                {isManagerOrAdmin && (
                  <View style={styles.actionToolbar}>
                    {st === 'Pending_Review' && (
                      <>
                        <Pressable
                          style={[styles.toolBtn, styles.approveToolBtn]}
                          onPress={() => handleApprove(item)}
                        >
                          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                          <Text style={styles.approveToolBtnText}>Approve</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.toolBtn, styles.revertToolBtn]}
                          onPress={() => {
                            setRevertItem(item);
                            setRevertReason('');
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={15} color="#E11D48" />
                          <Text style={styles.revertToolBtnText}>Revert</Text>
                        </Pressable>
                      </>
                    )}

                    {(st === 'Approved' || st === 'Documents_Approved' || st === 'Pending_Review') && (
                      <Pressable
                        style={[styles.toolBtn, styles.issueToolBtn]}
                        onPress={() => {
                          setIssueItem(item);
                          setPolicyNo(sub.issuedPolicyNumber || `POL-${(item.vehicleNo || 'NA').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`);
                          setProvider(formData.insCompany || 'Go Digit');
                          setPremium(formData.rsFromCustomer || formData.finalGrossPremium || '');
                          setPickedPolicyFile(null);
                        }}
                      >
                        <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
                        <Text style={styles.issueToolBtnText}>Issue Policy</Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.editFormBtn}
                      onPress={() => setSelectedLeadModal(item)}
                    >
                      <Ionicons name="create-outline" size={15} color={Colors.primary} />
                      <Text style={styles.editFormBtnText}>Edit</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* REVERT MODAL */}
      <Modal visible={!!revertItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Ionicons name="alert-circle" size={22} color="#E11D48" />
              <Text style={styles.modalHeaderTitle}>Revert Submission</Text>
            </View>
            <Text style={styles.modalHelpText}>
              Explain why {revertItem?.clientName} ({revertItem?.vehicleNo}) is being returned:
            </Text>

            <TextInput
              style={styles.revertBoxInput}
              placeholder="e.g. Please re-upload clearer RC Book photo..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={revertReason}
              onChangeText={setRevertReason}
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setRevertItem(null)}
                disabled={reverting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalRevertButton}
                onPress={handleConfirmRevert}
                disabled={reverting}
              >
                {reverting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRevertButtonText}>Confirm Revert</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ISSUE POLICY MODAL */}
      <Modal visible={!!issueItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Ionicons name="ribbon" size={22} color="#059669" />
                <Text style={styles.modalHeaderTitle}>Issue & Upload Policy</Text>
              </View>
              <Text style={styles.modalHelpText}>
                Finalize policy details for {issueItem?.clientName} ({issueItem?.vehicleNo}):
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Policy Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. POL-2026-98124"
                  placeholderTextColor="#94A3B8"
                  value={policyNo}
                  onChangeText={setPolicyNo}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Insurance Provider</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Go Digit, ICICI Lombard"
                  placeholderTextColor="#94A3B8"
                  value={provider}
                  onChangeText={setProvider}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Premium (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 18500"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={premium}
                  onChangeText={setPremium}
                />
              </View>

              {/* Attach Company Policy PDF */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Attach Insurer Policy PDF / Photo</Text>
                <Pressable
                  style={styles.filePickerButton}
                  onPress={handlePickPolicyDocument}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
                  <Text style={styles.filePickerButtonText}>
                    {pickedPolicyFile ? pickedPolicyFile.name : 'Choose File from Device'}
                  </Text>
                </Pressable>
                {pickedPolicyFile && (
                  <Text style={styles.filePickedNotice}>✓ File selected: {pickedPolicyFile.name}</Text>
                )}
              </View>

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => setIssueItem(null)}
                  disabled={issuing}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalIssueButton}
                  onPress={handleConfirmIssueAndUploadPolicy}
                  disabled={issuing}
                >
                  {issuing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalIssueButtonText}>Issue Policy ✓</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LEAD POLICY SUBMISSION MODAL */}
      {selectedLeadModal && (
        <LeadPolicySubmissionModal
          visible={!!selectedLeadModal}
          leadId={selectedLeadModal.leadId}
          lead={selectedLeadModal}
          onClose={() => setSelectedLeadModal(null)}
          onUpdated={() => {
            loadSubmissions();
            setSelectedLeadModal(null);
          }}
        />
      )}

      {/* Sticky Footer */}
      <AppFooter active="leads" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  iconBtn: { padding: 6, borderRadius: 8 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: Spacing.md,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },

  filterContainer: { marginTop: 10, marginBottom: 4 },
  filterScroll: { paddingHorizontal: Spacing.md, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748B' },

  listContent: { padding: Spacing.md, paddingBottom: 110, gap: 12 },

  emptyView: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },

  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },

  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  vehIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardClientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  regPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2
  },
  regPillText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  badgePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  submitterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  subLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { fontSize: 11, color: '#64748B' },
  subBold: { fontWeight: '700', color: '#0F172A' },
  dateText: { fontSize: 11, color: '#94A3B8' },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  statTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  statTileLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  statTileVal: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 2 },

  revertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 6,
    padding: 8,
    marginTop: 10
  },
  revertBoxText: { fontSize: 11, fontWeight: '600', color: '#E11D48', flex: 1 },

  pdfStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  primaryPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: 8
  },
  primaryPdfBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  secondaryPdfBtn: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  secondaryPdfBtnText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },

  compileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30'
  },
  compileBtnText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  uploadPromptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  uploadPromptBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  issuedPolicyDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8
  },
  issuedPolicyDocText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4
  },
  expandToggleText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  expandedDrawer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  drawerHeading: { fontSize: 11, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', marginBottom: 6 },
  drawerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  drawerGridCol: { width: '50%', paddingVertical: 3 },
  drawerLbl: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  drawerVal: { fontSize: 11, fontWeight: '700', color: '#0F172A', marginTop: 1 },

  noDocsNotice: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginVertical: 4 },
  docThumbScroll: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  docThumbBox: {
    width: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  docImg: { width: 68, height: 68, borderRadius: 6 },
  docPdfPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 6,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  docPdfPlaceholderText: { fontSize: 10, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  docThumbName: { fontSize: 9, fontWeight: '600', color: '#0F172A', textAlign: 'center', marginTop: 3 },

  actionToolbar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8
  },
  approveToolBtn: { backgroundColor: '#059669' },
  approveToolBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  revertToolBtn: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  revertToolBtnText: { fontSize: 11, fontWeight: '800', color: '#E11D48' },
  issueToolBtn: { backgroundColor: '#2563EB' },
  issueToolBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  editFormBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  editFormBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  modalHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalHelpText: { fontSize: 12, color: '#64748B', marginBottom: 12 },

  revertBoxInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 85
  },

  formGroup: { marginBottom: 10 },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    color: '#0F172A'
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center'
  },
  filePickerButtonText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  filePickedNotice: { fontSize: 11, fontWeight: '700', color: '#059669', marginTop: 4 },

  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14
  },
  modalCancelButton: { paddingVertical: 8, paddingHorizontal: 14 },
  modalCancelButtonText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalRevertButton: {
    backgroundColor: '#E11D48',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalRevertButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  modalIssueButton: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalIssueButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' }
});
