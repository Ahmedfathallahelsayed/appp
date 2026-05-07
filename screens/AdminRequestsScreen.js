import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase";

export default function AdminRequestsScreen() {

  const [requests, setRequests] = useState([]);
  const [replies, setReplies] = useState({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {

    try {

      const snap = await getDocs(
        collection(db, "courseDropRequests")
      );

      let arr = [];

      snap.forEach((d) => {
        arr.push({
          id: d.id,
          ...d.data(),
        });
      });

      arr.sort((a, b) => {
        const da = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(0);

        const dbb = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(0);

        return dbb - da;
      });

      setRequests(arr);

    } catch (e) {
      console.log(e);
    }
  };

  const removeStudentFromClass = async (
    studentUid,
    classId
  ) => {

    const enrollQuery = query(
      collection(db, "enrollments"),
      where("studentId", "==", studentUid),
      where("classId", "==", classId)
    );

    const enrollSnap = await getDocs(enrollQuery);

    for (const enrollDoc of enrollSnap.docs) {

      await deleteDoc(
        doc(db, "enrollments", enrollDoc.id)
      );
    }

    const sessionsQuery = query(
      collection(db, "sessions"),
      where("classId", "==", classId)
    );

    const sessionsSnap = await getDocs(sessionsQuery);

    for (const sessionDoc of sessionsSnap.docs) {

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionDoc.id),
        where("studentUid", "==", studentUid)
      );

      const attendanceSnap = await getDocs(attendanceQuery);

      for (const attDoc of attendanceSnap.docs) {

        await deleteDoc(
          doc(db, "attendance", attDoc.id)
        );
      }
    }
  };

  const approveRequest = async (req) => {

    try {

      const reply =
        replies[req.id] ||
        "Request approved";

      await removeStudentFromClass(
        req.studentUid,
        req.classId
      );

      await updateDoc(
        doc(db, "courseDropRequests", req.id),
        {
          status: "approved",
          adminReply: reply,
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || "",
        }
      );

      Alert.alert("Approved");

      fetchRequests();

    } catch (e) {

      console.log(e);

      Alert.alert("Error");
    }
  };

  const rejectRequest = async (req) => {

    const reply = replies[req.id];

    if (!reply?.trim()) {
      Alert.alert("Write rejection reason");
      return;
    }

    try {

      await updateDoc(
        doc(db, "courseDropRequests", req.id),
        {
          status: "rejected",
          adminReply: reply,
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || "",
        }
      );

      Alert.alert("Rejected");

      fetchRequests();

    } catch (e) {

      console.log(e);

      Alert.alert("Error");
    }
  };

  const renderItem = ({ item }) => (

    <View style={styles.card}>

      <Text style={styles.className}>
        {item.className}
      </Text>

      <Text style={styles.meta}>
        Student: {item.studentName}
      </Text>

      <Text style={styles.meta}>
        Code: {item.classCode}
      </Text>

      <Text style={styles.meta}>
        Status: {item.status}
      </Text>

      <Text style={styles.meta}>
        Reason: {item.reason}
      </Text>

      {item.adminReply ? (
        <Text style={styles.reply}>
          Reply: {item.adminReply}
        </Text>
      ) : null}

      {item.status === "pending" && (

        <>
          <TextInput
            placeholder="Write reply..."
            value={replies[item.id] || ""}
            onChangeText={(text) =>
              setReplies((prev) => ({
                ...prev,
                [item.id]: text,
              }))
            }
            style={styles.input}
            multiline
          />

          <View style={styles.btnRow}>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() =>
                approveRequest(item)
              }
            >
              <Text style={styles.btnText}>
                Approve
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() =>
                rejectRequest(item)
              }
            >
              <Text style={styles.btnText}>
                Reject
              </Text>
            </TouchableOpacity>

          </View>
        </>
      )}

    </View>
  );

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Course Drop Requests
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 50,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 16,
    marginBottom: 14,
  },

  className: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  meta: {
    marginBottom: 5,
    color: "#334155",
  },

  reply: {
    marginTop: 10,
    color: "#16a34a",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    height: 90,
    textAlignVertical: "top",
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  approveBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  btnText: {
    color: "white",
    fontWeight: "700",
  },

});