import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function InstructorPanel() {
  const [className, setClassName] = useState("");

  const createClass = async () => {
    if (!className.trim()) {
      Alert.alert("Error", "Enter class name");
      return;
    }

    try {
      await addDoc(collection(db, "classes"), {
        name: className,
        instructorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Class created successfully");

      setClassName("");
    } catch (error) {
      console.log(error);
      Alert.alert("Error creating class");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Class</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter class name (ex: Math)"
        value={className}
        onChangeText={setClassName}
      />

      <TouchableOpacity style={styles.button} onPress={createClass}>
        <Text style={styles.buttonText}>Create Class</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },

  input: {
    backgroundColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
