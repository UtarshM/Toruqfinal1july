import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Generates a CSV file from headers and rows, and triggers the native sharing sheet.
 */
export async function exportToCSV(filename: string, headers: string[], rows: any[][]): Promise<void> {
  try {
    // 1. Construct CSV String
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => 
        row.map(val => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');

    // 2. Define target path
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // 3. Write to device local storage
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 4. Trigger sharing sheet
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Sharing Unavailable', 'This device does not support file sharing.');
    }
  } catch (error: any) {
    console.error('[CSV Export] Failed:', error);
    Alert.alert('Export Failed', error.message || 'An error occurred during CSV generation.');
  }
}
