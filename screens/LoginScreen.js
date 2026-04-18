import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  Image, TouchableOpacity, SafeAreaView, ScrollView, Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [accountsVisible, setAccountsVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [savedPassword, setSavedPassword] = useState("");

  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = async () => {
    try {
      const data = await AsyncStorage.getItem("saved_accounts");
      if (data) setSavedAccounts(JSON.parse(data));
    } catch (e) { console.log(e); }
  };

  const saveAccount = async (email, name, role) => {
    try {
      const data = await AsyncStorage.getItem("saved_accounts");
      let accounts = data ? JSON.parse(data) : [];
      accounts = accounts.filter((a) => a.email !== email);
      accounts.unshift({ email, name, role });
      if (accounts.length > 5) accounts = accounts.slice(0, 5);
      await AsyncStorage.setItem("saved_accounts", JSON.stringify(accounts));
      setSavedAccounts(accounts);
    } catch (e) { console.log(e); }
  };

  const removeAccount = async (emailToRemove) => {
    try {
      const updated = savedAccounts.filter((a) => a.email !== emailToRemove);
      await AsyncStorage.setItem("saved_accounts", JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (e) { console.log(e); }
  };

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing", "Please enter email and password.");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      let userData = null;
      const directSnap = await getDoc(doc(db, "users", uid));
      if (directSnap.exists()) {
        userData = directSnap.data();
      } else {
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) userData = snap.docs[0].data();
      }

      if (!userData) { Alert.alert("Error", "User data not found"); return; }

      await saveAccount(email, `${userData.firstName} ${userData.lastName}`, userData.role);
      nav.replace("Home", { role: userData.role });
    } catch (error) {
      console.log(error);
      Alert.alert("Login Failed", "Email or password is incorrect");
    }
  };

  const loginWithSavedAccount = async () => {
    if (!savedPassword.trim()) { Alert.alert("Enter password"); return; }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, selectedAccount.email, savedPassword);
      const uid = userCredential.user.uid;

      let userData = null;
      const directSnap = await getDoc(doc(db, "users", uid));
      if (directSnap.exists()) {
        userData = directSnap.data();
      } else {
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) userData = snap.docs[0].data();
      }

      if (!userData) { Alert.alert("Error", "User data not found"); return; }

      setAccountsVisible(false);
      setSavedPassword("");
      setSelectedAccount(null);
      nav.replace("Home", { role: userData.role });
    } catch (e) {
      Alert.alert("Login Failed", "Password is incorrect");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Enter your email first", "Type your email in the field above then press Forgot Password");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("✅ Done", "Reset link sent to your email, check your inbox");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Email not found");
    }
  };

  const getRoleColor = (role) => {
    if (role === "admin") return "#f59e0b";
    if (role === "instructor") return "#10b981";
    return "#6366f1";
  };

  const getRoleIcon = (role) => {
    if (role === "admin") return "⚙️";
    if (role === "instructor") return "🎓";
    return "📚";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require("../assets/cairo_logo.png")} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your campus account</Text>

        {/* Saved Accounts Button */}
        {savedAccounts.length > 0 && (
          <TouchableOpacity style={styles.savedBtn} onPress={() => { setSelectedAccount(null); setSavedPassword(""); setAccountsVisible(true); }}>
            <Text style={styles.savedBtnIcon}>👤</Text>
            <Text style={styles.savedBtnText}>Choose saved account</Text>
            <Text style={styles.savedBtnArrow}>›</Text>
          </TouchableOpacity>
        )}

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
          <TouchableOpacity onPress={handleForgotPassword}>
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
            <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        <Pressable style={styles.button} onPress={onLogin}>
          <Text style={styles.btnText}>Sign In</Text>
        </Pressable>

        <Text style={styles.bottomText}>
          Don't have an account?{" "}
          <Text style={styles.link} onPress={() => nav.navigate("Register")}>Register</Text>
        </Text>
      </ScrollView>

      {/* Accounts Modal */}
      <Modal visible={accountsVisible} animationType="slide" transparent onRequestClose={() => { setAccountsVisible(false); setSelectedAccount(null); setSavedPassword(""); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selectedAccount ? (
              // Password Screen for selected account
              <>
                <Text style={styles.modalTitle}>Enter Password</Text>
                <View style={[styles.accountCard, { marginBottom: 20 }]}>
                  <View style={[styles.accountAvatar, { backgroundColor: getRoleColor(selectedAccount.role) }]}>
                    <Text style={styles.accountAvatarText}>{getRoleIcon(selectedAccount.role)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{selectedAccount.name}</Text>
                    <Text style={styles.accountEmail}>{selectedAccount.email}</Text>
                  </View>
                </View>

                <View style={styles.passwordBox}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={savedPassword}
                    onChangeText={setSavedPassword}
                    secureTextEntry
                    autoFocus
                  />
                </View>

                <TouchableOpacity style={[styles.button, { marginBottom: 10 }]} onPress={loginWithSavedAccount}>
                  <Text style={styles.btnText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelectedAccount(null); setSavedPassword(""); }}>
                  <Text style={styles.cancelBtnText}>← Back</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Accounts List
              <>
                <Text style={styles.modalTitle}>Choose Account</Text>
                <Text style={styles.modalSub}>Select an account to sign in</Text>

                <ScrollView style={{ width: "100%" }}>
                  {savedAccounts.map((account) => (
                    <View key={account.email} style={styles.accountCard}>
                      <TouchableOpacity
                        style={styles.accountInfo}
                        onPress={() => setSelectedAccount(account)}
                      >
                        <View style={[styles.accountAvatar, { backgroundColor: getRoleColor(account.role) }]}>
                          <Text style={styles.accountAvatarText}>{getRoleIcon(account.role)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          <Text style={styles.accountEmail}>{account.email}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(account.role) + "22", borderColor: getRoleColor(account.role) }]}>
                            <Text style={[styles.roleBadgeText, { color: getRoleColor(account.role) }]}>{account.role?.toUpperCase()}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeAccount(account.email)}>
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAccountsVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40 },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 28 },
  savedBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    padding: 14, marginBottom: 20, gap: 10,
  },
  savedBtnIcon: { fontSize: 20 },
  savedBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0f172a" },
  savedBtnArrow: { fontSize: 20, color: "#94a3b8" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { fontSize: 12, color: "#94a3b8" },
  label: { fontSize: 13, fontWeight: "600", color: "#0f172a", marginBottom: 6 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0",
    paddingHorizontal: 14, fontSize: 14, color: "#0f172a", marginBottom: 16,
  },
  passwordRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  forgotText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  passwordBox: {
    flexDirection: "row", alignItems: "center", height: 48,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0",
    paddingHorizontal: 14, marginBottom: 24,
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  showText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  button: {
    height: 52, borderRadius: 14, backgroundColor: "#1e3a8a",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
    shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  bottomText: { textAlign: "center", color: "#64748b", fontSize: 14 },
  link: { color: "#2563eb", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#00000077", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: "center", maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  accountCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 14,
    padding: 14, marginBottom: 10, width: "100%",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  accountInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  accountAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  accountAvatarText: { fontSize: 22 },
  accountName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  accountEmail: { fontSize: 12, color: "#64748b", marginTop: 2 },
  roleBadge: { marginTop: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  roleBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center" },
  removeBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  cancelBtn: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", width: "100%", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontWeight: "600", fontSize: 15 },
});