import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { getReceiptHTML, ReceiptData } from '../utils/pdfTemplates';
import { saveFileToDevice } from '../utils/fileSaver';

/**
 * Triggers the native print spooler dialog directly for a given receipt dataset.
 */
export async function printReceiptDirect(data: ReceiptData): Promise<void> {
  const html = getReceiptHTML(data);
  try {
    await Print.printAsync({ html });
  } catch (error) {
    console.error('[PrintService] Failed to print receipt directly:', error);
    throw error;
  }
}

/**
 * Compiles a receipt to a PDF file locally, renames it, and saves it directly to the phone.
 */
export async function shareReceiptPDF(data: ReceiptData): Promise<void> {
  const html = getReceiptHTML(data);
  try {
    // 1. Compile HTML to temporary PDF file
    const { uri } = await Print.printToFileAsync({ html });

    // 2. Format a clean filename for the user
    const cleanFilename = `Receipt_${data.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const targetUri = `${FileSystem.documentDirectory}${cleanFilename}`;

    // 3. Move the file to our documents directory to give it the custom name
    await FileSystem.moveAsync({
      from: uri,
      to: targetUri,
    });

    // 4. Save directly to public storage
    await saveFileToDevice(targetUri, cleanFilename, 'application/pdf');
  } catch (error) {
    console.error('[PrintService] Failed to generate and save receipt PDF:', error);
    throw error;
  }
}
