import { View, Text, StyleSheet, useColorScheme } from 'react-native';

export default function ManageScreen() {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.container, { backgroundColor: dark ? '#0f0f0e' : '#f9f9f8' }]}>
      <Text style={{ color: dark ? '#eceae4' : '#1a1a18', fontSize: 16 }}>Mes alertes</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
