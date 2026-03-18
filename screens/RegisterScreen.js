import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        uniEmail,
        password,
      );
      const uid = userCredential.user.uid;

      const studentId = await generateStudentId();

      // ✅ الـ document بالـ uid مش بالـ studentId
      await setDoc(doc(db, "users", uid), {
        uid: uid,
        studentId: studentId,
        firstName: first,
        lastName: last,
        email: uniEmail,
        nationalId: nid,
        role: role,
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
    <ScrollView contentContainerStyle={{ paddingVertical: 40 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Select your role and fill in your details
        </Text>

        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const selected = role === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleChip, selected && styles.roleChipSelected]}
              >
                <Text
                  style={[styles.roleText, selected && styles.roleTextSelected]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={first}
              onChangeText={setFirst}
            />
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={last}
              onChangeText={setLast}
            />
          </View>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>University Email</Text>
          <TextInput
            style={styles.input}
            value={uniEmail}
            onChangeText={setUniEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>National ID</Text>
          <TextInput
            style={styles.input}
            value={nid}
            onChangeText={setNid}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Pressable style={styles.button} onPress={onRegister}>
          <Text style={styles.btnText}>Create Account</Text>
        </Pressable>

        <Text style={styles.bottomText}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => nav.navigate("Login")}>
            Login
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignSelf: "center",
  },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: {
    fontSize: 13,
    color: "gray",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  roleChipSelected: { backgroundColor: "#2563eb1A", borderColor: "#2563eb" },
  roleText: { fontWeight: "600" },
  roleTextSelected: { color: "#2563eb" },
  row: { flexDirection: "row", gap: 16 },
  inputBox: { flex: 1, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600" },
  input: {
    height: 44,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "gainsboro",
    paddingHorizontal: 10,
  },
  button: {
    height: 48,
    backgroundColor: "dodgerblue",
    justifyContent: "center",
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  bottomText: { marginTop: 16, textAlign: "center", color: "darkgrey" },
  link: { color: "#2563eb", fontWeight: "700" },
});
