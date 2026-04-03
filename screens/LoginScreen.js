import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function LoginScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing", "Please enter email and password.");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const uid = userCredential.user.uid;

      // جرب بالـ uid مباشرة أولاً (أكاونتات جديدة)
      let userData = null;
      const directSnap = await getDoc(doc(db, "users", uid));

      if (directSnap.exists()) {
        userData = directSnap.data();
      } else {
        // fallback للأكاونتات القديمة
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) userData = snap.docs[0].data();
      }

      if (!userData) {
        Alert.alert("Error", "User data not found");
        return;
      }

      nav.replace("Home", { role: userData.role });
    } catch (error) {
      console.log(error);
      Alert.alert("Login Failed", "Email or password is incorrect");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("../assets/cairo_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your campus account</Text>

        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>University Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@university.edu"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Forgot Password", "Feature coming soon")
            }
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.passwordBox}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>

        <Pressable style={styles.button} onPress={onLogin}>
          <Text style={styles.btnText}>Sign In</Text>
        </Pressable>

        <Text style={styles.bottomText}>
          Don't have an account?{" "}
          <Text style={styles.link} onPress={() => nav.navigate("Register")}>
            Register
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40 },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 28 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  googleG: { fontSize: 18, fontWeight: "900", color: "#ea4335" },
  googleText: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { fontSize: 12, color: "#94a3b8" },
  label: { fontSize: 13, fontWeight: "600", color: "#0f172a", marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  showText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  bottomText: { textAlign: "center", color: "#64748b", fontSize: 14 },
  link: { color: "#2563eb", fontWeight: "700" },
});
