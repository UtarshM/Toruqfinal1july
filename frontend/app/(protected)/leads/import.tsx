import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/utils/theme';
import Sidebar from '../../../src/components/Sidebar';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'expo-router';

import { BASE_URL } from '../../../src/utils/api';

interface ColumnMapping {
  dbField: string;
  label: string;
  required: boolean;
  mappedHeader: string;
}

interface HeaderDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedValue: string;
  onSelect: (val: string) => void;
  required?: boolean;
  onDelete?: () => void;
  onRename?: () => void;
}

function HeaderDropdownSelector({ label, placeholder, options, selectedValue, onSelect, required = false, onDelete, onRename }: HeaderDropdownProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.selectRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={styles.selectLabel}>{label} {required && '*'}</Text>
        {!required && (onDelete || onRename) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {onRename && (
              <Pressable onPress={onRename} style={{ padding: 4 }}>
                <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable onPress={onDelete} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={14} color={Colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>
      <Pressable style={styles.dropdownTrigger} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownTriggerText, !selectedValue && styles.placeholderText]}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList}>
              {!required && (
                <Pressable
                  style={[styles.optionItem, !selectedValue && styles.optionItemActive]}
                  onPress={() => {
                    onSelect('');
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, !selectedValue && styles.optionTextActive]}>(None / Not Mapped)</Text>
                </Pressable>
              )}
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.optionItem, opt === selectedValue && styles.optionItemActive]}
                  onPress={() => {
                    onSelect(opt);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, opt === selectedValue && styles.optionTextActive]}>{opt}</Text>
                  {opt === selectedValue && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function LeadImportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || '';
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || roleUpper === 'ADMIN';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [importName, setImportName] = useState('');

  if (user && !isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <View style={styles.header}>
          <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
            <Ionicons name="menu-outline" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Import Leads</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="lock-closed-outline" size={64} color={Colors.error} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 }}>
            Only administrators are authorized to import leads into the system.
          </Text>
          <Pressable 
            style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} 
            onPress={() => router.replace('/(protected)/dashboard')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Mapping UI states
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [parsingHeaders, setParsingHeaders] = useState(false);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  
  // Custom Field adding/editing states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [selectedSheetHeader, setSelectedSheetHeader] = useState('');
  const [renameFieldModalVisible, setRenameFieldModalVisible] = useState(false);
  const [renameTargetFieldKey, setRenameTargetFieldKey] = useState<string | null>(null);
  const [renameFieldLabel, setRenameFieldLabel] = useState('');
  const [showMappingForm, setShowMappingForm] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [importedList, setImportedList] = useState<any[]>([]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
          Alert.alert('Unsupported Format', 'Please upload a CSV or Excel (.xlsx/.xls) file.');
          return;
        }

        setSelectedFile(file);
        setResults(null);
        setImportedList([]);
        setShowMappingForm(false);
        setFileHeaders([]);
        
        // Proactively parse headers
        parseFileHeaders(file);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const parseFileHeaders = async (file: DocumentPicker.DocumentPickerAsset) => {
    setParsingHeaders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      const response = await fetch(`${BASE_URL}/api/v1/leads/import/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file headers');
      }

      setFileHeaders(data.headers || []);
      
      // Auto-fuzzy match headers
      const defaultMappings: ColumnMapping[] = [
        { dbField: 'clientName', label: 'Owner Name', required: true, mappedHeader: '' },
        { dbField: 'clientPhone', label: 'Contact Phone', required: true, mappedHeader: '' },
        { dbField: 'vehicleNo', label: 'Vehicle Number', required: true, mappedHeader: '' },
        { dbField: 'expiryDate', label: 'Expiry Date', required: true, mappedHeader: '' },
        { dbField: 'clientEmail', label: 'Email Address', required: false, mappedHeader: '' },
        { dbField: 'registrationDate', label: 'Registration Date', required: false, mappedHeader: '' },
        { dbField: 'gvw', label: 'GVW', required: false, mappedHeader: '' },
        { dbField: 'address', label: 'Address', required: false, mappedHeader: '' },
        { dbField: 'city', label: 'City', required: false, mappedHeader: '' }
      ];

      const updatedMappings = defaultMappings.map(field => {
        const match = (data.headers || []).find((h: string) => {
          const header = h.toLowerCase().trim().replace(/[\s\.\-_]/g, '');
          if (field.dbField === 'clientName') return ['ownername', 'name', 'clientname', 'partyname', 'insuredname', 'insured'].includes(header);
          if (field.dbField === 'clientPhone') return ['phonenumber', 'contactnumber', 'phone', 'contact', 'mobile', 'mobileno', 'phoneno'].includes(header);
          if (field.dbField === 'vehicleNo') return ['vehiclenumber', 'vehicleno', 'vehicle', 'regno', 'registrationno'].includes(header);
          if (field.dbField === 'clientEmail') return ['email', 'clientemail', 'emailid'].includes(header);
          if (field.dbField === 'expiryDate') return ['expirydate', 'expiry', 'insuranceexpirydate', 'duedate'].includes(header);
          if (field.dbField === 'registrationDate') return ['registrationdate', 'regdate'].includes(header);
          if (field.dbField === 'gvw') return ['gvw', 'grossweight', 'grossvehicleweight', 'weight'].includes(header);
          if (field.dbField === 'address') return ['address', 'location'].includes(header);
          if (field.dbField === 'city') return ['city', 'state'].includes(header);
          return false;
        });
        return { ...field, mappedHeader: match || '' };
      });

      setMappings(updatedMappings);
      setShowMappingForm(true);

    } catch (err: any) {
      Alert.alert('Header Parsing Failed', err.message || 'Could not parse headers of the file.');
      setSelectedFile(null);
    } finally {
      setParsingHeaders(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first.');
      return;
    }
    if (!importName.trim()) {
      Alert.alert('Error', 'Please enter a sheet/import name first.');
      return;
    }
    
    const missingRequired = mappings.filter(m => m.required && !m.mappedHeader);
    if (missingRequired.length > 0) {
      const labels = missingRequired.map(m => m.label).join(', ');
      Alert.alert('Error', `Please map all required fields: ${labels}`);
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any);
      formData.append('importName', importName.trim());
      
      const cleanMapping: Record<string, string> = {};
      mappings.forEach(m => {
        if (m.mappedHeader) {
          cleanMapping[m.dbField] = m.mappedHeader;
        }
      });

      formData.append('mapping', JSON.stringify(cleanMapping));

      const response = await fetch(`${BASE_URL}/api/v1/leads/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      setResults(data.stats);
      setImportedList(data.importedLeads || []);
      setSelectedFile(null);
      setImportName('');
      setShowMappingForm(false);

      const successMsg = 'Leads imported successfully! You can now view and assign them to Sales Executives from the Spreadsheets section.';
      Alert.alert('Import Completed 🎉', successMsg);
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'An error occurred.');
    } finally {
      setUploading(false);
    }
  };

  const updateMapping = (dbField: string, val: string) => {
    setMappings(prev =>
      prev.map(m => (m.dbField === dbField ? { ...m, mappedHeader: val } : m))
    );
  };

  const handleDeleteField = (dbField: string) => {
    setMappings(prev => prev.filter(m => m.dbField !== dbField));
  };

  const handleEditField = (dbField: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setMappings(prev =>
      prev.map(m => (m.dbField === dbField ? { ...m, label: newLabel.trim() } : m))
    );
  };

  const handlePromptRenameField = (dbField: string, currentLabel: string) => {
    setRenameTargetFieldKey(dbField);
    setRenameFieldLabel(currentLabel);
    setRenameFieldModalVisible(true);
  };

  const addMapping = () => {
    const label = newColLabel.trim() || selectedSheetHeader;
    if (!label) {
      Alert.alert('Error', 'Please enter a column label or select a sheet header.');
      return;
    }

    const sanitizeFieldKey = (lbl: string): string => {
      return lbl
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
    };

    const key = sanitizeFieldKey(label) || 'customCol';
    let finalDbField = key;
    let counter = 1;
    while (mappings.some(m => m.dbField === finalDbField)) {
      finalDbField = `${key}_${counter++}`;
    }

    const newField: ColumnMapping = {
      dbField: finalDbField,
      label,
      required: false,
      mappedHeader: selectedSheetHeader || ''
    };

    setMappings(prev => [...prev, newField]);
    setShowAddForm(false);
    setNewColLabel('');
    setSelectedSheetHeader('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Ionicons name="cloud-upload-outline" size={56} color={Colors.primary} style={styles.uploadIcon} />
          <Text style={styles.cardTitle}>Upload CSV or Excel File</Text>
          <Text style={styles.cardSubtitle}>
            Select a sheet to automatically import leads. You can view and assign them from the Spreadsheets section.
          </Text>

          <Text style={styles.inputLabel}>SHEET / IMPORT BATCH NAME *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Lead Campaign Jan 2026"
            placeholderTextColor={Colors.textLight}
            value={importName}
            onChangeText={setImportName}
          />

          <Pressable 
            style={({ pressed }) => [styles.pickBtn, pressed && styles.btnPressed]} 
            onPress={handlePickFile}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.pickBtnText}>Choose File</Text>
          </Pressable>

          {parsingHeaders && (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loaderText}>Parsing sheet columns...</Text>
            </View>
          )}

          {selectedFile && !parsingHeaders && (
            <View style={styles.fileDetails}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
            </View>
          )}
        </View>

        {/* Column Mapping Section */}
        {showMappingForm && fileHeaders.length > 0 && (
          <View style={styles.mappingCard}>
            <Text style={styles.mappingTitle}>Map Sheet Columns</Text>
            
            {/* Required Fields */}
            {mappings.filter(m => m.required).map((item) => (
              <HeaderDropdownSelector
                key={item.dbField}
                label={item.label}
                placeholder={`Choose ${item.label} Column`}
                options={fileHeaders}
                selectedValue={item.mappedHeader}
                onSelect={(val) => updateMapping(item.dbField, val)}
                required
              />
            ))}

            {/* Optional & Custom Fields */}
            <Text style={styles.optionalDivider}>Optional & Custom Column Mappings</Text>

            {mappings.filter(m => !m.required).map((item) => (
              <HeaderDropdownSelector
                key={item.dbField}
                label={item.label}
                placeholder={`Choose ${item.label} Column`}
                options={fileHeaders}
                selectedValue={item.mappedHeader}
                onSelect={(val) => updateMapping(item.dbField, val)}
                onDelete={() => handleDeleteField(item.dbField)}
                onRename={() => handlePromptRenameField(item.dbField, item.label)}
              />
            ))}

            {/* Add Custom Field Button */}
            <Pressable
              style={styles.addCustomFieldBtn}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.addCustomFieldBtnText}>Add Custom Field</Text>
            </Pressable>

            <Pressable 
              style={[styles.uploadBtn, uploading && styles.disabledBtn]} 
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
                  <Text style={styles.uploadBtnText}>Upload Leads</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Results Info */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Import Summary</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={[styles.statVal, { color: Colors.text }]}>{results.total}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Imported</Text>
                <Text style={[styles.statVal, { color: Colors.success }]}>{results.assignedCount || results.valid || 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Duplicates</Text>
                <Text style={[styles.statVal, { color: Colors.warning }]}>{results.duplicates}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Errors</Text>
                <Text style={[styles.statVal, { color: Colors.error }]}>{results.errors}</Text>
              </View>
            </View>

            {importedList.length > 0 && (
              <View style={{ marginTop: Spacing.lg }}>
                <Text style={styles.assignmentsHeading}>Leads Breakdown</Text>
                <View style={styles.assignmentsList}>
                  {importedList.map((lead, idx) => (
                    <View key={idx} style={styles.assignmentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leadNameVal}>{lead.clientName}</Text>
                        <Text style={styles.leadPlateVal}>{lead.vehicleNo}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Custom Mapping Modal */}
      <Modal
        visible={showAddForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Add Custom Mapping</Text>
              <Pressable onPress={() => setShowAddForm(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ padding: Spacing.md }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>CUSTOM COLUMN LABEL *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Model, Engine Number, Chasis No"
                placeholderTextColor={Colors.textLight}
                value={newColLabel}
                onChangeText={setNewColLabel}
              />

              <Text style={styles.inputLabel}>MAPPED SPREADSHEET HEADER (OPTIONAL)</Text>
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, marginBottom: Spacing.lg }}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  <Pressable
                    style={[styles.headerOption, !selectedSheetHeader && styles.headerOptionActive]}
                    onPress={() => setSelectedSheetHeader('')}
                  >
                    <Text style={[styles.headerOptionText, !selectedSheetHeader && styles.headerOptionTextActive]}>(None / Select Later)</Text>
                  </Pressable>
                  {fileHeaders.map(h => (
                    <Pressable
                      key={h}
                      style={[styles.headerOption, h === selectedSheetHeader && styles.headerOptionActive]}
                      onPress={() => setSelectedSheetHeader(h)}
                    >
                      <Text style={[styles.headerOptionText, h === selectedSheetHeader && styles.headerOptionTextActive]}>{h}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Pressable style={styles.addMappingSubmitBtn} onPress={addMapping}>
                <Text style={styles.addMappingSubmitBtnText}>Add Field Mapping</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Field Modal */}
      <Modal
        visible={renameFieldModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameFieldModalVisible(false)}
      >
        <View style={styles.renameBackdrop}>
          <View style={styles.renameContainer}>
            <Text style={styles.renameTitle}>Rename Column Field</Text>
            <Text style={styles.renameSubtitle}>Enter new display name for this mapping column:</Text>
            <TextInput
              style={styles.renameInput}
              value={renameFieldLabel}
              onChangeText={setRenameFieldLabel}
              placeholder="e.g. Policy Number"
              placeholderTextColor={Colors.textLight}
              autoFocus
            />
            <View style={styles.renameActions}>
              <Pressable
                style={styles.renameCancelBtn}
                onPress={() => setRenameFieldModalVisible(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.renameConfirmBtn}
                onPress={() => {
                  if (renameTargetFieldKey) {
                    handleEditField(renameTargetFieldKey, renameFieldLabel);
                    setRenameFieldModalVisible(false);
                  }
                }}
              >
                <Text style={styles.renameConfirmText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md, backgroundColor: '#FFFFFF' },
  menuBtn: { padding: Spacing.xs },
  title: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  uploadIcon: { marginBottom: Spacing.md, alignSelf: 'center' },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs, textAlign: 'center' },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  inputLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, height: 48, fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.lg, width: '100%' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, width: '100%' },
  btnPressed: { opacity: 0.8 },
  pickBtnText: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.md },
  fileDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', justifyContent: 'center' },
  fileName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md, justifyContent: 'center' },
  loaderText: { fontSize: FontSize.sm, color: Colors.textMuted },
  mappingCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  mappingTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  selectRow: { flexDirection: 'column', gap: 6, marginBottom: Spacing.md },
  selectLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  pickerWrapper: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  mappingInput: { paddingHorizontal: Spacing.md, height: 44, fontSize: FontSize.sm, color: Colors.text, backgroundColor: Colors.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  optionalDivider: { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginVertical: Spacing.md },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, width: '100%', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  uploadBtnText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md },
  disabledBtn: { opacity: 0.6 },
  resultsCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  resultsTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: FontSize.md, fontWeight: '900' },
  assignmentsHeading: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginVertical: Spacing.md },
  assignmentsList: { gap: Spacing.xs },
  assignmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: BorderRadius.sm, padding: Spacing.md },
  leadNameVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  leadPlateVal: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  assignedBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  assignedBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '800' },
  
  // Dropdown styles
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, height: 48, paddingHorizontal: Spacing.md, marginTop: 4, marginBottom: Spacing.md },
  dropdownTriggerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  placeholderText: { color: Colors.textLight },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: 30 },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownModalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalCloseBtn: { padding: Spacing.xs },
  optionsList: { paddingHorizontal: Spacing.lg },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionItemActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  addCustomFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addCustomFieldBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  headerOptionText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  headerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  addMappingSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  addMappingSubmitBtnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  renameContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  renameSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  renameCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  renameCancelText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  renameConfirmBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameConfirmText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
