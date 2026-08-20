import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { saveFileToDevice } from './fileSaver';

/**
 * Generates a CSV file from headers and rows, and saves it directly to the device.
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

    // 4. Save directly to public storage
    await saveFileToDevice(fileUri, filename, 'text/csv');
  } catch (error: any) {
    console.error('[CSV Export] Failed:', error);
    Alert.alert('Export Failed', error.message || 'An error occurred during CSV generation.');
  }
}
