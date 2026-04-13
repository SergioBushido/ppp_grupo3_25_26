import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import VacationsScreen from '../screens/VacationsScreen';
import RequestVacationScreen from '../screens/RequestVacationScreen';
import AdminRequestVacationScreen from '../screens/AdminRequestVacationScreen';
import AdminScreen from '../screens/AdminScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ForcePasswordChangeScreen from '../screens/ForcePasswordChangeScreen';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, color, focused, isSpecial }) => (
  <View style={styles.iconContainer}>
    {isSpecial ? (
      <View style={[styles.iconWrapper, { backgroundColor: colors.vacationBrand }]}>
        <MaterialCommunityIcons name={name} size={24} color={colors.white} />
      </View>
    ) : (
      <MaterialCommunityIcons name={focused ? name : `${name}-outline`} size={26} color={color} />
    )}
  </View>
);

const TabLabel = ({ label, focused, color }) => (
  <View style={styles.labelWrapper}>
    <Text style={[styles.label, { color }]}>{label}</Text>
    {focused && <View style={styles.indicator} />}
  </View>
);

function MainTabs() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          }
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Inicio" focused={focused} color={color} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Horario" focused={focused} color={color} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="clock" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Vacations"
        component={VacationsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Vacaciones" focused={focused} color={color} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="umbrella-beach" color={color} focused={focused} isSpecial />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Ajustes" focused={focused} color={color} />
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cog" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.requires_password_change ? (
        <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="RequestVacation"
            component={RequestVacationScreen}
            options={{
              headerShown: true,
              title: 'Solicitar Vacaciones',
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: typography.weights.bold },
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="AdminRequestVacation"
            component={AdminRequestVacationScreen}
            options={{
              headerShown: true,
              title: 'Editar Vacaciones',
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: typography.weights.bold },
              presentation: 'modal',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingTop: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 32,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.vacationBrand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  labelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 24,
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  indicator: {
    width: 16,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 2,
  },
});
