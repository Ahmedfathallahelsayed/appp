import React from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from "react-native";

export default function StudentScreen() {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 50 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Student Registration</Text>
        <Text style={styles.subtitle}>Create your digital campus identity</Text>

        <View style={styles.row}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} placeholder="First Name" />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} placeholder="Last Name" />
          </View>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Email" />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>University Email</Text>
          <TextInput style={styles.input} placeholder="University Email" />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>National ID</Text>
          <TextInput style={styles.input} placeholder="ID" />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Password" secureTextEntry />
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.btnText}>Create Account</Text>
        </Pressable>

        <Text style={styles.bottomText}>
          Already have an account? <Text style={styles.link}>Log in</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
    alignSelf: "center",
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 20,
  },
  inputBox: {
    flex: 1,
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
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    height: 45,
    backgroundColor: "dodgerblue",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 15,
  },
  bottomText: {
    marginTop: 15,
    fontSize: 13,
    textAlign: "center",
  },
  link: {
    color: "dodgerblue",
    fontWeight: "bold",
  },
});