import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIRECTORY_KEY = 'torque_saf_directory_uri';

/**
 * Saves a local file directly to the user's mobile device storage.
 * On Android: Uses SAF (Storage Access Framework) to write directly to
 * a user-selected folder. The folder permission is cached so the user
 * only needs to pick once. If SAF fails for any reason, it auto-retries
 * with a fresh directory picker.
 * 
 * On iOS: Uses the native share sheet with "Save to Files" as the primary action.
 * 
 * IMPORTANT: This function NEVER opens a share menu on Android. It either saves
 * directly or shows an error.
 *
 * @param localUri Absolute private URI of the file (e.g. FileSystem.documentDirectory + filename)
 * @param filename Desired name of the file (e.g. "Policy_Bundle_123.pdf")
 * @param mimeType Mime type of the file (e.g. "application/pdf" or "text/csv")
 */
export async function saveFileToDevice(localUri: string, filename: string, mimeType: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await saveOnAndroid(localUri, filename, mimeType);
    } else if (Platform.OS === 'ios') {
      await saveOnIOS(localUri, filename, mimeType);
    } else {
      Alert.alert('Saved', `File ready: ${filename}`);
    }
  } catch (error: any) {
    console.error('Error saving file:', error);
    Alert.alert('Save Error', error.message || 'Could not save file to device.');
  }
}

async function writeSAF(dirUri: string, localUri: string, filename: string, mimeType: string): Promise<boolean> {
  try {
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      dirUri,
      filename,
      mimeType
    );
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return true;
  } catch (e) {
    console.warn('SAF write failed:', e);
    return false;
  }
}

async function saveOnAndroid(localUri: string, filename: string, mimeType: string): Promise<void> {
  // Try cached directory first
  let directoryUri = await AsyncStorage.getItem(DIRECTORY_KEY);
  
  if (directoryUri) {
    const success = await writeSAF(directoryUri, localUri, filename, mimeType);
    if (success) {
      showSaveSuccess(filename);
      return;
    }
    // Cached URI is stale/invalid – clear it and re-prompt
    await AsyncStorage.removeItem(DIRECTORY_KEY);
  }

  // Prompt user to select a download folder
  try {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await AsyncStorage.setItem(DIRECTORY_KEY, permissions.directoryUri);
      const success = await writeSAF(permissions.directoryUri, localUri, filename, mimeType);
      if (success) {
        showSaveSuccess(filename);
      } else {
        Alert.alert('Save Failed', 'Could not write file to the selected folder. Please try again.');
      }
    } else {
      Alert.alert(
        'Permission Required',
        'Folder access is required to save files. Please try again and select a folder.',
      );
    }
  } catch (err: any) {
    console.error('SAF directory picker error:', err);
    Alert.alert('Save Error', err.message || 'Could not save file.');
  }
}

async function saveOnIOS(localUri: string, filename: string, mimeType: string): Promise<void> {
  // On iOS, the only reliable approach is the native share sheet
  // which includes "Save to Files"
  try {
    const Sharing = require('expo-sharing');
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(localUri, {
        mimeType,
        dialogTitle: `Save ${filename}`,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data'
      });
    } else {
      Alert.alert('Error', 'File saving is not supported on this device.');
    }
  } catch (err: any) {
    console.error('iOS sharing error:', err);
    Alert.alert('Save Error', err.message || 'Could not save file.');
  }
}

function showSaveSuccess(filename: string) {
  if (Platform.OS === 'android') {
    try {
      ToastAndroid.show(`✅ Saved: ${filename}`, ToastAndroid.SHORT);
    } catch {
      // ToastAndroid might not be available in all environments
    }
  }
  Alert.alert('Saved ✅', `"${filename}" has been saved to your selected folder.`);
}
