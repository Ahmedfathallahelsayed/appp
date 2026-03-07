import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue</Text>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <Pressable style={styles.button}>
        <Text style={styles.btnText}>Login</Text>
      </Pressable>

      <Text style={styles.bottomText}>
        Don’t have an account?{" "}
        <Text style={styles.link} onPress={() => nav.navigate("Student")}>
          Register
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    backgroundColor: "white",
    marginTop: 80,
    padding: 25,
    borderRadius: 15,
    alignSelf: "center",
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
  },
  inputBox: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    height: 40,
    marginTop: 5,
    borderRadius: 8,
    backgroundColor: "gainsboro",
    paddingLeft: 10,
    borderWidth: 1,
  },
  button: {
    height: 45,
    backgroundColor: "dodgerblue",
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  bottomText: {
    marginTop: 15,
    textAlign: "center",
    color: "darkgrey",
  },
  link: {
    color: "dodgerblue",
    fontWeight: "bold",
  },
});