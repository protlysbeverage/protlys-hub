
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export type ScannedProteinProduct = {
  name: string;
  proteinGrams: number | null;
  note: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: ScannedProteinProduct) => void;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    proteins_serving?: number | string;
    proteins_100g?: number | string;
  };
};

function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseProtlysQr(value: string): ScannedProteinProduct | null {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object') return null;

    const name =
      typeof parsed.name === 'string'
        ? parsed.name.trim()
        : typeof parsed.product_name === 'string'
          ? parsed.product_name.trim()
          : '';

    const proteinGrams = positiveNumber(
      parsed.protein_g ??
      parsed.proteinGrams ??
      parsed.protein_per_serving_g,
    );

    const proteinPer100g = positiveNumber(
      parsed.protein_per_100g_g ?? parsed.proteins_100g,
    );

    if (!name) return null;

    return {
      name,
      proteinGrams,
      note: proteinGrams
        ? `${proteinGrams} g protein per serving, as encoded in this QR code.`
        : proteinPer100g
          ? `${proteinPer100g} g protein per 100 g. Enter the amount you consumed.`
          : 'Product recognised. Enter the protein amount from its label.',
    };
  } catch {
    return null;
  }
}

async function lookupBarcode(
  barcode: string,
): Promise<ScannedProteinProduct | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,brands,serving_size,nutriments`,
    {
      headers: {
        'User-Agent': 'Protlys/1.0 (Android)',
      },
    },
  );

  if (!response.ok) {
    throw new Error('The product lookup service is unavailable.');
  }

  const result = await response.json();

  if (result.status !== 1 || !result.product) {
    return null;
  }

  const product = result.product as OpenFoodFactsProduct;
  const productName =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    '';

  if (!productName) return null;

  const name = product.brands
    ? `${productName} - ${product.brands}`
    : productName;

  const perServing = positiveNumber(
    product.nutriments?.proteins_serving,
  );

  const per100g = positiveNumber(
    product.nutriments?.proteins_100g,
  );

  return {
    name,
    proteinGrams: perServing
      ? Math.round(perServing * 10) / 10
      : null,
    note: perServing
      ? `${perServing} g protein per ${product.serving_size || 'serving'} according to the product listing.`
      : per100g
        ? `${per100g} g protein per 100 g. Enter the protein amount for the portion you consumed.`
        : 'Product found, but no protein value was available. Check the product label.',
  };
}

export default function ProteinScanner({
  visible,
  onClose,
  onProductFound,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<ScannedProteinProduct | null>(null);
  const [message, setMessage] = useState('');
  const scanLock = useRef(false);

  const resetScanner = () => {
    scanLock.current = false;
    setScanned(false);
    setLookingUp(false);
    setResult(null);
    setMessage('');
  };

  const closeScanner = () => {
    resetScanner();
    onClose();
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();

      if (!nextPermission.granted) {
        Alert.alert(
          'Camera permission required',
          'Allow camera access to scan product QR codes and barcodes. You can also enter the product manually.',
        );
        return;
      }
    }
  };

  const handleBarcodeScanned = async ({
    data,
    type,
  }: {
    data: string;
    type: string;
  }) => {
    if (scanLock.current || !data) return;

    scanLock.current = true;
    setScanned(true);
    setLookingUp(true);
    setMessage('');

    try {
      let product: ScannedProteinProduct | null = null;

      // Protlys QR codes contain a small JSON product record.
      if (type === 'qr') {
        product = parseProtlysQr(data);

        // A QR code may also contain a standard retail barcode.
        if (!product && /^\d{8,14}$/.test(data.trim())) {
          product = await lookupBarcode(data.trim());
        }

        if (!product) {
          setMessage(
            'This QR code is not a recognised Protlys product record. You can enter the product details manually.',
          );
        }
      } else if (/^\d{8,14}$/.test(data.trim())) {
        product = await lookupBarcode(data.trim());
      } else {
        setMessage(
          'This code could not be identified as a supported product barcode.',
        );
      }

      if (product) {
        setResult(product);
      } else if (!message) {
        setMessage(
          'Product not found. Check its label and enter the details manually.',
        );
      }
    } catch (error) {
      console.error('Product barcode lookup failed:', error);
      setMessage(
        'Could not look up this product. Check your internet connection or enter the details manually.',
      );
    } finally {
      setLookingUp(false);
    }
  };

  const useResult = () => {
    if (!result) return;
    onProductFound(result);
    closeScanner();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeScanner}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PROTLYS</Text>
            <Text style={styles.title}>Scan a product</Text>
          </View>

          <Pressable onPress={closeScanner} style={styles.closeButton}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>

        {!permission?.granted ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Camera access</Text>
            <Text style={styles.bodyText}>
              Protlys needs camera access to scan product QR codes and
              barcodes. Your camera is only used while this scanner is open.
            </Text>
            <Pressable
              onPress={() => void openCamera()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>ALLOW CAMERA</Text>
            </Pressable>
          </View>
        ) : result ? (
          <View style={styles.resultCard}>
            <Text style={styles.successEyebrow}>PRODUCT FOUND</Text>
            <Text style={styles.productName}>{result.name}</Text>
            <Text style={styles.bodyText}>{result.note}</Text>

            <Pressable onPress={useResult} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>USE THIS PRODUCT</Text>
            </Pressable>

            <Pressable
              onPress={resetScanner}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>SCAN ANOTHER</Text>
            </Pressable>
          </View>
        ) : message ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Product not recognised</Text>
            <Text style={styles.bodyText}>{message}</Text>

            <Pressable
              onPress={closeScanner}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>ENTER MANUALLY</Text>
            </Pressable>

            <Pressable
              onPress={resetScanner}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={
                scanned ? undefined : handleBarcodeScanned
              }
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                ],
              }}
            />

            <View pointerEvents="none" style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstruction}>
                Place the QR code or barcode inside the frame
              </Text>
            </View>

            {lookingUp && (
              <View style={styles.lookupOverlay}>
                <ActivityIndicator size="large" color="#6BCB45" />
                <Text style={styles.lookupText}>
                  Looking up product...
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          Product information is checked before it is added to your daily log.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0F0E',
    padding: 22,
    paddingTop: 58,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  closeButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#343A34',
    borderRadius: 9,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#151815',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 210,
    borderWidth: 2,
    borderColor: '#6BCB45',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 25,
    paddingHorizontal: 25,
    textShadowColor: '#000000',
    textShadowRadius: 8,
  },
  lookupOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13,15,14,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 18,
    padding: 22,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 12,
  },
  bodyText: {
    color: '#A4ACA4',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 18,
    padding: 22,
  },
  successEyebrow: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 12,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#6BCB45',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#0D0F0E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#343A34',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  footer: {
    color: '#707770',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
});
