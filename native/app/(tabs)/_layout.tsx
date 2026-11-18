import { Tabs } from 'expo-router';
import { Image, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => (
          <Image
            source={require('../../assets/images/protlys-logo-exact.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        ),
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: '#0D0F0E',
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#6BCB45',
        tabBarInactiveTintColor: '#858B85',
        tabBarStyle: {
          backgroundColor: '#151815',
          borderTopColor: '#292D29',
          height: 82,
          paddingTop: 10,
          paddingBottom: 20,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="movement" options={{ title: 'Movement' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
      <Tabs.Screen name="protein" options={{ title: 'Protein' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 38,
  },
});