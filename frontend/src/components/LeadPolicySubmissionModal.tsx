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
  Linking,
  StatusBar,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as Print from 'expo-print';
import { decode } from 'base64-arraybuffer';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { api } from '../utils/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { saveFileToDevice } from '../utils/fileSaver';

export const DOCUMENT_CATEGORIES: Record<string, string> = {
  IMP_DATE_SS: 'IMP date Message Screenshot',
  NCB_CONFIRMATION_SS: 'NCB Confirmation Screenshot',
  PAN_CARD: 'Pan Card',
  PREVIOUS_POLICY: 'Previous Policy (If applicable)',
  QUOTATION: 'Quotation',
  RC_BOOK: 'RC book',
  VEHICLE_PHOTO: 'Vehicle Photo for body type'
};

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
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
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
      // 1. Read directly from Supabase leads table (instant, permanent ground truth)
      let submissionData: any = null;
      try {
        const { data: dbLead } = await supabase
          .from('leads')
          .select('customFields, vehicleNo, clientPhone, expiryDate')
          .eq('id', leadId)
          .single();

        if (dbLead?.customFields && typeof dbLead.customFields === 'object') {
          const cf = dbLead.customFields as any;
          if (cf.policySubmission) {
            submissionData = cf.policySubmission;
          }
        }
      } catch (err) {
        console.warn('[Direct Supabase lead load err]', err);
      }

      // 2. Fallback to API endpoint
      if (!submissionData) {
        const res = await api.get(`/leads/${leadId}/policy-submission`);
        if (res?.submission) {
          submissionData = res.submission;
        }
      }

      if (submissionData) {
        setSubmission(submissionData);
        if (submissionData.formData) {
          setFormData((prev: any) => ({
            ...prev,
            ...submissionData.formData,
            regNo: submissionData.formData.regNo || lead?.vehicleNo || lead?.vehicle_number || '',
            mobileNo1: submissionData.formData.mobileNo1 || lead?.clientPhone || lead?.phone || '',
            expDate: submissionData.formData.expDate || (lead?.expiryDate ? new Date(lead.expiryDate).toISOString().split('T')[0] : '')
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
      // Persist directly to Supabase DB
      try {
        const { data: dbLead } = await supabase
          .from('leads')
          .select('customFields')
          .eq('id', leadId)
          .single();

        const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
        const prevSub = cf.policySubmission || { status: 'Draft', documents: [] };
        const updatedSubmission = {
          ...prevSub,
          formData: {
            ...(prevSub.formData || {}),
            ...formData
          },
          updatedAt: new Date().toISOString()
        };

        await supabase
          .from('leads')
          .update({
            customFields: {
              ...cf,
              policySubmission: updatedSubmission
            }
          })
          .eq('id', leadId);
      } catch {}

      try {
        await api.post(`/leads/${leadId}/policy-submission`, { formData });
      } catch {}

      Alert.alert('Saved', 'Policy details draft saved successfully.');
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

  const handleDeleteDoc = async (docId: string, category: string) => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Local update
              setSubmission((prev: any) => {
                const currentDocs = prev?.documents || [];
                const updatedDocs = currentDocs.filter((d: any) => d.id !== docId);
                return {
                  ...prev,
                  documents: updatedDocs,
                  compiledPdfUrl: null,
                  updatedAt: new Date().toISOString()
                };
              });

              // 2. Direct Supabase DB update
              const { data: dbLead } = await supabase
                .from('leads')
                .select('customFields')
                .eq('id', leadId)
                .single();

              const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
              const prevSub = cf.policySubmission || {};
              const existingDocs = prevSub.documents || [];
              const updatedDocs = existingDocs.filter((d: any) => d.id !== docId);

              await supabase
                .from('leads')
                .update({
                  customFields: {
                    ...cf,
                    policySubmission: {
                      ...prevSub,
                      documents: updatedDocs,
                      compiledPdfUrl: null,
                      updatedAt: new Date().toISOString()
                    }
                  }
                })
                .eq('id', leadId);

              // 3. Call backend delete endpoint
              await api.delete(`/leads/${leadId}/policy-submission/upload?docId=${docId}&category=${category}`);

              Alert.alert('Deleted', 'Document removed.');
              if (onUpdated) onUpdated();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete document');
            }
          }
        }
      ]
    );
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

      // If Direct Upload succeeded, record document via Supabase DB and backend endpoint
      if (uploadedPublicUrl) {
        const docEntry = {
          id: `doc_${Date.now()}`,
          category,
          categoryLabel: DOCUMENT_CATEGORIES[category] || category,
          fileName: safeName,
          savedFileName,
          filePath: uploadedPublicUrl,
          storagePath,
          fileType: mimeType,
          uploadedAt: new Date().toISOString()
        };

        const currentDocs = submission?.documents || [];
        const otherDocs = currentDocs.filter((d: any) => d.category !== category);
        const categoryDocs = currentDocs.filter((d: any) => d.category === category);
        if (categoryDocs.length >= 15) {
          Alert.alert('Limit Reached', 'You cannot upload more than 15 documents for this category.');
          setUploadingCategory(null);
          return;
        }

        const updatedDocs = [...otherDocs, ...categoryDocs, docEntry];

        // 1. Immediately update local UI state
        setSubmission((prev: any) => {
          return {
            ...prev,
            documents: updatedDocs,
            compiledPdfUrl: null,
            updatedAt: new Date().toISOString()
          };
        });

        // 2. Persist directly to Supabase DB 'leads' table (INSTANT & 100% PERMANENT)
        try {
          const { data: dbLead } = await supabase
            .from('leads')
            .select('customFields')
            .eq('id', leadId)
            .single();

          const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
          const prevSub = cf.policySubmission || { status: 'Draft', formData: {}, documents: [] };
          const existingDocs = prevSub.documents || [];
          const otherDocsDb = existingDocs.filter((d: any) => d.category !== category);
          const categoryDocsDb = existingDocs.filter((d: any) => d.category === category);
          const updatedDocsDb = [...otherDocsDb, ...categoryDocsDb, docEntry];

          const updatedSubmission = {
            ...prevSub,
            documents: updatedDocsDb,
            compiledPdfUrl: null,
            updatedAt: new Date().toISOString()
          };

          await supabase
            .from('leads')
            .update({
              customFields: {
                ...cf,
                policySubmission: updatedSubmission
              }
            })
            .eq('id', leadId);
        } catch (dbErr) {
          console.warn('[Direct Supabase leads document save error]', dbErr);
        }

        // 3. Sync with backend API
        try {
          await api.post(`/leads/${leadId}/policy-submission`, {
            document: docEntry
          });
        } catch {}

        Alert.alert('Upload Successful! ✓', `${DOCUMENT_CATEGORIES[category] || category} uploaded.`);
        if (onUpdated) onUpdated();
        setUploadingCategory(null);
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
      const docsToCompile = submission?.documents || [];
      if (docsToCompile.length === 0) {
        Alert.alert('No Documents', 'Please upload at least one document before compiling.');
        return;
      }

      let finalPdfUrl: string | null = null;
      let compilationErrorMsg = '';

      // Strategy 1: Instant On-Device PDF Compilation (Inlined Base64 Images)
      try {
        const clientName = lead?.clientName || lead?.name || 'Customer';
        const regNumber = formData?.regNo || lead?.vehicleNo || lead?.vehicle_number || 'N/A';
        const phoneNum = formData?.mobileNo1 || lead?.clientPhone || lead?.phone || 'N/A';

        // Prepare inlined HTML pages for all documents
        const docPagesHtml = await Promise.all(
          docsToCompile.map(async (doc: any, i: number) => {
            let imgSrc = doc.filePath;
            const isPdf = (doc.filePath && typeof doc.filePath === 'string' && doc.filePath.toLowerCase().endsWith('.pdf')) || doc.fileType === 'application/pdf';

            if (isPdf) {
              return `
                <div class="page-break">
                  <div class="doc-banner">
                    <span>Document ${i + 1} of ${docsToCompile.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
                  </div>
                  <div class="doc-container" style="padding: 40px 20px;">
                    <p style="font-size: 16px; font-weight: bold; color: #0f172a;">Attached PDF Document: ${doc.fileName}</p>
                    <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Direct Link: <a href="${doc.filePath}" target="_blank" style="color: #0284c7;">${doc.filePath}</a></p>
                  </div>
                </div>
              `;
            }

            // If image, download to cache and convert to base64 for 100% guaranteed offline rendering
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
              <div class="page-break">
                <div class="doc-banner">
                  <span>Document ${i + 1} of ${docsToCompile.length}: ${doc.categoryLabel || DOCUMENT_CATEGORIES[doc.category] || doc.category}</span>
                </div>
                <div class="doc-container">
                  <img class="doc-img" src="${imgSrc}" />
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
                .page-break { page-break-before: always; padding-top: 16px; }
                .doc-banner { background: #0284c7; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 14px; font-weight: 800; margin-bottom: 12px; }
                .doc-container { text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fafafa; }
                .doc-img { max-width: 100%; max-height: 750px; object-fit: contain; border-radius: 6px; }
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
                <div class="col"><div class="box"><div class="lbl">Insurance Company</div><div class="val">${formData?.insCompany || 'N/A'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">Payment Mode</div><div class="val">${formData?.paymentMode || 'N/A'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">GVW / Cubic Capacity</div><div class="val">${formData?.gvwCc || 'N/A'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">No Claim Bonus (NCB %)</div><div class="val">${formData?.ncbPercent || '0'}%</div></div></div>
                <div class="col"><div class="box"><div class="lbl">Net Premium</div><div class="val">₹${formData?.netPremium || '0'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">Final Gross Premium</div><div class="val">₹${formData?.finalGrossPremium || '0'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">Policy Expiry Date</div><div class="val">${formData?.expDate || 'N/A'}</div></div></div>
                <div class="col"><div class="box"><div class="lbl">Hypothecation Bank</div><div class="val">${formData?.hypothecation || 'None'}</div></div></div>
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
          const pdfStoragePath = `lead-documents/${leadId}/compiled_single_policy_${Date.now()}.pdf`;

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
            finalPdfUrl = publicUrl;
          } else if (uploadErr) {
            compilationErrorMsg = uploadErr.message;
          }
        }
      } catch (localCompileErr: any) {
        console.warn('[Local compile failed, trying backend]', localCompileErr);
        compilationErrorMsg = localCompileErr?.message || 'Local print error';
      }

      // Strategy 2: Backend Compile-PDF endpoint fallback
      if (!finalPdfUrl) {
        try {
          const res = await api.post(`/leads/${leadId}/policy-submission/compile-pdf`, {
            documents: docsToCompile,
            formData: formData || submission?.formData || {}
          });
          if (res?.compiledPdfUrl) {
            finalPdfUrl = res.compiledPdfUrl;
          }
        } catch (apiErr: any) {
          if (!compilationErrorMsg) compilationErrorMsg = apiErr?.message;
        }
      }

      if (finalPdfUrl) {
        // Update local state immediately
        setSubmission((prev: any) => ({
          ...prev,
          compiledPdfUrl: finalPdfUrl
        }));

        // Persist directly to Supabase DB 'leads' table
        try {
          const { data: dbLead } = await supabase
            .from('leads')
            .select('customFields')
            .eq('id', leadId)
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
                  documents: docsToCompile,
                  compiledPdfUrl: finalPdfUrl,
                  updatedAt: new Date().toISOString()
                }
              }
            })
            .eq('id', leadId);
        } catch (dbErr) {
          console.warn('[Direct compile-pdf save err]', dbErr);
        }

        Alert.alert('Single PDF Compiled! ✓', 'All documents and policy details have been consolidated into a single master PDF.');
      } else {
        throw new Error(compilationErrorMsg || 'Could not generate PDF');
      }

      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error('[compile pdf error]', err);
      Alert.alert('PDF Compilation Failed', err.message || 'Could not compile PDF');
    } finally {
      setCompiling(false);
    }
  };

  const handleSubmitToManager = async () => {
    const docs = submission?.documents || [];
    if (docs.length === 0) {
      Alert.alert('Documents Required', 'A sales person cannot submit to manager without uploading the required documents. Please upload the documents first.');
      return;
    }

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
              const pdfUrl = submission?.compiledPdfUrl;

              // 1. Resolve manager name
              let managerName = lead?.assignee?.manager?.fullName || 'Operations Manager';
              try {
                if (!lead?.assignee?.manager?.fullName) {
                  const { data: mUsers } = await supabase
                    .from('users')
                    .select('fullName, role:roles(name)')
                    .eq('isActive', true)
                    .limit(10);
                  const m = mUsers?.find((u: any) => u.role?.name?.toLowerCase().includes('manager'));
                  if (m?.fullName) managerName = m.fullName;
                }
              } catch {}

              // 2. Persist Pending_Review status directly to Supabase DB
              try {
                const { data: dbLead } = await supabase
                  .from('leads')
                  .select('customFields')
                  .eq('id', leadId)
                  .single();

                const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
                const prevSub = cf.policySubmission || {};

                const updatedSubmission = {
                  ...prevSub,
                  documents: docs.length > 0 ? docs : (prevSub.documents || []),
                  formData: formData && Object.keys(formData).length > 0 ? formData : (prevSub.formData || {}),
                  compiledPdfUrl: pdfUrl || prevSub.compiledPdfUrl,
                  status: 'Pending_Review',
                  managerName,
                  salesPersonName: user?.full_name || (user as any)?.fullName || 'Sales Executive',
                  submittedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  history: [
                    ...(prevSub.history || []),
                    {
                      action: 'SUBMITTED',
                      by: user?.full_name || (user as any)?.fullName || 'Sales Executive',
                      userId: user?.id,
                      timestamp: new Date().toISOString(),
                      notes: `Submitted policy document bundle to manager (${managerName}) for review`
                    }
                  ]
                };

                await supabase
                  .from('leads')
                  .update({
                    customFields: {
                      ...cf,
                      policySubmission: updatedSubmission
                    }
                  })
                  .eq('id', leadId);
              } catch (dbErr) {
                console.warn('[Direct DB submit err]', dbErr);
              }

              // 3. Call backend endpoint with compiledPdfUrl in payload
              try {
                await api.post(`/leads/${leadId}/policy-submission/submit`, {
                  compiledPdfUrl: pdfUrl
                });
              } catch (apiErr) {
                console.warn('[Submit API sync error]', apiErr);
              }

              setSubmission((prev: any) => ({
                ...prev,
                status: 'Pending_Review',
                managerName,
                submittedAt: new Date().toISOString()
              }));

              Alert.alert('Submitted Successfully! ✓', `Policy documents and details have been submitted to ${managerName} for verification.`);
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
              // 1. Direct Supabase DB update
              try {
                const { data: dbLead } = await supabase
                  .from('leads')
                  .select('customFields')
                  .eq('id', leadId)
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
                        reviewedBy: user?.full_name || (user as any)?.fullName || 'Manager',
                        updatedAt: new Date().toISOString(),
                        history: [
                          ...(prevSub.history || []),
                          {
                            action: 'APPROVED',
                            by: user?.full_name || (user as any)?.fullName || 'Manager',
                            userId: user?.id,
                            timestamp: new Date().toISOString(),
                            notes: 'Approved by Manager on mobile app'
                          }
                        ]
                      }
                    }
                  })
                  .eq('id', leadId);
              } catch {}

              // 2. Call backend endpoint
              try {
                await api.post('/manager/submissions', {
                  leadId,
                  action: 'APPROVE',
                  notes: 'Approved by Manager on mobile app'
                });
              } catch {}

              setSubmission((prev: any) => ({
                ...prev,
                status: 'Approved',
                reviewedAt: new Date().toISOString(),
                reviewedBy: user?.full_name || (user as any)?.fullName || 'Manager'
              }));

              Alert.alert('Approved ✓', 'Policy documents approved.');
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
      const reason = revertReason.trim();

      // 1. Direct Supabase DB update
      try {
        const { data: dbLead } = await supabase
          .from('leads')
          .select('customFields')
          .eq('id', leadId)
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
                reviewedBy: user?.full_name || (user as any)?.fullName || 'Manager',
                updatedAt: new Date().toISOString(),
                history: [
                  ...(prevSub.history || []),
                  {
                    action: 'REVERTED',
                    by: user?.full_name || (user as any)?.fullName || 'Manager',
                    userId: user?.id,
                    timestamp: new Date().toISOString(),
                    notes: reason
                  }
                ]
              }
            }
          })
          .eq('id', leadId);
      } catch {}

      // 2. Call backend endpoint
      try {
        await api.post('/manager/submissions', {
          leadId,
          action: 'REVERT',
          notes: reason
        });
      } catch {}

      setShowRevertModal(false);
      setRevertReason('');
      setSubmission((prev: any) => ({
        ...prev,
        status: 'Reverted',
        revertReason: reason,
        reviewedAt: new Date().toISOString()
      }));

      Alert.alert('Reverted', 'Submission has been reverted to Sales Person with notes.');
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
      const policyNumber = policyNoInput.trim();
      const provider = providerInput.trim() || 'Go Digit';
      const premium = parseFloat(premiumInput) || 0;

      // 1. Direct Supabase DB update (mark policySubmission as Issued and lead as Won)
      try {
        const { data: dbLead } = await supabase
          .from('leads')
          .select('customFields')
          .eq('id', leadId)
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
                issuedPolicyNumber: policyNumber,
                issuedProvider: provider,
                issuedPremium: premium,
                issuedAt: new Date().toISOString(),
                issuedBy: user?.full_name || (user as any)?.fullName || 'Manager',
                updatedAt: new Date().toISOString(),
                history: [
                  ...(prevSub.history || []),
                  {
                    action: 'POLICY_ISSUED',
                    by: user?.full_name || (user as any)?.fullName || 'Manager',
                    userId: user?.id,
                    timestamp: new Date().toISOString(),
                    notes: `Policy #${policyNumber} issued (${provider}, ₹${premium})`
                  }
                ]
              }
            }
          })
          .eq('id', leadId);
      } catch {}

      // 2. Call backend endpoint
      try {
        await api.post('/manager/submissions', {
          leadId,
          action: 'ISSUE_POLICY',
          policyData: {
            policyNumber,
            provider,
            premiumAmount: premium,
            type: formData.policyType || 'Comprehensive'
          }
        });
      } catch {}

      setSubmission((prev: any) => ({
        ...prev,
        status: 'Issued',
        issuedPolicyNumber: policyNumber
      }));

      Alert.alert('Policy Issued Successfully! 🎉', 'Active policy created and synced with master monthly sheet.');
      setPolicyNoInput('');
      setPremiumInput('');
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

      await saveFileToDevice(localUri, filename, 'application/pdf');
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

        {/* Under Review Banner */}
        {status === 'Pending_Review' && (
          <View style={{
            backgroundColor: '#FFFBEB',
            borderBottomWidth: 1,
            borderBottomColor: '#FDE68A',
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons name="time" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>
                UNDER MANAGER REVIEW
              </Text>
              <Text style={{ fontSize: 11, color: '#78350F', marginTop: 1 }}>
                Submitted to: <Text style={{ fontWeight: '700' }}>{submission?.managerName || lead?.assignee?.manager?.fullName || 'Assigned Manager'}</Text>
                {submission?.submittedAt ? ` • ${new Date(submission.submittedAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Policy Issued Banner */}
        {(status === 'Policy_Issued' || status === 'Issued') && (
          <View style={{
            backgroundColor: '#ECFDF5',
            borderBottomWidth: 1,
            borderBottomColor: '#A7F3D0',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 6
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                    POLICY ISSUED & ACTIVE
                  </Text>
                  <Text style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                    #{submission?.issuedPolicyNumber || submission?.formData?.policyNumber || 'Active'} • {submission?.issuedProvider || submission?.formData?.provider || 'Torque'}
                  </Text>
                </View>
              </View>

              {/* View Issued PDF Button */}
              {submission?.issuedPolicyPdfUrl && (isManagerOrAdmin || submission?.visibleToSalesPerson !== false) && (
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#059669',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6
                  }}
                  onPress={() => previewPdf(submission.issuedPolicyPdfUrl)}
                >
                  <Ionicons name="document-text" size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>View Policy PDF</Text>
                </Pressable>
              )}
            </View>

            {/* Sales Person Access Notice if restricted */}
            {!isManagerOrAdmin && submission?.visibleToSalesPerson === false && (
              <View style={{ backgroundColor: '#FEF2F2', padding: 6, borderRadius: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#B91C1C' }}>
                  🔒 Official document viewing restricted by manager. Contact your manager if access is required.
                </Text>
              </View>
            )}

            {/* Manager Visibility Toggle */}
            {isManagerOrAdmin && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#D1FAE5',
                marginTop: 2
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>
                  Allow Sales Person to view policy PDF:
                </Text>
                <Switch
                  value={submission?.visibleToSalesPerson !== false}
                  onValueChange={async (val) => {
                    setSubmission((prev: any) => ({ ...prev, visibleToSalesPerson: val }));
                    try {
                      await api.post('/manager/submissions', {
                        leadId,
                        action: 'TOGGLE_VISIBILITY',
                        visibleToSalesPerson: val
                      });
                      const { data: dbLead } = await supabase
                        .from('leads')
                        .select('customFields')
                        .eq('id', leadId)
                        .single();
                      const cf = (dbLead?.customFields && typeof dbLead.customFields === 'object') ? (dbLead.customFields as any) : {};
                      const sub = cf.policySubmission || {};
                      await supabase
                        .from('leads')
                        .update({
                          customFields: {
                            ...cf,
                            policySubmission: { ...sub, visibleToSalesPerson: val, updatedAt: new Date().toISOString() }
                          }
                        })
                        .eq('id', leadId);
                    } catch {}
                  }}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            {/* Manager Revert to Sales Agent Banner */}
            {isManagerOrAdmin ? (
              <View style={{
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#BFDBFE',
                borderRadius: 6,
                padding: 8,
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="information-circle" size={16} color="#1D4ED8" />
                  <Text style={{ fontSize: 11, color: '#1E40AF', flex: 1 }}>
                    Need any document re-uploaded or modified? You may revert this lead back to the assigned sales agent.
                  </Text>
                </View>
                <Pressable
                  style={{
                    backgroundColor: '#DC2626',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onPress={() => setShowRevertModal(true)}
                >
                  <Ionicons name="arrow-undo" size={13} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Revert</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 6,
                padding: 8,
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}>
                <Ionicons name="lock-closed" size={14} color="#64748B" />
                <Text style={{ fontSize: 11, color: '#475569', flex: 1 }}>
                  Policy data and documents are verified & approved. If any re-upload is required, please ask your manager to revert this lead back to you.
                </Text>
              </View>
            )}
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
                  
                  <FormField label="Registration No (Reg No)" value={formData.regNo} onChange={(v: string) => handleFieldChange('regNo', v)} placeholder="e.g. GJ18AV5577" />
                  <FormField label="Policy Type" value={formData.policyType} onChange={(v: string) => handleFieldChange('policyType', v)} placeholder="e.g. nil dep, comprehensive, TP" />
                  <FormField label="Customer Type" value={formData.customerType} onChange={(v: string) => handleFieldChange('customerType', v)} placeholder="existing / new" />
                  <FormField label="Customer Category" value={formData.customerCategory} onChange={(v: string) => handleFieldChange('customerCategory', v)} placeholder="MVC, GCV, PCV, etc." />
                  <FormField label="Expiry Date" value={formData.expDate} onChange={(v: string) => handleFieldChange('expDate', v)} placeholder="YYYY-MM-DD" />
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Contact & Commercials</Text>
                  
                  <FormField label="Mobile No 1" value={formData.mobileNo1} onChange={(v: string) => handleFieldChange('mobileNo1', v)} placeholder="Primary Mobile" />
                  <FormField label="Mobile No 2" value={formData.mobileNo2} onChange={(v: string) => handleFieldChange('mobileNo2', v)} placeholder="Secondary Mobile" />
                  <FormField label="Approved Rate / Quotation" value={formData.rate} onChange={(v: string) => handleFieldChange('rate', v)} placeholder="e.g. 18500" />
                  <FormField label="Rs From Customer (Amount Paid)" value={formData.rsFromCustomer} onChange={(v: string) => handleFieldChange('rsFromCustomer', v)} placeholder="e.g. 18500" />
                  <FormField label="Payment Mode" value={formData.paymentMode} onChange={(v: string) => handleFieldChange('paymentMode', v)} placeholder="cash / gpay / bank" />
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Confirmations & Verifications</Text>
                  
                  <FormField label="NCB" value={formData.ncb} onChange={(v: string) => handleFieldChange('ncb', v)} placeholder="with ncb / without ncb" />
                  <FormField label="NCB Confirmation Screenshot" value={formData.ncbConfirmation} onChange={(v: string) => handleFieldChange('ncbConfirmation', v)} placeholder="Yes / No" />
                  <FormField label="IMP Date Message SS" value={formData.impDateMsgSS} onChange={(v: string) => handleFieldChange('impDateMsgSS', v)} placeholder="Yes / No" />
                  <FormField label="Rate Confirmation SS" value={formData.rateConfirmationSS} onChange={(v: string) => handleFieldChange('rateConfirmationSS', v)} placeholder="YES / NO" />
                  <FormField label="HP Details (Hypothecation)" value={formData.hpDetails} onChange={(v: string) => handleFieldChange('hpDetails', v)} placeholder="as per rc / bank name" />
                  <FormField label="Vehicle Photo" value={formData.vehiclePhoto} onChange={(v: string) => handleFieldChange('vehiclePhoto', v)} placeholder="available / n.a." />
                  <FormField label="Body Type Matched" value={formData.bodyTypeMatched} onChange={(v: string) => handleFieldChange('bodyTypeMatched', v)} placeholder="matched / n.a." />
                  <FormField label="Inspection Status" value={formData.inspectionStatus} onChange={(v: string) => handleFieldChange('inspectionStatus', v)} placeholder="Not Required / Done" />
                  <FormField label="Description / Remarks" value={formData.description} onChange={(v: string) => handleFieldChange('description', v)} placeholder="Special notes..." multiline />
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

                  <View style={styles.compiledBtnRow}>
                    <Pressable
                      style={[styles.compileBtn, compiling && { opacity: 0.7 }]}
                      onPress={handleCompilePdf}
                      disabled={compiling || docsCount === 0}
                    >
                      {compiling ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.compileBtnText}>{compiling ? 'Compiling Single PDF...' : 'Convert to Single PDF'}</Text>
                    </Pressable>

                    {submission?.compiledPdfUrl && (
                      <View style={styles.pdfActionSubRow}>
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
                      </View>
                    )}
                  </View>
                </View>

                {/* 7 Required Documents Slots */}
                <Text style={styles.sectionHeaderTitle}>Upload 7 Required Documents</Text>

                {REQUIRED_DOCUMENTS.map((reqDoc, idx) => {
                  const attachedFiles = (submission?.documents || []).filter((d: any) => d.category === reqDoc.key);
                  const isUploadingThis = uploadingCategory === reqDoc.key;

                  return (
                    <View key={reqDoc.key} style={[styles.docSlotCard, attachedFiles.length > 0 && styles.docSlotCardUploaded]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: attachedFiles.length > 0 ? 8 : 0 }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.docSlotLabel}>{reqDoc.label}</Text>
                          <Text style={styles.docSlotDesc}>{reqDoc.desc}</Text>
                        </View>

                        {attachedFiles.length < 15 && (
                          <Pressable
                            style={[styles.uploadSlotBtn, styles.uploadSlotBtnPrimary]}
                            onPress={() => handlePickDocument(reqDoc.key)}
                            disabled={isUploadingThis}
                          >
                            {isUploadingThis ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.uploadSlotBtnText}>
                                  {attachedFiles.length > 0 ? 'Add File' : 'Upload'}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>

                      {attachedFiles.length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4, gap: 6 }}>
                          {attachedFiles.map((uploaded: any, uIdx: number) => (
                            <View key={uploaded.id || uIdx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                                <Ionicons name="document-text" size={16} color="#059669" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', flex: 1 }} numberOfLines={1}>
                                  {uploaded.fileName || `${reqDoc.key}_${uIdx + 1}.jpg`}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                <Pressable
                                  style={{ padding: 6, backgroundColor: '#E0F2FE', borderRadius: 6 }}
                                  onPress={() => previewPdf(uploaded.filePath)}
                                >
                                  <Ionicons name="eye-outline" size={14} color="#0369A1" />
                                </Pressable>
                                <Pressable
                                  style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 }}
                                  onPress={() => handleDeleteDoc(uploaded.id, reqDoc.key)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#B91C1C" />
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
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
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ? StatusBar.currentHeight + 14 : 40),
    paddingBottom: Spacing.md + 2,
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
  compiledBtnRow: {
    marginTop: 14,
    gap: 8,
  },
  compileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  compileBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  pdfActionSubRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewPdfBtnText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  downloadPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
  },
  downloadPdfBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '800',
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
  uploadedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  previewSmallBtn: {
    backgroundColor: '#E0F2FE',
    padding: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  docUploadedName: {
    fontSize: FontSize.xs - 1,
    color: '#047857',
    fontWeight: '700',
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
