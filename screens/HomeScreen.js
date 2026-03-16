import React, { useState, useEffect } from "react";
import DigitalID from "./DigitalID";
import { useRoute } from "@react-navigation/native";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export default function HomeScreen() {
  const nav = useNavigation();
  const route = useRoute();

  const [userName, setUserName] = useState("");
  const [classes, setClasses] = useState([]);
  const [role, setRole] = useState(route.params?.role || "");
  const [page, setPage] = useState("dashboard");
  const [className, setClassName] = useState("");

  useEffect(() => {
    loadUserData();
    loadClasses();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      setUserName(data.firstName + " " + data.lastName);
      setRole(data.role);
    }
  };

  const loadClasses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "classes"),
      where("instructorId", "==", user.uid),
    );

    const snapshot = await getDocs(q);
    let list = [];

    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });

    setClasses(list);
  };

  const handleLogout = async () => {
    await signOut(auth);
    nav.replace("Login");
  };

  const createClass = async () => {
    if (!className.trim()) {
      Alert.alert("Enter class name");
      return;
    }

    try {
      await addDoc(collection(db, "classes"), {
        name: className,
        instructorId: auth.currentUser.uid,
        createdAt: new Date(),
      });

      Alert.alert("Class created");
      setClassName("");
      loadClasses();
    } catch (error) {
      console.log(error);
    }
  };

  const renderContent = () => {
    if (page === "dashboard") {
      return <Text style={styles.welcome}>Welcome to your Dashboard</Text>;
    }

    if (page === "attendance") {
      return (
        <View style={{ alignItems: "center" }}>
          <Text style={styles.welcome}>Attendance Page</Text>
          {role === "student" && (
            <TouchableOpacity
              style={[styles.createBtn, { marginTop: 30, paddingHorizontal: 30 }]}
              onPress={() => nav.navigate("QRScanner")}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                📷 Scan QR
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (page === "digitalID" && role === "student") {
      return <DigitalID />;
    }

    if (page === "classes" && role === "instructor") {
      return (
        <ScrollView style={{ width: "100%" }}>
          <Text style={styles.title}>Instructor Panel</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter class name"
            value={className}
            onChangeText={setClassName}
          />

          <TouchableOpacity style={styles.createBtn} onPress={createClass}>
            <Text style={{ color: "white", fontWeight: "700" }}>
              Create Class
            </Text>
          </TouchableOpacity>

          {classes.map((item) => (
            <View key={item.id} style={styles.classCard}>
              <Text style={styles.className}>{item.name}</Text>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => nav.navigate("ManageClass", { classId: item.id })}
              >
                <Text style={{ color: "white" }}>Manage Class</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.facultyText}>
            Faculty of Science - Cairo University
          </Text>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.userName}>👤 {userName}</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>

        <View style={styles.rightSide}>{renderContent()}</View>

        <View style={styles.bottomBtns}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setPage("dashboard")}
          >
            <Text style={styles.menuBtnText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setPage("attendance")}
          >
            <Text style={styles.menuBtnText}>Attendance</Text>
          </TouchableOpacity>

          {role === "instructor" && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setPage("classes")}
            >
              <Text style={styles.menuBtnText}>Classes</Text>
            </TouchableOpacity>
          )}

          {role === "student" && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setPage("digitalID")}
            >
              <Text style={styles.menuBtnText}>Digital ID</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuBtn, styles.logoutBtn]}
            onPress={handleLogout}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  facultyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
  },
  role: {
    fontSize: 13,
    color: "gray",
    marginTop: 4,
  },
  rightSide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  createBtn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  classCard: {
    backgroundColor: "#e2e8f0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  className: {
    fontWeight: "700",
  },
  manageBtn: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8,
  },
  bottomBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  menuBtn: {
    backgroundColor: "#2563eb1A",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: "22%",
    alignItems: "center",
  },
  menuBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
    textAlign: "center",
  },
  logoutBtn: {
    backgroundColor: "#dc2626",
  },
});