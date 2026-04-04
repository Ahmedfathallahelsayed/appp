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
  Switch,
  Modal,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signOut, updatePassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

export default function HomeScreen() {
  const nav = useNavigation();
  const route = useRoute();

  const [userName, setUserName] = useState("");
  const [classes, setClasses] = useState([]);
  const [role, setRole] = useState(route.params?.role || "");
  const [page, setPage] = useState("dashboard");
  const [className, setClassName] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userDocId, setUserDocId] = useState("");

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
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      setUserName(data.firstName + " " + data.lastName);
      setRole(data.role);
      setUserDocId(docSnap.id);
      setNewFirstName(data.firstName);
      setNewLastName(data.lastName);
    }
  };

  const loadClasses = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "classes"), where("instructorId", "==", user.uid));
    const snapshot = await getDocs(q);
    let list = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setClasses(list);
  };

  const handleLogout = async () => {
    await signOut(auth);
    nav.replace("Login");
  };

  const handleSaveSettings = async () => {
    try {
      if (!newFirstName.trim() || !newLastName.trim()) {
        Alert.alert("Error", "Name fields cannot be empty");
        return;
      }
      await updateDoc(doc(db, "users", userDocId), {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
      });
      if (newPassword.trim().length > 0) {
        if (newPassword.trim().length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters");
          return;
        }
        await updatePassword(auth.currentUser, newPassword.trim());
      }
      setUserName(newFirstName.trim() + " " + newLastName.trim());
      setNewPassword("");
      setSettingsVisible(false);
      Alert.alert("✅ Success", "Settings saved successfully");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to save settings. Please re-login and try again.");
    }
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

  const theme = {
    bg: darkMode ? "#0f172a" : "#f8fafc",
    card: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#0f172a",
    subText: darkMode ? "#94a3b8" : "#64748b",
    border: darkMode ? "#334155" : "#e2e8f0",
    input: darkMode ? "#334155" : "#f1f5f9",
    inputText: darkMode ? "#f1f5f9" : "#0f172a",
    navBg: darkMode ? "#1e293b" : "#ffffff",
  };

  const renderContent = () => {
    if (page === "dashboard") {
      return (
        <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
          <View style={[styles.welcomeCard, { borderLeftColor: getRoleColor(), backgroundColor: theme.card }]}>
            <Text style={styles.welcomeEmoji}>{getRoleIcon()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.welcomeGreeting, { color: theme.subText }]}>Welcome back,</Text>
              <Text style={[styles.welcomeName, { color: theme.text }]}>{userName || "User"}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor() + "22", borderColor: getRoleColor() }]}>
                <Text style={[styles.roleBadgeText, { color: getRoleColor() }]}>
                  {role?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            {[
              { num: "Cairo", label: "University" },
              { num: "Sci", label: "Faculty" },
              { num: role === "instructor" ? classes.length : "—", label: role === "instructor" ? "Classes" : "Active", color: getRoleColor() },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.statNumber, { color: s.color || theme.text }]}>{s.num}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.subText }]}>Quick Actions</Text>
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
              <>
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: "#f59e0b15" }]}
                  onPress={() => nav.navigate("Admin")}
                >
                  <Text style={styles.quickBtnIcon}>👨‍🏫</Text>
                  <Text style={[styles.quickBtnText, { color: "#f59e0b" }]}>Instructors</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: "#f59e0b15" }]}
                  onPress={() => nav.navigate("AdminDashboard")}
                >
                  <Text style={styles.quickBtnIcon}>📊</Text>
                  <Text style={[styles.quickBtnText, { color: "#f59e0b" }]}>Dashboard</Text>
                </TouchableOpacity>
              </>
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
            <Text style={[styles.pageTitle, { color: theme.text }]}>Attendance</Text>
          </View>
          <View style={[styles.attendanceCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.attendanceInfo, { color: theme.subText }]}>
              {role === "student"
                ? "Scan the QR code to mark your attendance"
                : "Attendance records will appear here"}
            </Text>
            {role === "student" && (
              <TouchableOpacity style={styles.scanBtn} onPress={() => nav.navigate("QRScanner")}>
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
            <Text style={[styles.pageTitle, { color: theme.text }]}>My Classes</Text>
          </View>
          <View style={styles.createClassBox}>
            <TextInput
              style={[styles.classInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
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
              <Text style={[styles.emptyText, { color: theme.subText }]}>No classes yet</Text>
            </View>
          ) : (
            classes.map((item) => (
              <View key={item.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                <View style={styles.classCardLeft}>
                  <Text style={styles.classCardIcon}>📖</Text>
                  <Text style={[styles.classCardName, { color: theme.text }]}>{item.name}</Text>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.facultyText, { color: theme.text }]}>Faculty of Science</Text>
          <Text style={[styles.uniText, { color: theme.subText }]}>Cairo University</Text>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity
            style={[styles.settingsIcon, { backgroundColor: darkMode ? "#334155" : "#f1f5f9" }]}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsIconText}>⚙️</Text>
          </TouchableOpacity>

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
      <View style={[styles.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.border }]}>
        {navButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={styles.navBtn}
            onPress={() => setPage(btn.key)}
          >
            <Text style={styles.navBtnIcon}>{btn.icon}</Text>
            <Text style={[
              styles.navBtnLabel,
              { color: theme.subText },
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
          <>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => nav.navigate("Admin")}
            >
              <Text style={styles.navBtnIcon}>👨‍🏫</Text>
              <Text style={[styles.navBtnLabel, { color: theme.subText }]}>Instructors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => nav.navigate("AdminDashboard")}
            >
              <Text style={styles.navBtnIcon}>📊</Text>
              <Text style={[styles.navBtnLabel, { color: theme.subText }]}>Dashboard</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>⚙️ Settings</Text>

            <Text style={[styles.modalLabel, { color: theme.subText }]}>First Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newFirstName}
              onChangeText={setNewFirstName}
              placeholder="First Name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.modalLabel, { color: theme.subText }]}>Last Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newLastName}
              onChangeText={setNewLastName}
              placeholder="Last Name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.modalLabel, { color: theme.subText }]}>New Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Leave empty to keep current"
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />

            <View style={[styles.darkModeRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.darkModeLabel, { color: theme.text }]}>🌙 Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#e2e8f0", true: getRoleColor() }}
                thumbColor={"#ffffff"}
              />
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: getRoleColor() }]} onPress={handleSaveSettings}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setSettingsVisible(false)}>
              <Text style={[styles.cancelBtnText, { color: theme.subText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  facultyText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  uniText: { fontSize: 12, marginTop: 1 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  settingsIconText: { fontSize: 18 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  logoutIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center" },
  logoutIconText: { fontSize: 16, color: "#dc2626" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  welcomeCard: {
    borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center",
    gap: 16, borderLeftWidth: 4, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  welcomeEmoji: { fontSize: 40 },
  welcomeGreeting: { fontSize: 13 },
  welcomeName: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  roleBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statNumber: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { flex: 1, minWidth: "44%", borderRadius: 14, padding: 16, alignItems: "center" },
  quickBtnIcon: { fontSize: 28, marginBottom: 6 },
  quickBtnText: { fontSize: 13, fontWeight: "700" },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, width: "100%" },
  pageIcon: { fontSize: 28 },
  pageTitle: { fontSize: 24, fontWeight: "800" },
  attendanceCard: {
    borderRadius: 16, padding: 24, alignItems: "center", width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  attendanceInfo: { fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  scanBtn: {
    backgroundColor: "#6366f1", flexDirection: "row", alignItems: "center",
    gap: 10, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 14,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  scanBtnIcon: { fontSize: 20 },
  scanBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  createClassBox: { flexDirection: "row", gap: 10, marginBottom: 16 },
  classInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1 },
  createBtn: { backgroundColor: "#10b981", paddingHorizontal: 16, borderRadius: 12, justifyContent: "center" },
  createBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  classCard: {
    borderRadius: 14, padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  classCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  classCardIcon: { fontSize: 22 },
  classCardName: { fontSize: 15, fontWeight: "700", flex: 1 },
  manageBtn: { backgroundColor: "#eff6ff", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  manageBtnText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  bottomNav: {
    flexDirection: "row", borderTopWidth: 1,
    paddingVertical: 8, paddingHorizontal: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  navBtn: { flex: 1, alignItems: "center", paddingVertical: 6, position: "relative" },
  navBtnIcon: { fontSize: 20, marginBottom: 3 },
  navBtnLabel: { fontSize: 10, fontWeight: "600" },
  navIndicator: { position: "absolute", bottom: -8, width: 4, height: 4, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: "#00000077", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 20, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.5 },
  modalInput: { padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1, marginBottom: 14 },
  darkModeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderTopWidth: 1, marginBottom: 16 },
  darkModeLabel: { fontSize: 15, fontWeight: "600" },
  saveBtn: { padding: 14, borderRadius: 14, alignItems: "center", marginBottom: 10 },
  saveBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  cancelBtn: { padding: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontWeight: "600", fontSize: 15 },
});