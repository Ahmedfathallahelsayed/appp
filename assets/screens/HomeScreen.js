import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Role</Text>

      <View style={styles.roleBox}>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Student")}>
          <Text style={styles.btnText}>Student</Text>
        </Pressable>

        <Pressable style={styles.button}>
          <Text style={styles.btnText}>Admin</Text>
        </Pressable>

        <Pressable style={styles.button}>
          <Text style={styles.btnText}>Instructor</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    alignSelf: "center",
    marginTop: 80,
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  roleBox: {
    gap: 15,
  },
  button: {
    height: 45,
    backgroundColor: "dodgerblue",
    justifyContent: "center",
    borderRadius: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});