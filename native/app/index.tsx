import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const { session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6BCB45" size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/movement" />;
  }

  async function handleLogin() {
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) setError(loginError.message);
    } catch {
      setError('Unable to connect. Check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <Image
            source={require('../assets/images/protlys-logo-exact.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>
            MOVEMENT. NUTRITION. COMMUNITY.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your Protlys journey.
          </Text>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#737973"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#737973"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0D0F0E" />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>
            Your Protlys account. Your progress. Your community.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F0E',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0D0F0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 58,
  },
  logo: {
    width: 220,
    height: 90,
  },
  tagline: {
    color: '#858B85',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 14,
  },
  form: {
    width: '100%',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 9,
  },
  subtitle: {
    color: '#A1A8A1',
    fontSize: 14,
    marginBottom: 34,
  },
  label: {
    color: '#A1A8A1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 9,
    marginTop: 18,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#292D29',
    borderRadius: 12,
    backgroundColor: '#151815',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  error: {
    color: '#FF7777',
    fontSize: 13,
    marginTop: 16,
  },
  button: {
    height: 54,
    backgroundColor: '#6BCB45',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0D0F0E',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  footer: {
    color: '#737973',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 28,
  },
});