import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

interface PredefinedResponse {
  id: string;
  text: string;
  requiresFollowUp: boolean;
}

export default function CallLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ leadId: string; leadName: string }>();
  
  const [responses, setResponses] = useState<PredefinedResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedResponse, setSelectedResponse] = useState<PredefinedResponse | null>(null);
  const [isCustomResponse, setIsCustomResponse] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [showFollowup, setShowFollowup] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const res = await api.get<PredefinedResponse[]>('/settings/responses?activeOnly=true');
      setResponses(res || []);
    } catch (error) {
      console.error('Failed to load responses', error);
      Alert.alert('Error', 'Failed to load predefined responses');
    } finally {
      setLoadingResponses(false);
    }
  };

  const filteredResponses = responses.filter(r => 
    r.text.toLowerCase().includes(search.toLowerCase())
  );

  const isExpiryResponse = selectedResponse?.text.includes('expiry date અલગ છે');

  const canSubmit = selectedResponse !== null || customNotes.trim().length > 0;

  const submit = async () => {
    if (!params.leadId) { Alert.alert('Error', 'Lead ID is missing'); return; }
    if (!canSubmit) { Alert.alert('Error', 'Please select a response or enter custom notes'); return; }
    
    const needsFollowup = selectedResponse?.requiresFollowUp || showFollowup;
    if (needsFollowup && !followupDate) {
      Alert.alert('Error', 'Follow-up date is required (YYYY-MM-DD)'); 
      return;
    }

    setSaving(true);
    try {
      const finalStatus = isCustomResponse 
        ? (customNotes.trim() ? `Custom: ${customNotes.trim().slice(0, 50)}` : 'Other / Custom Note')
        : (selectedResponse ? selectedResponse.text : 'Custom Note');

      const payload = {
        leadId: params.leadId,
        status: finalStatus,
        notes: selectedResponse ? selectedResponse.text : '',
        customNotes: customNotes.trim() || undefined,
        newExpiryDate: isExpiryResponse && newExpiryDate.trim() ? newExpiryDate.trim() : undefined,
        followupDate: needsFollowup && followupDate ? followupDate : null
      };

      const res = await api.post<any>(`/leads/${params.leadId}/response`, payload);
      
      if (res.nextLeadId) {
        Alert.alert(
          'Saved', 
          'Outcome saved. Would you like to call the next pending lead?',
          [
            { text: 'No', onPress: () => router.back(), style: 'cancel' },
            { text: 'Yes', onPress: () => router.replace(`/lead/${res.nextLeadId}`) }
          ]
        );
      } else {
        Alert.alert('Success', 'Outcome saved. No more pending leads.');
        router.back();
      }
    } catch (e: any) { 
      Alert.alert('Error', e.message || 'Failed to save'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Log Call Outcome</Text>
        <Pressable 
          onPress={submit} 
          disabled={saving || !canSubmit} 
          style={[styles.saveBtn, (!canSubmit || saving) && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.leadBanner}>
            <Ionicons name="person" size={18} color={Colors.primary} />
            <Text style={styles.leadBannerText}>{params.leadName || 'Selected Lead'}</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search Gujarati responses... (e.g. રોંગ, વેંત, ગાડી)" 
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

          <Text style={styles.label}>SELECT PREDEFINED RESPONSE ({filteredResponses.length})</Text>
          
          {loadingResponses ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredResponses}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item, index }) => {
                const isSelected = selectedResponse?.id === item.id && !isCustomResponse;
                return (
                  <Pressable 
                    style={[styles.responseItem, isSelected && styles.responseItemSelected]} 
                    onPress={() => {
                      setSelectedResponse(item);
                      setIsCustomResponse(false);
                      if (item.requiresFollowUp) setShowFollowup(true);
                    }}
                  >
                    <View style={styles.responseNumberBadge}>
                      <Text style={styles.responseNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.responseItemText, isSelected && styles.responseItemTextSelected]}>
                      {item.text}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <View style={styles.footerOptions}>
                  {/* Custom Option */}
                  <Pressable
                    style={[styles.customOptionBtn, isCustomResponse && styles.customOptionBtnActive]}
                    onPress={() => {
                      setIsCustomResponse(true);
                      setSelectedResponse(null);
                    }}
                  >
                    <Ionicons 
                      name={isCustomResponse ? "create" : "create-outline"} 
                      size={20} 
                      color={isCustomResponse ? Colors.primary : Colors.textMuted} 
                    />
                    <Text style={[styles.customOptionText, isCustomResponse && styles.customOptionTextActive]}>
                      {isCustomResponse ? "✓ Writing Custom Note / Other Reason" : "+ Answer not in list? Click here for Custom Note"}
                    </Text>
                  </Pressable>
                </View>
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No matching response. Use custom notes below.</Text>
              }
            />
          )}

          {/* Conditional inputs */}
          <View style={styles.bottomInputsSection}>
            {/* New Expiry Date input if response #33 is selected */}
            {isExpiryResponse && (
              <View style={styles.specialInputBox}>
                <Text style={styles.specialLabel}>NEW EXPIRY DATE (YYYY-MM-DD):</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. 2026-11-20" 
                  placeholderTextColor={Colors.textLight} 
                  value={newExpiryDate} 
                  onChangeText={setNewExpiryDate} 
                />
              </View>
            )}

            {/* Custom Notes / Remarks Input */}
            <View style={styles.notesContainer}>
              <Text style={styles.label}>
                {isCustomResponse ? "CUSTOM NOTES / REMARKS (REQUIRED):" : "ADDITIONAL REMARKS / NOTES (OPTIONAL):"}
              </Text>
              <TextInput 
                style={styles.notesInput} 
                placeholder="Type your notes or remarks here..." 
                placeholderTextColor={Colors.textLight} 
                value={customNotes} 
                onChangeText={setCustomNotes} 
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Follow-up Section */}
            {(selectedResponse?.requiresFollowUp || showFollowup) && (
              <View style={styles.followupContainer}>
                <View style={styles.followupHeader}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.label}>FOLLOW-UP DATE (REQUIRED):</Text>
                </View>
                <TextInput 
                  style={styles.input} 
                  placeholder="YYYY-MM-DD (e.g. 2026-09-15)" 
                  placeholderTextColor={Colors.textLight} 
                  value={followupDate} 
                  onChangeText={setFollowupDate} 
                />
                <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#FFFFFF' },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  content: { flex: 1, padding: Spacing.md },
  leadBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryLight, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  leadBannerText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, height: 44, marginBottom: Spacing.sm },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.sm, color: Colors.text },
  label: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  list: { flex: 1 },
  responseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border + '50', backgroundColor: Colors.white, borderRadius: BorderRadius.sm, marginVertical: 2 },
  responseItemSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary, borderWidth: 1 },
  responseNumberBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs },
  responseNumberText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  responseItemText: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  responseItemTextSelected: { fontWeight: '700', color: Colors.primary },
  emptyText: { textAlign: 'center', marginTop: 16, color: Colors.textMuted, fontSize: FontSize.sm },
  footerOptions: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  customOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  customOptionBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary, borderStyle: 'solid' },
  customOptionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  customOptionTextActive: { color: Colors.primary },
  bottomInputsSection: { marginTop: Spacing.xs, gap: Spacing.xs },
  specialInputBox: { padding: Spacing.sm, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#F59E0B' },
  specialLabel: { fontSize: 11, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  notesContainer: { padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  notesInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: FontSize.sm, color: Colors.text, minHeight: 60 },
  followupContainer: { padding: Spacing.sm, backgroundColor: '#EFF6FF', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#BFDBFE' },
  followupHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, height: 40, fontSize: FontSize.sm, color: Colors.text },
  hint: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
});
