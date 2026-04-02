import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { generateStudentId } from "../utils/generateStudentId";

const ROLES = ["student", "instructor", "admin"];

export default function RegisterScreen() {
  const nav = useNavigation();
  const [role, setRole] = useState("student");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [uniEmail, setUniEmail] = useState("");
  const [nid, setNid] = useState("");
  const [password, setPassword] = useState("");

  const onRegister = async () => {
    if (!first || !last || !uniEmail || !nid || !password) {
      Alert.alert("Missing", "Please fill all fields.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, uniEmail, password);
      const studentId = await generateStudentId();
      await setDoc(doc(db, "users", String(studentId)), {
        uid: userCredential.user.uid,
        studentId,
        firstName: first,
        lastName: last,
        email: uniEmail,
        nationalId: nid,
        role,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Account created!");
      nav.navigate("Login");
    } catch (error) {
      console.log("ERROR CODE:", error.code);
      Alert.alert("Register Error", error.code);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Image
          source={require("../assets/cairo_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Select your role and fill in your details</Text>

        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const selected = role === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleChip, selected && styles.roleChipSelected]}
              >
                <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#94a3b8"
              value={first}
              onChangeText={setFirst}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#94a3b8"
              value={last}
              onChangeText={setLast}
            />
          </View>
        </View>

        <Text style={styles.label}>University Email</Text>
        <TextInput
          style={styles.inputFull}
          placeholder="you@university.edu"
          placeholderTextColor="#94a3b8"
          value={uniEmail}
          onChangeText={setUniEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>National ID</Text>
        <TextInput
          style={styles.inputFull}
          placeholder="Enter National ID"
          placeholderTextColor="#94a3b8"
          value={nid}
          onChangeText={setNid}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.inputFull}
          placeholder="Create password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={onRegister}>
          <Text style={styles.btnText}>
            Create Account ({role.charAt(0).toUpperCase() + role.slice(1)})
          </Text>
        </Pressable>

        <Text style={styles.bottomText}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => nav.navigate("Login")}>
            Sign in
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
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  roleChipSelected: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  roleText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  roleTextSelected: { color: "#2563eb" },
  nameRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#0f172a", marginBottom: 6 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0",
    paddingHorizontal: 14, fontSize: 14, color: "#0f172a",
  },
  inputFull: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0",
    paddingHorizontal: 14, fontSize: 14, color: "#0f172a", marginBottom: 16,
  },
  button: {
    height: 52, borderRadius: 14, backgroundColor: "#1e3a8a",
    justifyContent: "center", alignItems: "center",
    marginBottom: 20, marginTop: 4,
    shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  bottomText: { textAlign: "center", color: "#64748b", fontSize: 14 },
  link: { color: "#2563eb", fontWeight: "700" },
});