import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { decode } from 'base64-arraybuffer';

import { api } from '../../src/utils/api';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import AppFooter from '../../src/components/AppFooter';
import LeadPolicySubmissionModal from '../../src/components/LeadPolicySubmissionModal';

const LIVE_BASE_URL = 'https://admin-panel-delta-steel.vercel.app';
const { width } = Dimensions.get('window');

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
  { key: 'all', label: 'All' },
];

const DOCUMENT_CATEGORIES: Record<string, string> = {
  rc_book: 'RC Book (Front & Back)',
  previous_policy: 'Previous Policy Copy',
  pan_card: 'PAN Card / ID Proof',
  vehicle_photo: 'Vehicle Photos (4 Sides)',
  ncb_confirmation: 'NCB / No Claim Bonus Confirmation',
  quotation_copy: 'Quotation / Rate Confirmation SS',
  imp_date_message: 'IMP Date Message Screenshot'
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

  // Full Policy Modal
  const [selectedLeadModal, setSelectedLeadModal] = useState<any>(null);

  // Single PDF compilation indicator
  const [compilingLeadId, setCompilingLeadId] = useState<string | null>(null);

  // Revert Modal State
  const [revertItem, setRevertItem] = useState<any>(null);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);

  // Issue & Upload Policy Modal State
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

      // 1. Try API route
      try {
        const queryParams = new URLSearchParams();
        if (activeTab !== 'all') queryParams.set('status', activeTab);
        if (search.trim()) queryParams.set('search', search.trim());
        const res = await api.get<any>(`/manager/submissions?${queryParams.toString()}`);
        if (res?.submissions) {
          items = res.submissions;
        }
      } catch (apiErr) {
        console.warn('[API error, falling back to Supabase directly]', apiErr);
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

      // Local Filter
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
      console.warn('[Policy Approvals] Failed to load:', e);
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

  // Compile Single PDF on device if not yet compiled
  const handleCompileOnDemand = async (item: any) => {
    setCompilingLeadId(item.leadId);
    try {
      const sub = item.submission || {};
      const docsToCompile = sub.documents || [];
      const formData = sub.formData || {};

      if (docsToCompile.length === 0) {
        Alert.alert('No Documents Attached', 'Please upload at least one document before compiling the single PDF.');
        return;
      }

      const clientName = item.clientName || 'Customer';
      const regNumber = formData.regNo || item.vehicleNo || 'N/A';
      const phoneNum = formData.mobileNo1 || item.clientPhone || 'N/A';

      // Inline base64 images
      const docPagesHtml = await Promise.all(
        docsToCompile.map(async (doc: any, i: number) => {
          let imgSrc = doc.filePath;
          const isPdf = (doc.filePath && typeof doc.filePath === 'string' && doc.filePath.toLowerCase().endsWith('.pdf')) || doc.fileType === 'application/pdf';

          if (isPdf) {
            return `
              <div style="page-break-before: always; padding-top: 16px;">
                <div style="background: #0284c7; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 14px; font-weight: 800; margin-bottom: 12px;">
                  <span>Document ${i + 1} of ${docsToCompile.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
                </div>
                <div style="text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; background: #fafafa;">
                  <p style="font-size: 16px; font-weight: bold; color: #0f172a;">Attached PDF Document: ${doc.fileName}</p>
                  <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Direct Link: <a href="${doc.filePath}" target="_blank" style="color: #0284c7;">${doc.filePath}</a></p>
                </div>
              </div>
            `;
          }

          try {
            if (Platform.OS !== 'web' && doc.filePath && doc.filePath.startsWith('http')) {
              const localTmp = `${FileSystem.cacheDirectory}compile_doc_${i}_${Date.now()}.jpg`;
              const downloadRes = await FileSystem.downloadAsync(doc.filePath, localTmp);
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
                <span>Document ${i + 1} of ${docsToCompile.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
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
              <div class="col"><div class="box"><div class="lbl">Insurance Company</div><div class="val">${formData.insCompany || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Payment Mode</div><div class="val">${formData.paymentMode || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">GVW / Cubic Capacity</div><div class="val">${formData.gvwCc || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">No Claim Bonus (NCB %)</div><div class="val">${formData.ncbPercent || '0'}%</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Net Premium</div><div class="val">₹${formData.netPremium || '0'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Final Gross Premium</div><div class="val">₹${formData.finalGrossPremium || '0'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Policy Expiry Date</div><div class="val">${formData.expDate || 'N/A'}</div></div></div>
              <div class="col"><div class="box"><div class="lbl">Hypothecation Bank</div><div class="val">${formData.hypothecation || 'None'}</div></div></div>
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

          // Save to database
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
        } else {
          throw new Error(uploadErr?.message || 'Could not upload PDF');
        }
      }
    } catch (compileErr: any) {
      Alert.alert('Compilation Error', compileErr.message || 'Could not compile Single PDF');
    } finally {
      setCompilingLeadId(null);
    }
  };

  const previewPdf = async (url: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${LIVE_BASE_URL}${url}`;
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
    const fullUrl = url.startsWith('http') ? url : `${LIVE_BASE_URL}${url}`;
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

  const handleApprove = async (item: any) => {
    Alert.alert(
      'Approve Policy Documents',
      `Confirm approval of all documents for ${item.clientName} (${item.vehicleNo})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve ✓',
          onPress: async () => {
            try {
              // 1. Direct Supabase DB update
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

              // 2. Call backend endpoint
              try {
                await api.post('/manager/submissions', {
                  leadId: item.leadId,
                  action: 'APPROVE',
                  notes: 'Approved by Manager in Policy Approvals'
                });
              } catch {}

              Alert.alert('Approved ✓', 'Policy documents have been approved. You can now issue the policy once received from the company.');
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
      Alert.alert('Reason Required', 'Please provide a clear reason for reverting.');
      return;
    }

    setReverting(true);
    try {
      const reason = revertReason.trim();

      // 1. Direct Supabase DB update
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

      // 2. Call backend endpoint
      try {
        await api.post('/manager/submissions', {
          leadId: revertItem.leadId,
          action: 'REVERT',
          notes: reason
        });
      } catch {}

      Alert.alert('Reverted', 'Submission has been reverted to the Sales Executive with your feedback.');
      setRevertItem(null);
      setRevertReason('');
      loadSubmissions();
    } catch (e: any) {
      Alert.alert('Revert Failed', e.message || 'Could not revert');
    } finally {
      setReverting(false);
    }
  };

  // Pick Policy File from Phone (PDF or Image)
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

      // 1. Upload the picked policy document to Supabase Storage if attached
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

      // 2. Direct Supabase DB update
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
                  notes: `Policy #${pNo} issued (${prov}, ₹${prem}) ${issuedPdfUrl ? 'with insurer PDF' : ''}`
                }
              ]
            }
          }
        })
        .eq('id', issueItem.leadId);

      // 3. Call backend endpoint
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

      Alert.alert('Policy Issued Successfully! 🎉', `Policy #${pNo} recorded and uploaded document archived permanently.`);
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

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'Pending_Review': return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'Approved':
      case 'Documents_Approved': return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'Issued':
      case 'Policy_Issued': return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'Reverted': return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
      default: return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Policy Approvals</Text>
          <Text style={styles.headerSubtitle}>Manager Verification & Issuance Hub</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search client, vehicle no, sales agent..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Submissions List */}
      {loading ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading policy submissions...</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.leadId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="shield-outline" size={56} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No Submissions Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'No results matching your search criteria.' : `No submissions under ${activeTab.replace('_', ' ')}.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sub = item.submission || {};
            const formData = sub.formData || {};
            const docs = sub.documents || [];
            const st = sub.status || 'Draft';
            const stColor = getStatusColor(st);
            const hasPdf = !!sub.compiledPdfUrl;
            const hasIssuedPdf = !!sub.issuedPolicyPdfUrl;
            const salesName = item.assignee?.fullName || sub.salesPersonName || 'Sales Executive';
            const isExpanded = !!expandedLeadIds[item.leadId];
            const isCompilingThis = compilingLeadId === item.leadId;

            return (
              <View style={styles.card}>
                {/* Top Info Header */}
                <Pressable onPress={() => toggleExpand(item.leadId)} style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="car-sport" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{item.clientName}</Text>
                    <Text style={styles.vehicleNo}>{item.vehicleNo}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: stColor.bg, borderColor: stColor.border }]}>
                      <Text style={[styles.statusText, { color: stColor.text }]}>
                        {st === 'Pending_Review' ? 'Under Review' : st.replace('_', ' ')}
                      </Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
                  </View>
                </Pressable>

                {/* Submitter Details */}
                <View style={styles.submitterRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>Submitted by: <Text style={{ fontWeight: '700', color: Colors.text }}>{salesName}</Text></Text>
                  </View>
                  {sub.submittedAt && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{new Date(sub.submittedAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                  )}
                </View>

                {/* Key Summary Particulars */}
                <View style={styles.particularsGrid}>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>NET PREMIUM</Text>
                    <Text style={styles.val}>₹{formData.netPremium || '0'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>GROSS PREMIUM</Text>
                    <Text style={styles.val}>₹{formData.finalGrossPremium || '0'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>INSURANCE CO</Text>
                    <Text style={styles.val} numberOfLines={1}>{formData.insCompany || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>PAYMENT MODE</Text>
                    <Text style={styles.val}>{formData.paymentMode || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>NCB %</Text>
                    <Text style={styles.val}>{formData.ncbPercent || '0'}%</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.lbl}>ATTACHED DOCS</Text>
                    <Text style={[styles.val, { color: docs.length >= 7 ? '#10B981' : '#F59E0B' }]}>
                      {docs.length} / 7 Uploaded
                    </Text>
                  </View>
                </View>

                {/* EXPANDED FULL DETAILS (All 25 Fields + 7 Attached Document Previews) */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedSectionHeader}>Full Policy Particulars (25 Fields)</Text>
                    <View style={styles.fullGrid}>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Vehicle Reg No</Text><Text style={styles.valSm}>{formData.regNo || item.vehicleNo}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Mobile No 1</Text><Text style={styles.valSm}>{formData.mobileNo1 || item.clientPhone}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Mobile No 2</Text><Text style={styles.valSm}>{formData.mobileNo2 || '-'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Policy Type</Text><Text style={styles.valSm}>{formData.policyType || 'Comprehensive'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Customer Type</Text><Text style={styles.valSm}>{formData.customerType || 'Existing'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Category</Text><Text style={styles.valSm}>{formData.customerCategory || 'MVC'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>GVW / CC</Text><Text style={styles.valSm}>{formData.gvwCc || '-'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Hypothecation Bank</Text><Text style={styles.valSm}>{formData.hypothecation || 'None'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Expiry Date</Text><Text style={styles.valSm}>{formData.expDate || '-'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Rate Confirmation</Text><Text style={styles.valSm}>{formData.rateConfirmation || 'YES'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>NCB Confirmation</Text><Text style={styles.valSm}>{formData.ncbConfirmation || 'Yes'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Inspection Status</Text><Text style={styles.valSm}>{formData.inspectionStatus || 'Not Required'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Google Form Submitted</Text><Text style={styles.valSm}>{formData.googleFormSubmitted || 'YES'}</Text></View>
                      <View style={styles.fullCol}><Text style={styles.lbl}>Description / Notes</Text><Text style={styles.valSm}>{formData.description || 'None'}</Text></View>
                    </View>

                    {/* 7 Document Thumbnails */}
                    <Text style={[styles.expandedSectionHeader, { marginTop: 12 }]}>Attached Documents ({docs.length}/7)</Text>
                    {docs.length === 0 ? (
                      <Text style={styles.noDocsText}>No documents uploaded yet</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docsScroll}>
                        {docs.map((doc: any, index: number) => {
                          const fullDocUrl = resolveMediaUrl(doc.filePath);
                          const isDocPdf = doc.filePath?.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf';
                          return (
                            <Pressable
                              key={index}
                              style={styles.docThumbCard}
                              onPress={() => previewPdf(fullDocUrl)}
                            >
                              {isDocPdf ? (
                                <View style={styles.pdfThumbPlaceholder}>
                                  <Ionicons name="document-text" size={28} color={Colors.primary} />
                                  <Text style={styles.pdfThumbText}>PDF</Text>
                                </View>
                              ) : (
                                <Image source={{ uri: fullDocUrl }} style={styles.docThumbImg} resizeMode="cover" />
                              )}
                              <Text style={styles.docThumbLabel} numberOfLines={2}>
                                {doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Reverted Reason if any */}
                {st === 'Reverted' && sub.revertReason && (
                  <View style={styles.revertNotice}>
                    <Ionicons name="alert-circle" size={16} color="#E11D48" />
                    <Text style={styles.revertNoticeText}>Reverted: "{sub.revertReason}"</Text>
                  </View>
                )}

                {/* Single Consolidated PDF Action Buttons */}
                <View style={styles.pdfActionsRow}>
                  {hasPdf ? (
                    <>
                      <Pressable
                        style={[styles.pdfBtn, styles.previewPdfBtn]}
                        onPress={() => previewPdf(sub.compiledPdfUrl)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.previewPdfBtnText}>Preview Single PDF</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.pdfBtn, styles.downloadPdfBtn]}
                        onPress={() => downloadPdf(sub.compiledPdfUrl, item.vehicleNo)}
                      >
                        <Ionicons name="download-outline" size={16} color={Colors.text} />
                        <Text style={styles.downloadPdfBtnText}>Save PDF</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={[styles.pdfBtn, styles.compileOnDemandBtn]}
                      onPress={() => handleCompileOnDemand(item)}
                      disabled={isCompilingThis}
                    >
                      {isCompilingThis ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="documents-outline" size={16} color={Colors.primary} />
                          <Text style={styles.compileOnDemandText}>Compile & Preview Single PDF</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                {/* Issued Policy Document View Button if Issued */}
                {hasIssuedPdf && (
                  <Pressable
                    style={styles.viewIssuedPdfBtn}
                    onPress={() => previewPdf(sub.issuedPolicyPdfUrl)}
                  >
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <Text style={styles.viewIssuedPdfText}>View Company Issued Policy PDF (#{sub.issuedPolicyNumber || 'POL'})</Text>
                  </Pressable>
                )}

                {/* Manager Action Buttons */}
                {isManagerOrAdmin && (
                  <View style={styles.managerActionRow}>
                    {st === 'Pending_Review' && (
                      <>
                        <Pressable
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleApprove(item)}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Approve Docs</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.actionBtn, styles.revertBtn]}
                          onPress={() => {
                            setRevertItem(item);
                            setRevertReason('');
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color="#E11D48" />
                          <Text style={[styles.actionBtnText, { color: '#E11D48' }]}>Revert</Text>
                        </Pressable>
                      </>
                    )}

                    {(st === 'Approved' || st === 'Documents_Approved' || st === 'Pending_Review') && (
                      <Pressable
                        style={[styles.actionBtn, styles.issueBtn]}
                        onPress={() => {
                          setIssueItem(item);
                          setPolicyNo(sub.issuedPolicyNumber || `POL-${(item.vehicleNo || 'NA').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`);
                          setProvider(formData.insCompany || 'Go Digit');
                          setPremium(formData.finalGrossPremium || '');
                          setPickedPolicyFile(null);
                        }}
                      >
                        <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Issue & Upload Policy</Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.openLeadBtn}
                      onPress={() => setSelectedLeadModal(item)}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={styles.openLeadBtnText}>Edit</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={24} color="#E11D48" />
              <Text style={styles.modalTitle}>Revert Policy Submission</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Please describe why the policy submission for {revertItem?.clientName} ({revertItem?.vehicleNo}) is being returned:
            </Text>

            <TextInput
              style={styles.revertInput}
              placeholder="e.g. RC book photo is blurry, please re-upload page 2..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              value={revertReason}
              onChangeText={setRevertReason}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setRevertItem(null)}
                disabled={reverting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmRevertBtn}
                onPress={handleConfirmRevert}
                disabled={reverting}
              >
                {reverting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRevertText}>Confirm Revert</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ISSUE POLICY & UPLOAD POLICY DOCUMENT MODAL */}
      <Modal visible={!!issueItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Ionicons name="ribbon" size={24} color="#10B981" />
                <Text style={styles.modalTitle}>Issue & Upload Company Policy</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Record active policy for {issueItem?.clientName} ({issueItem?.vehicleNo}) and attach the insurer's policy copy:
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLbl}>Policy Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. POL-2026-98124"
                  placeholderTextColor={Colors.textMuted}
                  value={policyNo}
                  onChangeText={setPolicyNo}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLbl}>Insurance Provider</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Go Digit, ICICI Lombard, HDFC Ergo"
                  placeholderTextColor={Colors.textMuted}
                  value={provider}
                  onChangeText={setProvider}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLbl}>Final Gross Premium (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 18500"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={premium}
                  onChangeText={setPremium}
                />
              </View>

              {/* Upload Company Policy File */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLbl}>Attach Insurer Policy Copy (PDF / Photo)</Text>
                <Pressable
                  style={styles.pickFileBtn}
                  onPress={handlePickPolicyDocument}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
                  <Text style={styles.pickFileBtnText}>
                    {pickedPolicyFile ? pickedPolicyFile.name : 'Choose Policy PDF or Image'}
                  </Text>
                </Pressable>
                {pickedPolicyFile && (
                  <Text style={styles.fileSelectedText}>✓ Selected: {pickedPolicyFile.name}</Text>
                )}
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setIssueItem(null)}
                  disabled={issuing}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalConfirmIssueBtn}
                  onPress={handleConfirmIssueAndUploadPolicy}
                  disabled={issuing}
                >
                  {issuing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmIssueText}>Issue & Save Policy ✓</Text>
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  refreshBtn: { padding: Spacing.xs },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: { flex: 1, height: 38, fontSize: FontSize.sm, color: Colors.text },
  clearSearch: { padding: 4 },

  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: Spacing.xs
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  tabChipActive: { backgroundColor: Colors.primary },
  tabChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  tabChipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.sm, color: Colors.textMuted, fontSize: FontSize.sm },

  listContent: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  emptyView: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  emptySubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  clientName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  vehicleNo: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  submitterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  particularsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  gridCol: { width: '50%', paddingVertical: 4, paddingHorizontal: 4 },
  lbl: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  val: { fontSize: 12, fontWeight: '800', color: Colors.text, marginTop: 1 },
  valSm: { fontSize: 11, fontWeight: '700', color: Colors.text, marginTop: 1 },

  expandedSection: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  expandedSectionHeader: { fontSize: 11, fontWeight: '800', color: Colors.text, textTransform: 'uppercase', marginBottom: 6 },
  fullGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fullCol: { width: '50%', paddingVertical: 3, paddingHorizontal: 2 },
  noDocsText: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', marginVertical: 6 },

  docsScroll: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  docThumbCard: {
    width: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  docThumbImg: { width: 78, height: 78, borderRadius: 6 },
  pdfThumbPlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 6,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pdfThumbText: { fontSize: 10, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  docThumbLabel: { fontSize: 9, fontWeight: '600', color: Colors.text, textAlign: 'center', marginTop: 4 },

  revertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 6,
    padding: 8,
    marginTop: Spacing.xs,
    gap: 6
  },
  revertNoticeText: { fontSize: 11, color: '#E11D48', fontWeight: '700', flex: 1 },

  pdfActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8
  },
  previewPdfBtn: { backgroundColor: Colors.primary },
  previewPdfBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  downloadPdfBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  downloadPdfBtnText: { fontSize: 11, fontWeight: '700', color: Colors.text },
  compileOnDemandBtn: { backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary + '30' },
  compileOnDemandText: { fontSize: 11, fontWeight: '800', color: Colors.primary },

  viewIssuedPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: Spacing.xs
  },
  viewIssuedPdfText: { fontSize: 11, fontWeight: '800', color: '#047857' },

  managerActionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8
  },
  approveBtn: { backgroundColor: '#10B981' },
  revertBtn: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  issueBtn: { backgroundColor: '#2563EB' },
  actionBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  openLeadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  openLeadBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  modalOverlay: {
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  modalTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  modalSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },

  revertInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlignVertical: 'top',
    height: 90
  },

  inputGroup: { marginBottom: Spacing.xs },
  inputLbl: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 3 },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: FontSize.sm,
    color: Colors.text
  },
  pickFileBtn: {
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
  pickFileBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  fileSelectedText: { fontSize: 11, fontWeight: '700', color: '#10B981', marginTop: 4 },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md
  },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  modalCancelText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  modalConfirmRevertBtn: {
    backgroundColor: '#E11D48',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalConfirmRevertText: { fontSize: FontSize.sm, fontWeight: '800', color: '#FFFFFF' },
  modalConfirmIssueBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modalConfirmIssueText: { fontSize: FontSize.sm, fontWeight: '800', color: '#FFFFFF' }
});
