import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
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

      // جرب الأول بالـ uid مباشرة (الأكاونتات الجديدة)
      let userData = null;
      const directSnap = await getDoc(doc(db, "users", uid));

      if (directSnap.exists()) {
        userData = directSnap.data();
      } else {
        // fallback للأكاونتات القديمة اللي document ID مش uid
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userData = snap.docs[0].data();
        }
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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Welcome back! Please sign in</Text>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Pressable style={styles.button} onPress={onLogin}>
        <Text style={styles.btnText}>Login</Text>
      </Pressable>

      <Text style={styles.bottomText}>
        Don't have an account?{" "}
        <Text style={styles.link} onPress={() => nav.navigate("Register")}>
          Register
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    backgroundColor: "#fff",
    marginTop: 80,
    padding: 24,
    borderRadius: 16,
    alignSelf: "center",
    elevation: 2,
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: {
    fontSize: 13,
    color: "gray",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  inputBox: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600" },
  input: {
    height: 44,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "gainsboro",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  button: {
    height: 48,
    backgroundColor: "dodgerblue",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  bottomText: { marginTop: 16, textAlign: "center", color: "darkgrey" },
  link: { color: "#2563eb", fontWeight: "700" },
});
