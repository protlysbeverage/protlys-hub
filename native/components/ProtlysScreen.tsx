import { StyleSheet, Text, View, Image } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  eyebrow: string;
  children?: React.ReactNode;
};

export default function ProtlysScreen({
  title,
  subtitle,
  eyebrow,
  children,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/protlys-logo-exact.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.indicator} />
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>

      <Text style={styles.footer}>
        PROTEIN. MOVEMENT. COMMUNITY.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F0E',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 132,
    height: 42,
  },
  indicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#6BCB45',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#6BCB45',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A0A6A0',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
  },
  footer: {
    color: '#707770',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});