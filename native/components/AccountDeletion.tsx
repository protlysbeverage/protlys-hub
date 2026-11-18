
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const DELETION_URL = 'https://protlys.com/pages/account-deletion';
const PRIVACY_URL = 'https://protlys.com/pages/privacy-policy';

export default function AccountDeletion() {
  const [visible, setVisible] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  function closeModal() {
    if (deleting) return;
    setVisible(false);
    setConfirmation('');
    setError('');
  }

  function requestDeletion() {
    Alert.alert(
      'Delete your Protlys account?',
      'This permanently removes your Protlys profile and associated app data. Your account cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setConfirmation('');
            setError('');
            setVisible(true);
          },
        },
      ],
    );
  }

  async function deleteAccount() {
    if (confirmation.trim() !== 'DELETE' || deleting) return;

    setDeleting(true);
    setError('');

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke('delete-account');

      if (functionError) throw functionError;

      if (!data?.ok) {
        throw new Error(
          data?.error || 'Account deletion could not be confirmed.',
        );
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: 'local',
      });

      if (signOutError) {
        console.warn('Local session cleanup warning:', signOutError);
      }

      setVisible(false);
      setConfirmation('');

      Alert.alert(
        'Account deleted',
        'Your Protlys account has been permanently deleted.',
      );
    } catch (err) {
      console.error('Account deletion failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'We could not delete your account. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  }

  function openExternalPage(url: string) {
    void Linking.openURL(url).catch(error => {
      console.error('Unable to open external page:', error);
      Alert.alert(
        'Unable to open page',
        'Please try again or visit protlys.com in your browser.',
      );
    });
  }

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.heading}>ACCOUNT</Text>

        <Text style={styles.description}>
          Permanently delete your Protlys account and associated app data.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={requestDeletion}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            Delete my account
          </Text>
        </Pressable>

        <View style={styles.linkDivider} />

        <Text style={styles.linkHeading}>ACCOUNT AND PRIVACY SUPPORT</Text>

        <Pressable
          accessibilityRole="link"
          onPress={() => openExternalPage(DELETION_URL)}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.linkText}>
            Request account deletion online
          </Text>
          <Text style={styles.linkArrow}>↗</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          onPress={() => openExternalPage(PRIVACY_URL)}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.linkText}>Read our Privacy Policy</Text>
          <Text style={styles.linkArrow}>↗</Text>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalEyebrow}>PERMANENT ACTION</Text>

            <Text style={styles.modalTitle}>
              Confirm account deletion
            </Text>

            <Text style={styles.modalText}>
              This action cannot be undone. Your profile and associated
              Protlys app data will be deleted. Type DELETE below to confirm.
            </Text>

            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Type DELETE"
              placeholderTextColor="#707770"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              style={styles.input}
            />

            {error !== '' && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={confirmation.trim() !== 'DELETE' || deleting}
              onPress={() => void deleteAccount()}
              style={[
                styles.confirmButton,
                (confirmation.trim() !== 'DELETE' || deleting) &&
                  styles.disabledButton,
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Permanently delete account
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={deleting}
              onPress={closeModal}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 28,
    padding: 17,
    backgroundColor: '#151815',
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 16,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  description: {
    color: '#858B85',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 15,
  },
  deleteButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7D3939',
    backgroundColor: '#301B1B',
    borderRadius: 11,
    paddingVertical: 13,
  },
  deleteButtonText: {
    color: '#FFB5B5',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  linkDivider: {
    height: 1,
    backgroundColor: '#292D29',
    marginVertical: 17,
  },
  linkHeading: {
    color: '#858B85',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  linkButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  linkText: {
    color: '#6BCB45',
    fontSize: 12,
    fontWeight: '700',
  },
  linkArrow: {
    color: '#6BCB45',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  modal: {
    backgroundColor: '#151815',
    borderColor: '#393D39',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  modalEyebrow: {
    color: '#FF8585',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 9,
  },
  modalText: {
    color: '#A3AAA3',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  input: {
    color: '#FFFFFF',
    backgroundColor: '#0D0F0E',
    borderColor: '#393D39',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 17,
    fontSize: 14,
  },
  error: {
    color: '#FF9999',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    backgroundColor: '#A83232',
    borderRadius: 10,
    marginTop: 16,
    padding: 12,
  },
  disabledButton: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 13,
    marginTop: 5,
  },
  cancelButtonText: {
    color: '#A3AAA3',
    fontSize: 12,
    fontWeight: '700',
  },
});
