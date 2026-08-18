import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { decode } from 'base64-arraybuffer';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { api } from '../utils/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const REQUIRED_DOCUMENTS = [
  { key: 'IMP_DATE_SS', label: '1. IMP Date Message Screenshot', desc: 'Screenshot of important date communication' },
  { key: 'NCB_CONFIRMATION_SS', label: '2. NCB Confirmation Screenshot', desc: 'Proof of No Claim Bonus confirmation' },
  { key: 'PAN_CARD', label: '3. Pan Card', desc: 'Client PAN card copy / photo' },
  { key: 'PREVIOUS_POLICY', label: '4. Previous Policy (If applicable)', desc: 'Prior policy document copy' },
  { key: 'QUOTATION', label: '5. Quotation', desc: 'Generated insurance quotation PDF/image' },
  { key: 'RC_BOOK', label: '6. RC Book', desc: 'Vehicle Registration Certificate (Front & Back)' },
  { key: 'VEHICLE_PHOTO', label: '7. Vehicle Photo for Body Type', desc: 'Live vehicle photo confirming body type match' },
];

interface Props {
  visible: boolean;
  leadId: string;
  lead: any;
  onClose: () => void;
  onUpdated?: () => void;
}

const LIVE_BASE_URL = 'https://admin-panel-delta-steel.vercel.app';

export default function LeadPolicySubmissionModal({ visible, leadId, lead, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const roleUpper = user?.role?.name?.toUpperCase() || (typeof user?.role === 'string' ? user?.role.toUpperCase() : '');
  const isManagerOrAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('MANAGER');

  const [activeTab, setActiveTab] = useState<'form' | 'docs' | 'manager'>('form');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  const [submission, setSubmission] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    policyType: 'nil dep',
    customerType: 'existing',
    customerCategory: 'MVC',
    regNo: lead?.vehicleNo || lead?.vehicle_number || '',
    rate: '',
    rateConfirmationSS: 'YES',
    rsFromCustomer: '',
    description: '',
    otherWorks: '',
    paymentMode: 'cash',
    ncb: 'with ncb',
    expDate: lead?.expiryDate ? new Date(lead.expiryDate).toISOString().split('T')[0] : '',
    mobileNo1: lead?.clientPhone || lead?.phone || '',
    mobileNo2: '',
    ncbConfirmation: 'Yes',
    impDateMsgSS: 'Yes',
    hpDetails: 'as per rc',
    vehiclePhoto: 'n.a.',
    bodyTypeMatched: 'n.a.',
    googleFormSubmitted: 'YES',
    noJackCoverConfirmationSS: 'N.A.',
    idvBreakup: '',
    newName: '',
    inspectionStatus: 'Not Required',
    mparivahanRcStatus: '',
    amountDueDateMsgSS: ''
  });

  // Manager action states
  const [revertReason, setRevertReason] = useState('');
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [policyNoInput, setPolicyNoInput] = useState('');
  const [providerInput, setProviderInput] = useState('Go Digit General Insurance');
  const [premiumInput, setPremiumInput] = useState('');
  const [issuingPolicy, setIssuingPolicy] = useState(false);

  useEffect(() => {
    if (visible && leadId) {
      loadSubmission();
    }
  }, [visible, leadId]);

  const loadSubmission = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}/policy-submission`);
      if (res?.submission) {
        setSubmission(res.submission);
        if (res.submission.formData) {
          setFormData((prev: any) => ({
            ...prev,
            ...res.submission.formData,
            regNo: res.submission.formData.regNo || lead?.vehicleNo || lead?.vehicle_number || '',
            mobileNo1: res.submission.formData.mobileNo1 || lead?.clientPhone || lead?.phone || '',
            expDate: res.submission.formData.expDate || (lead?.expiryDate ? new Date(lead.expiryDate).toISOString().split('T')[0] : '')
          }));
        }
      }
    } catch (e: any) {
      console.warn('Failed to load policy submission', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await api.post(`/leads/${leadId}/policy-submission`, { formData });
      Alert.alert('Saved', 'Policy details draft saved successfully.');
      loadSubmission();
      if (onUpdated) onUpdated();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePickDocument = async (categoryKey: string) => {
    try {
      Alert.alert(
        'Upload Document',
        'Choose upload source:',
        [
          {
            text: 'Choose Image / Photo',
            onPress: async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (!res.canceled && res.assets[0]) {
                const asset = res.assets[0];
                await uploadFile(asset.uri, asset.fileName || `${categoryKey}.jpg`, 'image/jpeg', categoryKey);
              }
            }
          },
          {
            text: 'Choose PDF / Document',
            onPress: async () => {
              const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
              });
              if (!res.canceled && res.assets[0]) {
                const asset = res.assets[0];
                await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/pdf', categoryKey);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Could not pick document');
    }
  };

  const uploadFile = async (uri: string, name: string, type: string, category: string) => {
    setUploadingCategory(category);
    try {
      const cleanExt = (name.split('.').pop() || (type.includes('pdf') ? 'pdf' : 'jpg')).toLowerCase();
      const safeName = name || `${category.toLowerCase()}.${cleanExt}`;
      const savedFileName = `${category.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
      const storagePath = `lead-documents/${leadId}/${savedFileName}`;
      const mimeType = type || (cleanExt === 'pdf' ? 'application/pdf' : 'image/jpeg');

      let uploadedPublicUrl: string | null = null;

      // Strategy 1: Direct Supabase Storage Upload (Fastest & Most Reliable on Mobile)
      try {
        let fileBytes: ArrayBuffer | null = null;

        if (Platform.OS !== 'web') {
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileBytes = decode(base64Data);
        } else {
          const fetchRes = await fetch(uri);
          fileBytes = await fetchRes.arrayBuffer();
        }

        if (fileBytes) {
          const { data: uploadData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileBytes, {
              contentType: mimeType,
              upsert: true,
            });

          if (!storageError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(storagePath);
            uploadedPublicUrl = publicUrl;
          } else {
            console.warn('[direct storage upload failed, falling back]', storageError);
          }
        }
      } catch (directErr) {
        console.warn('[direct upload catch, falling back to server]', directErr);
      }

      // If Direct Upload succeeded, record metadata via JSON
      if (uploadedPublicUrl) {
        await api.post(`/leads/${leadId}/policy-submission/record-document`, {
          category,
          fileName: safeName,
          savedFileName,
          filePath: uploadedPublicUrl,
          storagePath,
          fileType: mimeType,
        });

        Alert.alert('Upload Successful! ✓', `${DOCUMENT_CATEGORIES[category] || category} uploaded.`);
        loadSubmission();
        if (onUpdated) onUpdated();
        return;
      }

      // Strategy 2: Server-side Multipart Upload Fallback
      const uploadUrl = `${LIVE_BASE_URL}/api/v1/leads/${leadId}/policy-submission/upload?category=${encodeURIComponent(category)}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (Platform.OS !== 'web') {
        const uploadRes = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'x-document-category': category,
          },
          parameters: { category },
        });

        if (uploadRes.status >= 200 && uploadRes.status < 300) {
          Alert.alert('Upload Successful! ✓', `${DOCUMENT_CATEGORIES[category] || category} uploaded.`);
          loadSubmission();
          if (onUpdated) onUpdated();
          return;
        }

        let errObj: any = {};
        try { errObj = JSON.parse(uploadRes.body); } catch {}
        throw new Error(errObj.error || errObj.details || `Server upload returned ${uploadRes.status}`);
      } else {
        const formDataUpload = new FormData();
        formDataUpload.append('file', { uri, name: safeName, type: mimeType } as any);
        formDataUpload.append('category', category);

        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          body: formDataUpload,
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || resData.details || 'Upload failed');

        Alert.alert('Upload Successful! ✓', `${DOCUMENT_CATEGORIES[category] || category} uploaded.`);
        loadSubmission();
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      console.error('[upload error]', err);
      Alert.alert('Upload Error', err.message || 'Could not upload document');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleCompilePdf = async () => {
    setCompiling(true);
    try {
      // First save current form data
      await api.post(`/leads/${leadId}/policy-submission`, { formData });
      const res = await api.post(`/leads/${leadId}/policy-submission/compile-pdf`, {});
      Alert.alert('Single PDF Compiled!', 'All uploaded documents and form details have been compiled into a single PDF file.');
      loadSubmission();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      Alert.alert('PDF Compilation Failed', err.message || 'Could not compile PDF');
    } finally {
      setCompiling(false);
    }
  };

  const handleSubmitToManager = async () => {
    if (!submission?.compiledPdfUrl) {
      Alert.alert('Single PDF Required', 'Please tap "Convert to Single PDF" first before submitting to manager.');
      return;
    }

    Alert.alert(
      'Submit to Manager',
      'Are you sure you want to submit this policy bundle for Manager Review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post(`/leads/${leadId}/policy-submission/submit`, {});
              Alert.alert('Submitted!', 'Policy documents and details have been submitted to Manager for verification.');
              loadSubmission();
              if (onUpdated) onUpdated();
            } catch (err: any) {
              Alert.alert('Submission Error', err.message || 'Could not submit');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleManagerApprove = async () => {
    Alert.alert(
      'Approve Policy Bundle',
      'Confirm that all documents and rates are verified? This will mark the submission as Approved and ready for policy issuance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.post('/manager/submissions', {
                leadId,
                action: 'APPROVE',
                notes: 'Approved by Manager on mobile app'
              });
              Alert.alert('Approved ✓', 'Policy documents approved.');
              loadSubmission();
              if (onUpdated) onUpdated();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Approval failed');
            }
          }
        }
      ]
    );
  };

  const handleManagerRevert = async () => {
    if (!revertReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for reverting.');
      return;
    }

    try {
      await api.post('/manager/submissions', {
        leadId,
        action: 'REVERT',
        notes: revertReason.trim()
      });
      setShowRevertModal(false);
      setRevertReason('');
      Alert.alert('Reverted', 'Submission has been reverted to Sales Person.');
      loadSubmission();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Revert failed');
    }
  };

  const handleIssuePolicy = async () => {
    if (!policyNoInput.trim()) {
      Alert.alert('Error', 'Please enter the issued Policy Number.');
      return;
    }

    try {
      setIssuingPolicy(true);
      await api.post('/manager/submissions', {
        leadId,
        action: 'ISSUE_POLICY',
        policyData: {
          policyNumber: policyNoInput.trim(),
          provider: providerInput.trim() || 'Go Digit',
          premiumAmount: parseFloat(premiumInput) || 0,
          type: formData.policyType || 'Comprehensive'
        }
      });
      Alert.alert('Policy Issued Successfully! 🎉', 'Active policy created and synced with master monthly sheet.');
      setPolicyNoInput('');
      setPremiumInput('');
      loadSubmission();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not issue policy');
    } finally {
      setIssuingPolicy(false);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const previewPdf = async (url: string) => {
    if (!url) {
      Alert.alert('No PDF', 'Single PDF has not been compiled yet.');
      return;
    }
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

  const downloadAndSavePdf = async (url: string) => {
    if (!url) {
      Alert.alert('No PDF', 'Please convert to Single PDF first.');
      return;
    }
    const fullUrl = url.startsWith('http') ? url : `${LIVE_BASE_URL}${url}`;
    setDownloadingPdf(true);
    try {
      const cleanReg = (formData.regNo || lead?.vehicleNo || 'lead').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Policy_Bundle_${cleanReg}_${Date.now()}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save / Share Single Policy PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('PDF Saved! 💾', `File saved to phone at: ${localUri}`);
      }
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save PDF to phone.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const status = submission?.status || 'Draft';
  const docsCount = submission?.documents?.length || 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Policy Documents & Flow</Text>
            <Text style={styles.headerSubTitle} numberOfLines={1}>{lead?.clientName || lead?.name || 'Customer'}</Text>
          </View>
          <View style={[styles.statusTag, getStatusBadgeStyle(status)]}>
            <Text style={styles.statusTagText}>{status === 'Pending_Review' ? 'Pending Review' : status}</Text>
          </View>
        </View>

        {/* Revert Banner if Reverted */}
        {status === 'Reverted' && submission?.revertReason && (
          <View style={styles.revertBanner}>
            <Ionicons name="alert-circle" size={20} color="#E11D48" />
            <View style={{ flex: 1 }}>
              <Text style={styles.revertBannerTitle}>Manager Reverted Submission:</Text>
              <Text style={styles.revertBannerText}>"{submission.revertReason}"</Text>
            </View>
          </View>
        )}

        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'form' && styles.tabBtnActive]}
            onPress={() => setActiveTab('form')}
          >
            <Ionicons name="document-text-outline" size={16} color={activeTab === 'form' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'form' && styles.tabTextActive]}>25 Policy Fields</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'docs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('docs')}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={activeTab === 'docs' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>Docs ({docsCount}/7)</Text>
          </Pressable>

          {isManagerOrAdmin && (
            <Pressable
              style={[styles.tabBtn, activeTab === 'manager' && styles.tabBtnActive]}
              onPress={() => setActiveTab('manager')}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={activeTab === 'manager' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, activeTab === 'manager' && styles.tabTextActive]}>Manager Review</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.mutedText}>Loading submission data...</Text>
          </View>
        ) : (
          <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 100 }}>
            
            {/* TAB 1: FORM FIELDS */}
            {activeTab === 'form' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Vehicle & Policy Basics</Text>
                  
                  <FormField label="Registration No (Reg No)" value={formData.regNo} onChange={v => handleFieldChange('regNo', v)} placeholder="e.g. GJ18AV5577" />
                  <FormField label="Policy Type" value={formData.policyType} onChange={v => handleFieldChange('policyType', v)} placeholder="e.g. nil dep, comprehensive, TP" />
                  <FormField label="Customer Type" value={formData.customerType} onChange={v => handleFieldChange('customerType', v)} placeholder="existing / new" />
                  <FormField label="Customer Category" value={formData.customerCategory} onChange={v => handleFieldChange('customerCategory', v)} placeholder="MVC, GCV, PCV, etc." />
                  <FormField label="Expiry Date" value={formData.expDate} onChange={v => handleFieldChange('expDate', v)} placeholder="YYYY-MM-DD" />
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Contact & Commercials</Text>
                  
                  <FormField label="Mobile No 1" value={formData.mobileNo1} onChange={v => handleFieldChange('mobileNo1', v)} placeholder="Primary Mobile" />
                  <FormField label="Mobile No 2" value={formData.mobileNo2} onChange={v => handleFieldChange('mobileNo2', v)} placeholder="Secondary Mobile" />
                  <FormField label="Approved Rate / Quotation" value={formData.rate} onChange={v => handleFieldChange('rate', v)} placeholder="e.g. 18500" />
                  <FormField label="Rs From Customer (Amount Paid)" value={formData.rsFromCustomer} onChange={v => handleFieldChange('rsFromCustomer', v)} placeholder="e.g. 18500" />
                  <FormField label="Payment Mode" value={formData.paymentMode} onChange={v => handleFieldChange('paymentMode', v)} placeholder="cash / gpay / bank" />
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Confirmations & Verifications</Text>
                  
                  <FormField label="NCB" value={formData.ncb} onChange={v => handleFieldChange('ncb', v)} placeholder="with ncb / without ncb" />
                  <FormField label="NCB Confirmation Screenshot" value={formData.ncbConfirmation} onChange={v => handleFieldChange('ncbConfirmation', v)} placeholder="Yes / No" />
                  <FormField label="IMP Date Message SS" value={formData.impDateMsgSS} onChange={v => handleFieldChange('impDateMsgSS', v)} placeholder="Yes / No" />
                  <FormField label="Rate Confirmation SS" value={formData.rateConfirmationSS} onChange={v => handleFieldChange('rateConfirmationSS', v)} placeholder="YES / NO" />
                  <FormField label="HP Details (Hypothecation)" value={formData.hpDetails} onChange={v => handleFieldChange('hpDetails', v)} placeholder="as per rc / bank name" />
                  <FormField label="Vehicle Photo" value={formData.vehiclePhoto} onChange={v => handleFieldChange('vehiclePhoto', v)} placeholder="available / n.a." />
                  <FormField label="Body Type Matched" value={formData.bodyTypeMatched} onChange={v => handleFieldChange('bodyTypeMatched', v)} placeholder="matched / n.a." />
                  <FormField label="Inspection Status" value={formData.inspectionStatus} onChange={v => handleFieldChange('inspectionStatus', v)} placeholder="Not Required / Done" />
                  <FormField label="Description / Remarks" value={formData.description} onChange={v => handleFieldChange('description', v)} placeholder="Special notes..." multiline />
                </View>

                <Pressable
                  style={[styles.primaryActionBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSaveDraft}
                  disabled={saving}
                >
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>{saving ? 'Saving...' : 'Save Draft Details'}</Text>
                </Pressable>
              </View>
            )}

            {/* TAB 2: DOCUMENTS & MERGE PDF */}
            {activeTab === 'docs' && (
              <View style={styles.tabContent}>
                
                {/* Compiled Single PDF Card */}
                <View style={styles.compiledCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.pdfIconWrap}>
                      <Ionicons name="document-attach" size={24} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compiledTitle}>Consolidated Single PDF</Text>
                      <Text style={styles.compiledDesc}>
                        {submission?.compiledPdfUrl ? 'Compiled and ready for Manager' : 'Upload docs below & convert to Single PDF'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <Pressable
                      style={[styles.compileBtn, compiling && { opacity: 0.7 }]}
                      onPress={handleCompilePdf}
                      disabled={compiling || docsCount === 0}
                    >
                      <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.compileBtnText}>{compiling ? 'Compiling...' : 'Convert to Single PDF'}</Text>
                    </Pressable>

                    {submission?.compiledPdfUrl && (
                      <>
                        <Pressable
                          style={styles.viewPdfBtn}
                          onPress={() => previewPdf(submission.compiledPdfUrl)}
                        >
                          <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                          <Text style={styles.viewPdfBtnText}>Preview PDF</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.downloadPdfBtn, downloadingPdf && { opacity: 0.7 }]}
                          onPress={() => downloadAndSavePdf(submission.compiledPdfUrl)}
                          disabled={downloadingPdf}
                        >
                          {downloadingPdf ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.downloadPdfBtnText}>Save to Phone</Text>
                            </>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>

                {/* 7 Required Documents Slots */}
                <Text style={styles.sectionHeaderTitle}>Upload 7 Required Documents</Text>

                {REQUIRED_DOCUMENTS.map((reqDoc, idx) => {
                  const uploaded = (submission?.documents || []).find((d: any) => d.category === reqDoc.key);
                  const isUploadingThis = uploadingCategory === reqDoc.key;

                  return (
                    <View key={reqDoc.key} style={[styles.docSlotCard, uploaded && styles.docSlotCardUploaded]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.docSlotLabel}>{reqDoc.label}</Text>
                          <Text style={styles.docSlotDesc}>{reqDoc.desc}</Text>
                          {uploaded && (
                            <Text style={styles.docUploadedName} numberOfLines={1}>
                              ✓ {uploaded.fileName}
                            </Text>
                          )}
                        </View>

                        <Pressable
                          style={[styles.uploadSlotBtn, uploaded ? styles.uploadSlotBtnSuccess : styles.uploadSlotBtnPrimary]}
                          onPress={() => handlePickDocument(reqDoc.key)}
                          disabled={isUploadingThis}
                        >
                          {isUploadingThis ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name={uploaded ? "cloud-done-outline" : "cloud-upload-outline"} size={16} color="#FFFFFF" />
                              <Text style={styles.uploadSlotBtnText}>{uploaded ? 'Re-upload' : 'Upload'}</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {/* Submit to Manager Button */}
                <View style={{ marginTop: 20 }}>
                  <Pressable
                    style={[
                      styles.submitManagerBtn,
                      (!submission?.compiledPdfUrl || submitting) && { opacity: 0.6 }
                    ]}
                    onPress={handleSubmitToManager}
                    disabled={!submission?.compiledPdfUrl || submitting}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitManagerBtnText}>
                      {submitting ? 'Submitting...' : 'Submit to Manager for Approval'}
                    </Text>
                  </Pressable>
                  {!submission?.compiledPdfUrl && (
                    <Text style={styles.helperNotice}>
                      * You must tap "Convert to Single PDF" before submitting to manager.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* TAB 3: MANAGER REVIEW & POLICY ISSUANCE */}
            {activeTab === 'manager' && isManagerOrAdmin && (
              <View style={styles.tabContent}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Manager Verification & Actions</Text>
                  <Text style={styles.mutedText}>
                    Review the Single Compiled PDF, verify payment & rates, then Approve or Revert.
                  </Text>

                  {submission?.compiledPdfUrl ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <Pressable
                        style={[styles.viewPdfBtn, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => previewPdf(submission.compiledPdfUrl)}
                      >
                        <Ionicons name="eye" size={16} color={Colors.primary} />
                        <Text style={styles.viewPdfBtnText}>Preview PDF</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.downloadPdfBtn, { flex: 1, justifyContent: 'center' }, downloadingPdf && { opacity: 0.7 }]}
                        onPress={() => downloadAndSavePdf(submission.compiledPdfUrl)}
                        disabled={downloadingPdf}
                      >
                        <Ionicons name="download" size={16} color="#FFFFFF" />
                        <Text style={styles.downloadPdfBtnText}>Save to Phone</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.warningBox}>
                      <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                      <Text style={styles.warningBoxText}>Sales Person has not compiled Single PDF yet.</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={handleManagerApprove}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve Documents ✓</Text>
                    </Pressable>

                    <Pressable
                      style={styles.revertBtn}
                      onPress={() => setShowRevertModal(true)}
                    >
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.revertBtnText}>Revert with Notes</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Final Policy Issuance Card */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Final Issued Policy (Activate Lead)</Text>
                  <Text style={styles.mutedText}>
                    Once the insurance company issues the policy, fill in the policy number and confirm. This converts the lead into an active policy.
                  </Text>

                  <FormField
                    label="Issued Policy Number *"
                    value={policyNoInput}
                    onChange={setPolicyNoInput}
                    placeholder="e.g. POL-2026-88992"
                  />
                  <FormField
                    label="Insurance Provider"
                    value={providerInput}
                    onChange={setProviderInput}
                    placeholder="e.g. Go Digit, ICICI Lombard"
                  />
                  <FormField
                    label="Final Premium (₹)"
                    value={premiumInput}
                    onChange={setPremiumInput}
                    placeholder="e.g. 18500"
                  />

                  <Pressable
                    style={[styles.issuePolicyBtn, issuingPolicy && { opacity: 0.7 }]}
                    onPress={handleIssuePolicy}
                    disabled={issuingPolicy}
                  >
                    <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.issuePolicyBtnText}>
                      {issuingPolicy ? 'Issuing Policy...' : 'Issue Final Policy & Sync Sheet'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

          </ScrollView>
        )}

        {/* Revert Modal */}
        <Modal visible={showRevertModal} transparent animationType="fade" onRequestClose={() => setShowRevertModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.revertModalCard}>
              <Text style={styles.revertModalTitle}>Revert Policy Submission</Text>
              <Text style={styles.mutedText}>Explain what needs correction to the sales person:</Text>
              <TextInput
                style={styles.revertInput}
                placeholder="e.g. Missing PAN card clear copy, incorrect vehicle model..."
                placeholderTextColor={Colors.textLight}
                value={revertReason}
                onChangeText={setRevertReason}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable style={styles.cancelModalBtn} onPress={() => setShowRevertModal(false)}>
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmRevertBtn} onPress={handleManagerRevert}>
                  <Text style={styles.confirmRevertBtnText}>Revert Submission</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

function FormField({ label, value, onChange, placeholder, multiline = false }: any) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && { height: 70, textAlignVertical: 'top' }]}
        value={value ? String(value) : ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        multiline={multiline}
      />
    </View>
  );
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'Approved':
      return { backgroundColor: '#10B981' };
    case 'Pending_Review':
      return { backgroundColor: '#F59E0B' };
    case 'Reverted':
      return { backgroundColor: '#E11D48' };
    default:
      return { backgroundColor: '#64748B' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  headerSubTitle: {
    color: '#94A3B8',
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  revertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  revertBannerTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: '#BE123C',
  },
  revertBannerText: {
    fontSize: FontSize.xs,
    color: '#9F1239',
    marginTop: 2,
    lineHeight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.md,
  },
  mutedText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: Spacing.sm,
  },
  formLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  compiledCard: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pdfIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compiledTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compiledDesc: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    marginTop: 2,
  },
  compileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  compileBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  viewPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  viewPdfBtnText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  downloadPdfBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  docSlotCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  docSlotCardUploaded: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  docSlotLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  docSlotDesc: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  docUploadedName: {
    fontSize: FontSize.xs - 1,
    color: '#047857',
    fontWeight: '700',
    marginTop: 4,
  },
  uploadSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  uploadSlotBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  uploadSlotBtnSuccess: {
    backgroundColor: '#059669',
  },
  uploadSlotBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  submitManagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  submitManagerBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  helperNotice: {
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8,
  },
  warningBoxText: {
    fontSize: FontSize.xs,
    color: '#B45309',
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  revertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  revertBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  issuePolicyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  issuePolicyBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  revertModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  revertModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  revertInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    height: 90,
    textAlignVertical: 'top',
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: 4,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelModalBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  confirmRevertBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#E11D48',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  confirmRevertBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
});
