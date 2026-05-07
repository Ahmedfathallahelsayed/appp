import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase";

export default function StudentRequestsScreen() {

  const [joinedClasses, setJoinedClasses] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [reason, setReason] = useState("");

  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    const user = auth.currentUser;

    if (!user) return;

    // enrollments
    const enrollQuery = query(
      collection(db, "enrollments"),
      where("studentId", "==", user.uid)
    );

    const enrollSnap = await getDocs(enrollQuery);

    let classesArr = [];

    enrollSnap.forEach((d) => {
      classesArr.push({
        id: d.id,
        ...d.data(),
      });
    });

    setJoinedClasses(classesArr);

    // user data
    const userQuery = query(
      collection(db, "users"),
      where("__name__", "==", user.uid)
    );

    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {

      const data = userSnap.docs[0].data();

      setStudentName(
        `${data.firstName || ""} ${data.lastName || ""}`
      );
    }

    // requests
    const requestsQuery = query(
      collection(db, "courseDropRequests"),
      where("studentUid", "==", user.uid)
    );

    const requestsSnap = await getDocs(requestsQuery);

    let reqArr = [];

    requestsSnap.forEach((d) => {
      reqArr.push({
        id: d.id,
        ...d.data(),
      });
    });

    setRequests(reqArr);
  };

  const sendRequest = async () => {

    if (!selectedClass) {
      Alert.alert("Select class");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Write reason");
      return;
    }

    const user = auth.currentUser;

    // منع التكرار
    const alreadyPending = requests.some(
      (r) =>
        r.classId === selectedClass.classId &&
        r.status === "pending"
    );

    if (alreadyPending) {
      Alert.alert("Already pending");
      return;
    }

    try {

      await addDoc(collection(db, "courseDropRequests"), {

        studentUid: user.uid,

        studentName:
          studentName ||
          user.email ||
          "Student",

        classId: selectedClass.classId,

        className: selectedClass.className,

        classCode: selectedClass.classCode,

        reason: reason,

        status: "pending",

        adminReply: "",

        createdAt: serverTimestamp(),

        reviewedAt: null,

        reviewedBy: "",
      });

      Alert.alert("✅ Request sent");

      setReason("");
      setSelectedClass(null);

      fetchData();

    } catch (e) {

      console.log(e);

      Alert.alert("Error");
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Course Drop Request
      </Text>

      <Text style={styles.sub}>
        Select class to remove
      </Text>

      <FlatList
        data={joinedClasses}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 15 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (

          <TouchableOpacity
            style={[
              styles.classCard,
              selectedClass?.classId === item.classId &&
                styles.classCardSelected
            ]}
            onPress={() => setSelectedClass(item)}
          >

            <Text style={styles.className}>
              {item.className}
            </Text>

            <Text style={styles.classCode}>
              {item.classCode}
            </Text>

          </TouchableOpacity>
        )}
      />

      <TextInput
        placeholder="Write reason..."
        value={reason}
        onChangeText={setReason}
        multiline
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.sendBtn}
        onPress={sendRequest}
      >
        <Text style={styles.sendText}>
          Send Request
        </Text>
      </TouchableOpacity>

      <Text style={styles.requestsTitle}>
        My Requests
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (

          <View style={styles.requestCard}>

            <Text style={styles.reqName}>
              {item.className}
            </Text>

            <Text>
              Status: {item.status}
            </Text>

            <Text>
              Reason: {item.reason}
            </Text>

            <Text>
              Reply: {item.adminReply || "No reply yet"}
            </Text>

          </View>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 50,
  },

  sub: {
    color: "gray",
    marginTop: 5,
  },

  classCard: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 14,
    marginRight: 10,
    width: 140,
  },

  classCardSelected: {
    backgroundColor: "#6366f1",
  },

  className: {
    fontWeight: "700",
    color: "#000",
  },

  classCode: {
    marginTop: 5,
    color: "#555",
  },

  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 15,
    height: 120,
    textAlignVertical: "top",
  },

  sendBtn: {
    backgroundColor: "#6366f1",
    padding: 15,
    borderRadius: 14,
    marginTop: 15,
    alignItems: "center",
  },

  sendText: {
    color: "white",
    fontWeight: "700",
  },

  requestsTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 30,
    marginBottom: 15,
  },

  requestCard: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
  },

  reqName: {
    fontWeight: "800",
    marginBottom: 5,
  },

});