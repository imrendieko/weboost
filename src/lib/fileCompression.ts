import JSZip from 'jszip';
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
}

/**
 * Compress PDF files
 */
export async function compressPDF(file: File): Promise<CompressionResult> {
  try {
    console.log('📄 Compressing PDF:', file.name, 'Size:', formatFileSize(file.size));
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // Save with compression options
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    // Convert to plain Uint8Array that works with File constructor
    const uint8Array = new Uint8Array(compressedPdfBytes);
    const compressedFile = new File([uint8Array], file.name, {
      type: 'application/pdf',
    });

    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const reductionPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);

    console.log('✅ PDF compressed:', formatFileSize(originalSize), '→', formatFileSize(compressedSize), `(${reductionPercent}% reduction)`);

    return {
      compressedFile,
      originalSize,
      compressedSize,
      reductionPercent,
    };
  } catch (error) {
    console.error('❌ Error compressing PDF:', error);
    throw error;
  }
}

/**
 * Compress images within a file
 */
async function compressImage(imageBlob: Blob, fileName: string): Promise<Blob> {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: imageBlob.type as any,
    };

    // Only compress if it's actually an image
    if (imageBlob.type.startsWith('image/')) {
      const file = new File([imageBlob], fileName, { type: imageBlob.type });
      return await imageCompression(file, options);
    }

    return imageBlob;
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageBlob; // Return original if compression fails
  }
}

/**
 * Compress Office files (DOCX, PPTX, XLSX)
 * These are ZIP files containing XML and images
 */
export async function compressOfficeFile(file: File): Promise<CompressionResult> {
  try {
    console.log('📦 Compressing Office file:', file.name, 'Size:', formatFileSize(file.size));
    const zip = await JSZip.loadAsync(file);
    const newZip = new JSZip();

    // Process each file in the ZIP
    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      const promise = (async () => {
        const content = await zipEntry.async('blob');

        // Compress images within the office file
        if (relativePath.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i) || content.type.startsWith('image/')) {
          const compressedImage = await compressImage(content, relativePath);
          newZip.file(relativePath, compressedImage);
        }
        // Minify XML files
        else if (relativePath.endsWith('.xml')) {
          const text = await zipEntry.async('text');
          const minified = text.replace(/>\s+</g, '><').trim();
          newZip.file(relativePath, minified);
        }
        // Keep other files as-is
        else {
          newZip.file(relativePath, content);
        }
      })();

      filePromises.push(promise);
    });

    await Promise.all(filePromises);

    // Generate compressed ZIP with maximum compression
    const compressedBlob = await newZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const compressedFile = new File([compressedBlob], file.name, {
      type: file.type,
    });

    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const reductionPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);

    console.log('✅ Office file compressed:', formatFileSize(originalSize), '→', formatFileSize(compressedSize), `(${reductionPercent}% reduction)`);

    return {
      compressedFile,
      originalSize,
      compressedSize,
      reductionPercent,
    };
  } catch (error) {
    console.error('❌ Error compressing office file:', error);
    throw error;
  }
}

/**
 * Main compression function - automatically detects file type
 */
export async function compressFile(file: File, onProgress?: (progress: number, message: string) => void): Promise<CompressionResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  console.log('🔍 Starting compression for:', file.name, 'Type:', fileExtension);

  try {
    // PDF compression
    if (fileExtension === 'pdf') {
      onProgress?.(0, 'Mengompres PDF...');
      const result = await compressPDF(file);
      onProgress?.(100, 'Kompresi PDF selesai!');
      return result;
    }

    // Office files compression
    if (['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls'].includes(fileExtension || '')) {
      onProgress?.(0, 'Mengompres file Office...');
      onProgress?.(25, 'Mengekstrak konten...');
      const result = await compressOfficeFile(file);
      onProgress?.(100, 'Kompresi selesai!');
      return result;
    }

    // Image compression
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension || '')) {
      onProgress?.(0, 'Mengompres gambar...');
      const compressedImage = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        initialQuality: 0.8,
        useWebWorker: true,
      });

      const compressedFile = new File([compressedImage], file.name, {
        type: compressedImage.type || file.type,
      });

      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      const reductionPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      onProgress?.(100, 'Kompresi gambar selesai!');

      return {
        compressedFile,
        originalSize,
        compressedSize,
        reductionPercent,
      };
    }

    // If not a supported format, return original
    console.log('⚠️ File format not supported for compression:', fileExtension);
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      reductionPercent: 0,
    };
  } catch (error) {
    console.error('❌ Compression failed:', error);
    // Return original file if compression fails
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      reductionPercent: 0,
    };
  }
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
