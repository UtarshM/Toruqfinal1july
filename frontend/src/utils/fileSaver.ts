import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIRECTORY_KEY = 'torque_saf_directory_uri';

/**
 * Saves a local file (located at private app storage temp path localUri)
 * directly to the user's mobile device (public Downloads folder on Android,
 * or native share fallback/Save to Files on iOS/fallback).
 * 
 * @param localUri Absolute private URI of the file (e.g. FileSystem.documentDirectory + filename)
 * @param filename Desired name of the file (e.g. "Policy_Bundle_123.pdf")
 * @param mimeType Mime type of the file (e.g. "application/pdf" or "text/csv")
 */
export async function saveFileToDevice(localUri: string, filename: string, mimeType: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      let directoryUri = await AsyncStorage.getItem(DIRECTORY_KEY);
      
      const writeSAF = async (dirUri: string): Promise<boolean> => {
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
          console.warn('Failed to write via SAF:', e);
          return false;
        }
      };

      if (directoryUri) {
        const success = await writeSAF(directoryUri);
        if (success) {
          Alert.alert('Saved Successfully 🎉', `File saved directly to your selected folder: ${filename}`);
          return;
        }
      }

      // Prompt user to select directory once
      Alert.alert(
        'Select Download Folder',
        'Please choose a folder (like Downloads) on your phone where files should be saved directly.',
        [
          {
            text: 'Choose Folder',
            onPress: async () => {
              try {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  await AsyncStorage.setItem(DIRECTORY_KEY, permissions.directoryUri);
                  const success = await writeSAF(permissions.directoryUri);
                  if (success) {
                    Alert.alert('Saved Successfully 🎉', `File saved directly to your selected folder: ${filename}`);
                  }
                } else {
                  // Fallback to sharing if permission denied
                  await triggerSharing(localUri, filename, mimeType);
                }
              } catch (err) {
                console.error('SAF error:', err);
                await triggerSharing(localUri, filename, mimeType);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => triggerSharing(localUri, filename, mimeType)
          }
        ]
      );
    } else {
      // iOS / Web / general fallback
      await triggerSharing(localUri, filename, mimeType);
    }
  } catch (error: any) {
    console.error('Error saving file:', error);
    Alert.alert('Save Error', error.message || 'Could not save file to device.');
  }
}

async function triggerSharing(localUri: string, filename: string, mimeType: string) {
  if (Platform.OS === 'web') {
    Alert.alert('Saved', 'File downloaded successfully.');
    return;
  }
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (isSharingAvailable) {
    await Sharing.shareAsync(localUri, {
      mimeType,
      dialogTitle: `Save ${filename}`,
      UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text'
    });
  } else {
    Alert.alert('Error', 'Direct saving and sharing are not supported on this device.');
  }
}
