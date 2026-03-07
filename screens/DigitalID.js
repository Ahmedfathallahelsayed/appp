import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function DigitalID() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("Computer Science");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadUser(user);
      }
    });

    return unsubscribe;
  }, []);

  const loadUser = async (user) => {
    try {
      const q = query(collection(db, "users"), where("uid", "==", user.uid));

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();

        setName(data.firstName + " " + data.lastName);
        setStudentId(data.studentId?.toString());
      }
    } catch (error) {
      console.log(error);
    }
  };

  const copyId = () => {
    Alert.alert("Copied", "Student ID copied");
  };

  return (
    <View style={styles.container}>
      <View style={styles.idCard}>
        <Text style={styles.faculty}>
          Faculty of Science - Cairo University
        </Text>

        <Text style={styles.name}>{name || "Loading..."}</Text>

        <Text style={styles.department}>{department}</Text>

        <Text style={styles.status}>ACTIVE</Text>

        <Text style={styles.idLabel}>ID NUMBER</Text>

        <Text style={styles.idNumber}>{studentId || "..."}</Text>

        {studentId && (
          <View style={styles.qrContainer}>
            <QRCode value={studentId} size={120} />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.copyBtn} onPress={copyId}>
        <Text>Copy ID Number</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.lostBtn}>
        <Text style={{ color: "red" }}>Report Lost Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },

  idCard: {
    width: 300,
    backgroundColor: "#2563eb",
    borderRadius: 20,
    padding: 20,
  },

  faculty: {
    color: "white",
  },

  name: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
  },

  department: {
    color: "white",
  },

  status: {
    backgroundColor: "#22c55e",
    color: "white",
    padding: 5,
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 8,
  },

  idLabel: {
    color: "white",
    marginTop: 25,
  },

  idNumber: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  qrContainer: {
    marginTop: 20,
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
  },

  copyBtn: {
    marginTop: 20,
    backgroundColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    width: 300,
    alignItems: "center",
  },

  lostBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "red",
    padding: 12,
    borderRadius: 10,
    width: 300,
    alignItems: "center",
  },
});
