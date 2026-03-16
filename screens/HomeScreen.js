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
  StatusBar,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

const NAV_ITEMS = {
  student: ["dashboard", "attendance", "digitalID"],
  instructor: ["dashboard", "attendance", "classes"],
  admin: ["dashboard", "attendance"],
};

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
    const q = query(collection(db, "classes"), where("instructorId", "==", user.uid));
    const snapshot = await getDocs(q);
    let list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    setClasses(list);
  };

  const handleLogout = async () => {
    await signOut(auth);
    nav.replace("Login");
  };

  const createClass = async () => {
    if (!className.trim()) { Alert.alert("Enter class name"); return; }
    try {
      await addDoc(collection(db, "classes"), {
        name: className,
        instructorId: auth.currentUser.uid,
        createdAt: new Date(),
      });
      Alert.alert("Class created");
      setClassName("");
      loadClasses();
    } catch (error) { console.log(error); }
  };

  const getRoleColor = () => {
    if (role === "admin") return "#f59e0b";
    if (role === "instructor") return "#10b981";
    return "#6366f1";
  };

  const getRoleIcon = () => {
    if (role === "admin") return "⚙️";
    if (role === "instructor") return "🎓";
    return "📚";
  };

  const renderContent = () => {
    if (page === "dashboard") {
      return (
        <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
          {/* Welcome Card */}
          <View style={[styles.welcomeCard, { borderLeftColor: getRoleColor() }]}>
            <Text style={styles.welcomeEmoji}>{getRoleIcon()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{userName || "User"}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor() + "22", borderColor: getRoleColor() }]}>
                <Text style={[styles.roleBadgeText, { color: getRoleColor() }]}>
                  {role?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>Cairo</Text>
              <Text style={styles.statLabel}>University</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>Sci</Text>
              <Text style={styles.statLabel}>Faculty</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: getRoleColor() }]}>
                {role === "instructor" ? classes.length : "—"}
              </Text>
              <Text style={styles.statLabel}>
                {role === "instructor" ? "Classes" : "Active"}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: getRoleColor() + "15" }]}
              onPress={() => setPage("attendance")}
            >
              <Text style={styles.quickBtnIcon}>📋</Text>
              <Text style={[styles.quickBtnText, { color: getRoleColor() }]}>Attendance</Text>
            </TouchableOpacity>

            {role === "student" && (
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#6366f115" }]}
                onPress={() => setPage("digitalID")}
              >
                <Text style={styles.quickBtnIcon}>🪪</Text>
                <Text style={[styles.quickBtnText, { color: "#6366f1" }]}>Digital ID</Text>
              </TouchableOpacity>
            )}

            {role === "instructor" && (
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#10b98115" }]}
                onPress={() => setPage("classes")}
              >
                <Text style={styles.quickBtnIcon}>🏫</Text>
                <Text style={[styles.quickBtnText, { color: "#10b981" }]}>My Classes</Text>
              </TouchableOpacity>
            )}

            {role === "admin" && (
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#f59e0b15" }]}
                onPress={() => nav.navigate("Admin")}
              >
                <Text style={styles.quickBtnIcon}>👨‍🏫</Text>
                <Text style={[styles.quickBtnText, { color: "#f59e0b" }]}>Instructors</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    if (page === "attendance") {
      return (
        <View style={{ alignItems: "center", width: "100%" }}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageIcon}>📋</Text>
            <Text style={styles.pageTitle}>Attendance</Text>
          </View>
          <View style={styles.attendanceCard}>
            <Text style={styles.attendanceInfo}>
              {role === "student"
                ? "Scan the QR code to mark your attendance"
                : "Attendance records will appear here"}
            </Text>
            {role === "student" && (
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => nav.navigate("QRScanner")}
              >
                <Text style={styles.scanBtnIcon}>📷</Text>
                <Text style={styles.scanBtnText}>Scan QR Code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (page === "digitalID" && role === "student") {
      return <DigitalID />;
    }

    if (page === "classes" && role === "instructor") {
      return (
        <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageIcon}>🏫</Text>
            <Text style={styles.pageTitle}>My Classes</Text>
          </View>

          <View style={styles.createClassBox}>
            <TextInput
              style={styles.classInput}
              placeholder="New class name..."
              placeholderTextColor="#94a3b8"
              value={className}
              onChangeText={setClassName}
            />
            <TouchableOpacity style={styles.createBtn} onPress={createClass}>
              <Text style={styles.createBtnText}>+ Create</Text>
            </TouchableOpacity>
          </View>

          {classes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏫</Text>
              <Text style={styles.emptyText}>No classes yet</Text>
            </View>
          ) : (
            classes.map((item) => (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.classCardLeft}>
                  <Text style={styles.classCardIcon}>📖</Text>
                  <Text style={styles.classCardName}>{item.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => nav.navigate("ManageClass", { classId: item.id })}
                >
                  <Text style={styles.manageBtnText}>Manage →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      );
    }

    return null;
  };

  const navButtons = [
    { key: "dashboard", label: "Home", icon: "🏠" },
    { key: "attendance", label: "Attendance", icon: "📋" },
    ...(role === "student" ? [{ key: "digitalID", label: "ID Card", icon: "🪪" }] : []),
    ...(role === "instructor" ? [{ key: "classes", label: "Classes", icon: "🏫" }] : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.facultyText}>Faculty of Science</Text>
          <Text style={styles.uniText}>Cairo University</Text>
        </View>
        <View style={styles.topRight}>
          <View style={[styles.avatarCircle, { backgroundColor: getRoleColor() }]}>
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
            <Text style={styles.logoutIconText}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {navButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={[styles.navBtn, page === btn.key && styles.navBtnActive]}
            onPress={() => setPage(btn.key)}
          >
            <Text style={styles.navBtnIcon}>{btn.icon}</Text>
            <Text style={[
              styles.navBtnLabel,
              page === btn.key && { color: getRoleColor(), fontWeight: "700" }
            ]}>
              {btn.label}
            </Text>
            {page === btn.key && (
              <View style={[styles.navIndicator, { backgroundColor: getRoleColor() }]} />
            )}
          </TouchableOpacity>
        ))}

        {role === "admin" && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => nav.navigate("Admin")}
          >
            <Text style={styles.navBtnIcon}>👨‍🏫</Text>
            <Text style={styles.navBtnLabel}>Instructors</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  facultyText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.3,
  },
  uniText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutIconText: {
    fontSize: 16,
    color: "#dc2626",
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeEmoji: {
    fontSize: 40,
  },
  welcomeGreeting: {
    fontSize: 13,
    color: "#64748b",
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  quickBtnIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Page Header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  pageIcon: {
    fontSize: 28,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },

  // Attendance
  attendanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  attendanceInfo: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  scanBtn: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scanBtnIcon: {
    fontSize: 20,
  },
  scanBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },

  // Classes
  createClassBox: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  classInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  createBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  createBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
  classCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  classCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  classCardIcon: {
    fontSize: 22,
  },
  classCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  manageBtn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  manageBtnText: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  navBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    position: "relative",
  },
  navBtnActive: {
    // active state handled inline
  },
  navBtnIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  navBtnLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
  },
  navIndicator: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});