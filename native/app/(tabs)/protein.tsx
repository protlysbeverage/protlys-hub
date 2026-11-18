
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import ProteinScanner, {
  type ScannedProteinProduct,
} from '@/components/ProteinScanner';

type ProteinLog = {
  id: number;
  grams: number;
  product_label: string | null;
  logged_at: string;
  log_date: string;
};

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ProteinScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [logs, setLogs] = useState<ProteinLog[]>([]);
  const [target, setTarget] = useState(120);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [gramsInput, setGramsInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [targetInput, setTargetInput] = useState('120');
  const [showTargetEditor, setShowTargetEditor] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(
    () => logs.reduce((sum, log) => sum + Number(log.grams || 0), 0),
    [logs],
  );

  const progress = target > 0 ? Math.min(total / target, 1) : 0;
  const remaining = Math.max(target - total, 0);
  const percentage = target > 0 ? Math.round((total / target) * 100) : 0;

  const loadData = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setError('');

    try {
      const [profileResult, logsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('target_g')
          .eq('id', userId)
          .maybeSingle(),

        supabase
          .from('protein_logs')
          .select('id, grams, product_label, logged_at, log_date')
          .eq('user_id', userId)
          .eq('log_date', localDateKey())
          .order('logged_at', { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (logsResult.error) throw logsResult.error;

      const savedTarget = Number(profileResult.data?.target_g ?? 120);
      setTarget(savedTarget);
      setTargetInput(String(savedTarget));
      setLogs((logsResult.data ?? []) as ProteinLog[]);
    } catch (err) {
      console.error('Unable to load protein data:', err);
      setError('Could not load your protein data. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const handleScannedProduct = (product: ScannedProteinProduct) => {
    setProductInput(product.name);

    if (product.proteinGrams !== null) {
      setGramsInput(String(Math.round(product.proteinGrams)));
    } else {
      setGramsInput('');
    }

    Alert.alert(product.name, product.note);
  };

  const addLog = async () => {
    if (!userId || savingLog) return;

    const grams = Number(gramsInput.trim());

    if (!Number.isInteger(grams) || grams < 1 || grams > 500) {
      Alert.alert(
        'Check the amount',
        'Enter a whole number between 1 and 500 grams.',
      );
      return;
    }

    setSavingLog(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('protein_logs')
        .insert({
          user_id: userId,
          grams,
          product_label: productInput.trim() || 'Food',
          log_date: localDateKey(),
        })
        .select('id, grams, product_label, logged_at, log_date')
        .single();

      if (insertError) throw insertError;

      setLogs((current) => [data as ProteinLog, ...current]);
      setGramsInput('');
      setProductInput('');
    } catch (err) {
      console.error('Unable to save protein log:', err);
      setError('Your entry could not be saved. Please try again.');
    } finally {
      setSavingLog(false);
    }
  };

  const saveTarget = async () => {
    if (!userId || savingTarget) return;

    const nextTarget = Number(targetInput.trim());

    if (!Number.isInteger(nextTarget) || nextTarget < 20 || nextTarget > 500) {
      Alert.alert(
        'Check your target',
        'Your daily target must be between 20 and 500 grams.',
      );
      return;
    }

    setSavingTarget(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ target_g: nextTarget })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('protein_target_history')
        .insert({
          user_id: userId,
          target_g: nextTarget,
          source: 'custom',
          effective_from: localDateKey(),
        });

      setTarget(nextTarget);
      setTargetInput(String(nextTarget));
      setShowTargetEditor(false);

      if (historyError) {
        console.error('Target history could not be saved:', historyError);
        Alert.alert(
          'Target updated',
          'Your daily target was updated, but its history entry could not be saved.',
        );
      }
    } catch (err) {
      console.error('Unable to update protein target:', err);
      setError('Your target could not be updated. Please try again.');
    } finally {
      setSavingTarget(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProteinScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onProductFound={handleScannedProduct}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6BCB45"
            colors={['#6BCB45']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NUTRITION TRACKER</Text>
          <Text style={styles.title}>Protein</Text>
          <Text style={styles.subtitle}>
            Keep track of what you eat and build a consistent routine.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.cardEyebrow}>TODAY'S INTAKE</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalNumber}>{total}</Text>
                <Text style={styles.totalUnit}>g</Text>
              </View>
              <Text style={styles.targetCaption}>
                of {target} g daily target
              </Text>
            </View>

            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{percentage}%</Text>
              <Text style={styles.progressLabel}>COMPLETE</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <View style={styles.progressBottom}>
            <Text style={styles.remainingText}>
              {remaining > 0
                ? `${remaining} g remaining`
                : 'Daily target reached'}
            </Text>

            <Pressable
              onPress={() => setShowTargetEditor((current) => !current)}
            >
              <Text style={styles.editTarget}>EDIT TARGET</Text>
            </Pressable>
          </View>

          {showTargetEditor && (
            <View style={styles.targetEditor}>
              <Text style={styles.inputLabel}>DAILY TARGET (GRAMS)</Text>
              <View style={styles.targetEditRow}>
                <TextInput
                  value={targetInput}
                  onChangeText={setTargetInput}
                  keyboardType="number-pad"
                  placeholder="120"
                  placeholderTextColor="#707770"
                  style={styles.targetInput}
                  maxLength={3}
                />
                <Pressable
                  onPress={() => void saveTarget()}
                  disabled={savingTarget}
                  style={[
                    styles.smallSaveButton,
                    savingTarget && styles.disabledButton,
                  ]}
                >
                  {savingTarget ? (
                    <ActivityIndicator color="#0D0F0E" />
                  ) : (
                    <Text style={styles.smallSaveText}>SAVE</Text>
                  )}
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Choose a target between 20 and 500 grams.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOG PROTEIN</Text>
          <Text style={styles.sectionSubtitle}>
            Scan a product or add a meal, snack or Protlys drink.
          </Text>

          <View style={styles.formCard}>
            <Pressable
              onPress={() => setShowScanner(true)}
              style={styles.scanButton}
            >
              <Text style={styles.scanButtonIcon}>▦</Text>
              <View style={styles.scanButtonContent}>
                <Text style={styles.scanButtonTitle}>
                  SCAN QR OR BARCODE
                </Text>
                <Text style={styles.scanButtonSubtitle}>
                  Look up a packaged product
                </Text>
              </View>
              <Text style={styles.scanArrow}>›</Text>
            </Pressable>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR ENTER MANUALLY</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.inputLabel}>FOOD OR PRODUCT</Text>
            <TextInput
              value={productInput}
              onChangeText={setProductInput}
              placeholder="e.g. Eggs, milk, yoghurt"
              placeholderTextColor="#707770"
              style={styles.textInput}
              maxLength={80}
            />

            <Text style={[styles.inputLabel, styles.gramsLabel]}>
              PROTEIN AMOUNT (GRAMS)
            </Text>
            <View style={styles.gramsRow}>
              <TextInput
                value={gramsInput}
                onChangeText={setGramsInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 20"
                placeholderTextColor="#707770"
                style={[styles.textInput, styles.gramsInput]}
                maxLength={5}
              />
              <Pressable
                onPress={() => void addLog()}
                disabled={savingLog}
                style={[
                  styles.addButton,
                  savingLog && styles.disabledButton,
                ]}
              >
                {savingLog ? (
                  <ActivityIndicator color="#0D0F0E" />
                ) : (
                  <Text style={styles.addButtonText}>ADD ENTRY</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              Confirm the protein amount for the portion you consumed before
              saving.
            </Text>
          </View>
        </View>

        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.sectionTitle}>TODAY'S ENTRIES</Text>
              <Text style={styles.sectionSubtitle}>
                {logs.length} {logs.length === 1 ? 'entry' : 'entries'} logged
              </Text>
            </View>
            {loading && <ActivityIndicator color="#6BCB45" />}
          </View>

          {!loading && logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptyText}>
                Add your first meal or drink to start tracking today's protein.
              </Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logIcon}>
                  <Text style={styles.logIconText}>P</Text>
                </View>

                <View style={styles.logDetails}>
                  <Text style={styles.logName}>
                    {log.product_label || 'Food'}
                  </Text>
                  <Text style={styles.logTime}>
                    {formatTime(log.logged_at)}
                  </Text>
                </View>

                <Text style={styles.logGrams}>+{log.grams} g</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Protein values are based on the amounts you enter. Check food
            labels or reliable nutrition information for accurate estimates.
            Barcode listings may be incomplete or user-submitted.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0F0E',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 38,
  },
  header: {
    marginBottom: 25,
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#929992',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 18,
    padding: 19,
    marginBottom: 30,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: '#858B85',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  totalNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  totalUnit: {
    color: '#6BCB45',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 5,
  },
  targetCaption: {
    color: '#929992',
    fontSize: 12,
    marginTop: 1,
  },
  progressCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: '#6BCB45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  progressLabel: {
    color: '#858B85',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#292D29',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 22,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6BCB45',
    borderRadius: 10,
  },
  progressBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
  },
  remainingText: {
    color: '#A7AEA7',
    fontSize: 11,
    fontWeight: '600',
  },
  editTarget: {
    color: '#6BCB45',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  targetEditor: {
    borderTopWidth: 1,
    borderTopColor: '#292D29',
    marginTop: 18,
    paddingTop: 17,
  },
  targetEditRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  targetInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 13,
    fontSize: 16,
  },
  smallSaveButton: {
    width: 85,
    backgroundColor: '#6BCB45',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallSaveText: {
    color: '#0D0F0E',
    fontSize: 11,
    fontWeight: '900',
  },
  helperText: {
    color: '#707770',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  sectionSubtitle: {
    color: '#858B85',
    fontSize: 12,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
  },
  scanButton: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20331D',
    borderColor: '#36552E',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  scanButtonIcon: {
    color: '#6BCB45',
    fontSize: 25,
    fontWeight: '800',
    marginRight: 13,
  },
  scanButtonContent: {
    flex: 1,
  },
  scanButtonTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  scanButtonSubtitle: {
    color: '#A7B5A1',
    fontSize: 10,
    marginTop: 5,
  },
  scanArrow: {
    color: '#6BCB45',
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 8,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 19,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#292D29',
  },
  orText: {
    color: '#707770',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  inputLabel: {
    color: '#929992',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  textInput: {
    height: 48,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 13,
    marginTop: 8,
  },
  gramsLabel: {
    marginTop: 18,
  },
  gramsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  gramsInput: {
    flex: 1,
  },
  addButton: {
    height: 48,
    paddingHorizontal: 17,
    backgroundColor: '#6BCB45',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#0D0F0E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorBox: {
    backgroundColor: '#301B1B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFB5B5',
    fontSize: 12,
    lineHeight: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 15,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#858B85',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151815',
    borderColor: '#292D29',
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    marginBottom: 9,
  },
  logIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#20331D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logIconText: {
    color: '#6BCB45',
    fontSize: 16,
    fontWeight: '900',
  },
  logDetails: {
    flex: 1,
    marginLeft: 12,
  },
  logName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  logTime: {
    color: '#858B85',
    fontSize: 10,
    marginTop: 4,
  },
  logGrams: {
    color: '#6BCB45',
    fontSize: 15,
    fontWeight: '900',
  },
  footerNote: {
    borderTopWidth: 1,
    borderTopColor: '#292D29',
    paddingTop: 17,
  },
  footerText: {
    color: '#707770',
    fontSize: 10,
    lineHeight: 17,
  },
});
