import React, { useEffect } from "react";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { requestNotificationPermissions } from "./services/notificationService";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ManageClassScreen from "./screens/ManageClassScreen";
import QRScannerScreen from "./screens/QRScannerScreen";
import AdminScreen from "./screens/AdminScreen";
import AdminDashboardScreen from "./screens/AdminDashboardScreen";
import StudentRequestsScreen from "./screens/StudentRequestsScreen";
import AdminRequestsScreen from "./screens/AdminRequestsScreen";
import InstructorReviewsScreen from "./screens/InstructorReviewsScreen";
const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ManageClass" component={ManageClassScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="StudentRequests" component={StudentRequestsScreen}/>
        <Stack.Screen
  name="AdminRequests"
  component={AdminRequestsScreen}
/>
        <Stack.Screen name="InstructorReviews" component={InstructorReviewsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
