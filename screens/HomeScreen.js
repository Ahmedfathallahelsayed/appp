import React, { useState, useEffect } from "react";
import DigitalID from "./DigitalID";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import ChatAssistant from "./ChatAssistant";
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
  Image,
} from "react-native";

import { auth, db } from "../firebase";
import { signOut, updatePassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const DAYS_ORDER = [
  "Saturday", "Sunday", "Monday", "Tuesday",
  "Wednesday", "Thursday", "Friday",
];

export default function HomeScreen() {
  const nav = useNavigation();
  const route = useRoute();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [classes, setClasses] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [role, setRole] = useState(route.params?.role || "");
  const [page, setPage] = useState("dashboard");
  const [className, setClassName] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [userUid, setUserUid] = useState("");

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userDocId, setUserDocId] = useState("");

  const [studentAttendanceCount, setStudentAttendanceCount] = useState(0);
  const [instructorStudentCount, setInstructorStudentCount] = useState(0);
  const [instructorAttendanceCount, setInstructorAttendanceCount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!role || !userUid) return;
    if (role === "student") {
      loadMyClasses();
      loadStudentAttendanceCount();
    }
    if (role === "instructor") {
      loadClasses();
    }
  }, [role, userUid]);

  useEffect(() => {
    if (role === "instructor") {
      loadInstructorDashboardStats();
    }
  }, [role, classes]);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setUserUid(user.uid);
    setUserEmail(user.email || "");

    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      setUserName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
      setRole(data.role || "");
      setStudentId(data.studentId || "");
      setUserDocId(docSnap.id);
      setNewFirstName(data.firstName || "");
      setNewLastName(data.lastName || "");
      setUserDepartment(data.department || "Faculty of Science");
      setProfileImage(data.profileImage || null);
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

  const loadMyClasses = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, "enrollments"), where("studentId", "==", user.uid));
      const snapshot = await getDocs(q);
      let enrollments = [];
      let classIds = [];
      snapshot.forEach((d) => {
        enrollments.push({ enrollId: d.id, ...d.data() });
        classIds.push(d.data().classId);
      });
      setMyEnrollments(enrollments);
      let classList = [];
      for (let cid of classIds) {
        const classSnap = await getDocs(query(collection(db, "classes"), where("__name__", "==", cid)));
        classSnap.forEach((d) => classList.push({ id: d.id, ...d.data() }));
      }
      setMyClasses(classList);
    } catch (e) { console.log(e); }
  };

  const loadStudentAttendanceCount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, "attendance"), where("studentUid", "==", user.uid));
      const snapshot = await getDocs(q);
      setStudentAttendanceCount(snapshot.size);
    } catch (e) {
      setStudentAttendanceCount(0);
    }
  };

  const loadInstructorDashboardStats = async () => {
    try {
      if (classes.length === 0) {
        setInstructorStudentCount(0);
        setInstructorAttendanceCount(0);
        return;
      }
      const classIds = classes.map((c) => c.id);
      const enrollmentsSnap = await getDocs(collection(db, "enrollments"));
      const attendanceSnap = await getDocs(collection(db, "attendance"));
      const uniqueStudents = new Set();
      let attendanceTotal = 0;
      enrollmentsSnap.forEach((d) => {
        const data = d.data();
        if (classIds.includes(data.classId)) uniqueStudents.add(data.studentId);
      });
      attendanceSnap.forEach((d) => {
        const data = d.data();
        if (classIds.includes(data.classId)) attendanceTotal += 1;
      });
      setInstructorStudentCount(uniqueStudents.size);
      setInstructorAttendanceCount(attendanceTotal);
    } catch (e) {
      setInstructorStudentCount(0);
      setInstructorAttendanceCount(0);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image);
      // حفظ في Firestore
      await updateDoc(doc(db, "users", userDocId), {
        profileImage: base64Image,
      });
    }
  };

  const removeImage = async () => {
    Alert.alert("Remove Photo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setProfileImage(null);
          await updateDoc(doc(db, "users", userDocId), { profileImage: null });
        },
      },
    ]);
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) { Alert.alert("Enter class code"); return; }
    try {
      const q = query(collection(db, "classes"), where("classCode", "==", joinCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) { Alert.alert("❌ Error", "Class code not found"); return; }
      const classDoc = snapshot.docs[0];
      const classId = classDoc.id;
      const enrollQ = query(
        collection(db, "enrollments"),
        where("studentId", "==", auth.currentUser.uid),
        where("classId", "==", classId)
      );
      const enrollSnap = await getDocs(enrollQ);
      if (!enrollSnap.empty) { Alert.alert("Already enrolled in this class"); return; }
      await addDoc(collection(db, "enrollments"), {
        studentId: auth.currentUser.uid,
        studentName: userName,
        classId,
        joinedAt: new Date(),
      });
      Alert.alert("✅ Success", "You joined the class!");
      setJoinCode("");
      loadMyClasses();
    } catch (e) {
      Alert.alert("Error", "Something went wrong");
    }
  };

  const handleLeaveClass = (classId, className) => {
    Alert.alert("Leave Class", `Are you sure you want to leave "${className}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const enrollment = myEnrollments.find((e) => e.classId === classId);
            if (enrollment) {
              await deleteDoc(doc(db, "enrollments", enrollment.enrollId));
              Alert.alert("✅ You left the class");
              loadMyClasses();
            }
          } catch (e) {
            Alert.alert("Error", "Failed to leave class");
          }
        },
      },
    ]);
  };

  const handleDeleteClass = (classId, classNameToDelete) => {
    Alert.alert("Delete Class", `Are you sure you want to delete "${classNameToDelete}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "classes", classId));
            const enrollQ = query(collection(db, "enrollments"), where("classId", "==", classId));
            const enrollSnap = await getDocs(enrollQ);
            const deletePromises = enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id)));
            await Promise.all(deletePromises);
            Alert.alert("✅ Class deleted");
            loadClasses();
          } catch (e) {
            Alert.alert("Error", "Failed to delete class");
          }
        },
      },
    ]);
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
      setUserName(`${newFirstName.trim()} ${newLastName.trim()}`);
      setNewPassword("");
      setSettingsVisible(false);
      Alert.alert("✅ Success", "Settings saved successfully");
    } catch (error) {
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

  const getSchedule = () => {
    const schedule = {};
    myClasses.forEach((cls) => {
      if (cls.day) {
        if (!schedule[cls.day]) schedule[cls.day] = [];
        schedule[cls.day].push(cls);
      }
    });
    return schedule;
  };

  // حساب نسبة الغياب
  const totalPossibleAttendance = myClasses.length * 10; // افتراضي 10 محاضرات لكل كلاس
  const absenceRate = totalPossibleAttendance > 0
    ? Math.round(((totalPossibleAttendance - studentAttendanceCount) / totalPossibleAttendance) * 100)
    : 0;

  const renderDashboardStats = () => {
    if (role === "student") {
      return (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#6366f1" }]}>{myClasses.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Enrolled Classes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#10b981" }]}>{studentAttendanceCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Lectures Attended</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#f59e0b" }]}>{studentId || "—"}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Student ID</Text>
            </View>
          </View>
          {myClasses.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>ENROLLED CLASSES PREVIEW</Text>
              {myClasses.slice(0, 3).map((item) => (
                <View key={item.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                  <View style={styles.classCardLeft}>
                    <Text style={styles.classCardIcon}>📖</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.classCardName, { color: theme.text }]}>{item.name}</Text>
                      {item.classCode && <Text style={[styles.classCode, { color: theme.subText }]}>Code: {item.classCode}</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      );
    }

    if (role === "instructor") {
      return (
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#10b981" }]}>{classes.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>My Classes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#6366f1" }]}>{instructorStudentCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Enrolled Students</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.statNumber, { color: "#f59e0b" }]}>{instructorAttendanceCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Attendance Records</Text>
            </View>
          </View>
          {classes.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.subText }]}>RECENT CLASSES</Text>
              {classes.slice(0, 3).map((item) => (
                <View key={item.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                  <View style={styles.classCardLeft}>
                    <Text style={styles.classCardIcon}>🏫</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.classCardName, { color: theme.text }]}>{item.name}</Text>
                      {item.classCode && <Text style={[styles.classCode, { color: theme.subText }]}>Code: {item.classCode}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => nav.navigate("ManageClass", { classId: item.id })}>
                    <Text style={styles.manageBtnText}>Manage →</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </>
      );
    }

    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: "#f59e0b" }]}>Admin</Text>
          <Text style={[styles.statLabel, { color: theme.subText }]}>Access Level</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: "#2563eb" }]}>Users</Text>
          <Text style={[styles.statLabel, { color: theme.subText }]}>Management</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: "#10b981" }]}>Data</Text>
          <Text style={[styles.statLabel, { color: theme.subText }]}>Overview</Text>
        </View>
      </View>
    );
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
                <Text style={[styles.roleBadgeText, { color: getRoleColor() }]}>{role?.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {renderDashboardStats()}

          <Text style={[styles.sectionTitle, { color: theme.subText }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: getRoleColor() + "15" }]} onPress={() => setPage("attendance")}>
              <Text style={styles.quickBtnIcon}>📋</Text>
              <Text style={[styles.quickBtnText, { color: getRoleColor() }]}>Attendance</Text>
            </TouchableOpacity>

            {role === "student" && (
              <>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#6366f115" }]} onPress={() => setPage("digitalID")}>
                  <Text style={styles.quickBtnIcon}>🪪</Text>
                  <Text style={[styles.quickBtnText, { color: "#6366f1" }]}>Digital ID</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#6366f115" }]} onPress={() => setPage("myClasses")}>
                  <Text style={styles.quickBtnIcon}>📚</Text>
                  <Text style={[styles.quickBtnText, { color: "#6366f1" }]}>My Classes</Text>
                </TouchableOpacity>
              </>
            )}

            {role === "instructor" && (
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#10b98115" }]} onPress={() => setPage("classes")}>
                <Text style={styles.quickBtnIcon}>🏫</Text>
                <Text style={[styles.quickBtnText, { color: "#10b981" }]}>My Classes</Text>
              </TouchableOpacity>
            )}

            {role === "admin" && (
              <>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#f59e0b15" }]} onPress={() => nav.navigate("Admin")}>
                  <Text style={styles.quickBtnIcon}>👨‍🏫</Text>
                  <Text style={[styles.quickBtnText, { color: "#f59e0b" }]}>Instructors</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#f59e0b15" }]} onPress={() => nav.navigate("AdminDashboard")}>
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
      const schedule = getSchedule();
      const sortedDays = DAYS_ORDER.filter((d) => schedule[d]);
      return (
        <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageIcon}>📋</Text>
            <Text style={[styles.pageTitle, { color: theme.text }]}>Attendance</Text>
          </View>

          {role === "student" && (
            <>
              <TouchableOpacity style={styles.scanBtn} onPress={() => nav.navigate("QRScanner")}>
                <Text style={styles.scanBtnIcon}>📷</Text>
                <Text style={styles.scanBtnText}>Scan QR Code</Text>
              </TouchableOpacity>

              {myClasses.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.subText, marginTop: 20 }]}>MY SCHEDULE</Text>
                  {sortedDays.length === 0 ? (
                    <View style={[styles.scheduleEmpty, { backgroundColor: theme.card }]}>
                      <Text style={[styles.scheduleEmptyText, { color: theme.subText }]}>
                        No schedule set yet. Ask your instructor to add class times.
                      </Text>
                    </View>
                  ) : (
                    sortedDays.map((day) => (
                      <View key={day} style={styles.daySection}>
                        <View style={[styles.dayHeader, { backgroundColor: getRoleColor() }]}>
                          <Text style={styles.dayHeaderText}>{day}</Text>
                        </View>
                        {schedule[day].map((cls) => (
                          <View key={cls.id} style={[styles.scheduleCard, { backgroundColor: theme.card }]}>
                            <View style={[styles.scheduleColorBar, { backgroundColor: getRoleColor() }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.scheduleClassName, { color: theme.text }]}>{cls.name}</Text>
                              {cls.classCode && <Text style={[styles.scheduleCode, { color: theme.subText }]}>Code: {cls.classCode}</Text>}
                            </View>
                            <View style={styles.scheduleTime}>
                              <Text style={[styles.scheduleTimeText, { color: getRoleColor() }]}>{cls.fromTime}</Text>
                              <Text style={[styles.scheduleTimeSep, { color: theme.subText }]}>→</Text>
                              <Text style={[styles.scheduleTimeText, { color: getRoleColor() }]}>{cls.toTime}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}

          {role !== "student" && (
            <View style={[styles.attendanceCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.attendanceInfo, { color: theme.subText }]}>Attendance records will appear here</Text>
            </View>
          )}
        </ScrollView>
      );
    }

    if (page === "digitalID" && role === "student") return <DigitalID />;

    if (page === "myClasses" && role === "student") {
      return (
        <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageIcon}>📚</Text>
            <Text style={[styles.pageTitle, { color: theme.text }]}>My Classes</Text>
          </View>

          <View style={[styles.joinBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.joinTitle, { color: theme.text }]}>Join a Class</Text>
            <Text style={[styles.joinSub, { color: theme.subText }]}>Enter the class code to enroll</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={[styles.joinInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
                placeholder="Class code (e.g. CS101)"
                placeholderTextColor="#94a3b8"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.joinBtn} onPress={handleJoinClass}>
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.subText, marginTop: 20 }]}>ENROLLED CLASSES</Text>

          {myClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={[styles.emptyText, { color: theme.subText }]}>No classes yet, join one!</Text>
            </View>
          ) : (
            myClasses.map((item) => (
              <View key={item.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                <View style={styles.classCardLeft}>
                  <Text style={styles.classCardIcon}>📖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.classCardName, { color: theme.text }]}>{item.name}</Text>
                    {item.classCode && <Text style={[styles.classCode, { color: theme.subText }]}>Code: {item.classCode}</Text>}
                    {item.day && <Text style={[styles.classSchedule, { color: theme.subText }]}>📅 {item.day} {item.fromTime} - {item.toTime}</Text>}
                  </View>
                </View>
                <TouchableOpacity style={styles.leaveBtn} onPress={() => handleLeaveClass(item.id, item.name)}>
                  <Text style={styles.leaveBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      );
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.classCardName, { color: theme.text }]}>{item.name}</Text>
                    {item.classCode && <Text style={[styles.classCode, { color: theme.subText }]}>Code: {item.classCode}</Text>}
                    {item.day && <Text style={[styles.classSchedule, { color: theme.subText }]}>📅 {item.day} {item.fromTime} - {item.toTime}</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => nav.navigate("ManageClass", { classId: item.id })}>
                    <Text style={styles.manageBtnText}>Manage →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteClass(item.id, item.name)}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
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
    ...(role === "student" ? [
      { key: "myClasses", label: "My Classes", icon: "📚" },
      { key: "digitalID", label: "ID Card", icon: "🪪" },
    ] : []),
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

          {/* Profile Button */}
          <TouchableOpacity onPress={() => setProfileVisible(true)}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={[styles.avatarCircle, { borderWidth: 2, borderColor: getRoleColor() }]} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: getRoleColor() }]}>
                <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : "?"}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
            <Text style={styles.logoutIconText}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.border }]}>
        {navButtons.map((btn) => (
          <TouchableOpacity key={btn.key} style={styles.navBtn} onPress={() => setPage(btn.key)}>
            <Text style={styles.navBtnIcon}>{btn.icon}</Text>
            <Text style={[styles.navBtnLabel, { color: theme.subText }, page === btn.key && { color: getRoleColor(), fontWeight: "700" }]}>
              {btn.label}
            </Text>
            {page === btn.key && <View style={[styles.navIndicator, { backgroundColor: getRoleColor() }]} />}
          </TouchableOpacity>
        ))}

        {role === "admin" && (
  <>
    <TouchableOpacity style={styles.navBtn} onPress={() => nav.navigate("Admin")}>
      <Text style={styles.navBtnIcon}>👨‍🏫</Text>
      <Text style={[styles.navBtnLabel, { color: theme.subText }]}>Instructors</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navBtn} onPress={() => nav.navigate("AdminDashboard")}>
      <Text style={styles.navBtnIcon}>📊</Text>
      <Text style={[styles.navBtnLabel, { color: theme.subText }]}>Dashboard</Text>
    </TouchableOpacity>
  </>
)}
      </View>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent={true} onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>⚙️ Settings</Text>

            <Text style={[styles.modalLabel, { color: theme.subText }]}>First Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newFirstName} onChangeText={setNewFirstName}
              placeholder="First Name" placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.modalLabel, { color: theme.subText }]}>Last Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newLastName} onChangeText={setNewLastName}
              placeholder="Last Name" placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.modalLabel, { color: theme.subText }]}>New Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
              value={newPassword} onChangeText={setNewPassword}
              placeholder="Leave empty to keep current" placeholderTextColor="#94a3b8"
              secureTextEntry
            />

            <View style={[styles.darkModeRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.darkModeLabel, { color: theme.text }]}>🌙 Dark Mode</Text>
              <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: "#e2e8f0", true: getRoleColor() }} thumbColor="#ffffff" />
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

      {/* Profile Modal */}
      <Modal visible={profileVisible} animationType="slide" transparent={true} onRequestClose={() => setProfileVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.profileBox, { backgroundColor: theme.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Profile Image */}
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImageLarge} />
                ) : (
                  <View style={[styles.profileImageLarge, { backgroundColor: getRoleColor(), justifyContent: "center", alignItems: "center" }]}>
                    <Text style={{ fontSize: 50, color: "white", fontWeight: "800" }}>
                      {userName ? userName.charAt(0).toUpperCase() : "?"}
                    </Text>
                  </View>
                )}

                <View style={styles.profileImageBtns}>
                  <TouchableOpacity style={[styles.profileImgBtn, { backgroundColor: getRoleColor() }]} onPress={pickImage}>
                    <Text style={styles.profileImgBtnText}>📷 {profileImage ? "Change" : "Add Photo"}</Text>
                  </TouchableOpacity>
                  {profileImage && (
                    <TouchableOpacity style={[styles.profileImgBtn, { backgroundColor: "#dc2626" }]} onPress={removeImage}>
                      <Text style={styles.profileImgBtnText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Info */}
              <Text style={[styles.profileName, { color: theme.text }]}>{userName}</Text>
              <View style={[styles.roleBadgeLarge, { backgroundColor: getRoleColor() + "22", borderColor: getRoleColor() }]}>
                <Text style={[styles.roleBadgeLargeText, { color: getRoleColor() }]}>{role?.toUpperCase()}</Text>
              </View>

              {/* Details */}
              <View style={[styles.profileInfoCard, { backgroundColor: theme.bg }]}>
                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoIcon}>📧</Text>
                  <View>
                    <Text style={[styles.profileInfoLabel, { color: theme.subText }]}>Email</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{userEmail || "—"}</Text>
                  </View>
                </View>

                {role === "student" && (
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoIcon}>🪪</Text>
                    <View>
                      <Text style={[styles.profileInfoLabel, { color: theme.subText }]}>Student ID</Text>
                      <Text style={[styles.profileInfoValue, { color: theme.text }]}>{studentId || "—"}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.profileInfoRow}>
                  <Text style={styles.profileInfoIcon}>🏛️</Text>
                  <View>
                    <Text style={[styles.profileInfoLabel, { color: theme.subText }]}>Department</Text>
                    <Text style={[styles.profileInfoValue, { color: theme.text }]}>{userDepartment}</Text>
                  </View>
                </View>
              </View>

              {/* Stats للطالب */}
              {role === "student" && (
                <View style={[styles.profileStatsCard, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.profileStatsTitle, { color: theme.subText }]}>ACADEMIC STATS</Text>
                  <View style={styles.profileStatsRow}>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: "#6366f1" }]}>{myClasses.length}</Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Classes</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: "#10b981" }]}>{studentAttendanceCount}</Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Attended</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: absenceRate > 25 ? "#dc2626" : "#10b981" }]}>
                        {absenceRate}%
                      </Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Absence</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Stats للإنستراكتور */}
              {role === "instructor" && (
                <View style={[styles.profileStatsCard, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.profileStatsTitle, { color: theme.subText }]}>TEACHING STATS</Text>
                  <View style={styles.profileStatsRow}>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: "#10b981" }]}>{classes.length}</Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Classes</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: "#6366f1" }]}>{instructorStudentCount}</Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Students</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={[styles.profileStatNum, { color: "#f59e0b" }]}>{instructorAttendanceCount}</Text>
                      <Text style={[styles.profileStatLabel, { color: theme.subText }]}>Records</Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border, marginTop: 10 }]} onPress={() => setProfileVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.subText }]}>Close</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
      <ChatAssistant
  role={role}
  data={{
    studentAttendanceRate: studentAttendanceCount,
    studentEnrollments: myClasses,
    todayStudentClasses: myClasses.filter((c) => c.day === new Date().toLocaleDateString("en-US", { weekday: "long" })),
    studentActivityFeed: myClasses.map((c) => ({ text: `Joined class ${c.name}` })),

    totalEnrolledStudents: instructorStudentCount,
    instructorAttendanceRate: instructorAttendanceCount,
    sessionsThisWeek: classes.length,
    instructorClasses: classes,
    todayInstructorClasses: classes.filter((c) => c.day === new Date().toLocaleDateString("en-US", { weekday: "long" })),
    instructorActivityFeed: classes.map((c) => ({ text: `Created or manages class ${c.name}` })),
  }}
/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
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
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  welcomeEmoji: { fontSize: 40 },
  welcomeGreeting: { fontSize: 13 },
  welcomeName: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  roleBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statNumber: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: { flex: 1, minWidth: "44%", borderRadius: 14, padding: 16, alignItems: "center" },
  quickBtnIcon: { fontSize: 28, marginBottom: 6 },
  quickBtnText: { fontSize: 13, fontWeight: "700" },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, width: "100%" },
  pageIcon: { fontSize: 28 },
  pageTitle: { fontSize: 24, fontWeight: "800" },
  attendanceCard: { borderRadius: 16, padding: 24, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  attendanceInfo: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  scanBtn: {
    backgroundColor: "#6366f1", flexDirection: "row", alignItems: "center",
    gap: 10, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 14,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, alignSelf: "center",
  },
  scanBtnIcon: { fontSize: 20 },
  scanBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  daySection: { marginBottom: 16 },
  dayHeader: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  dayHeaderText: { color: "white", fontWeight: "800", fontSize: 14 },
  scheduleCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, marginBottom: 8, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  scheduleColorBar: { width: 4, alignSelf: "stretch" },
  scheduleClassName: { fontSize: 14, fontWeight: "700", paddingLeft: 12, paddingTop: 12 },
  scheduleCode: { fontSize: 11, paddingLeft: 12, paddingBottom: 12, marginTop: 2 },
  scheduleTime: { flexDirection: "column", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12 },
  scheduleTimeText: { fontSize: 12, fontWeight: "700" },
  scheduleTimeSep: { fontSize: 10, marginVertical: 2 },
  scheduleEmpty: { borderRadius: 12, padding: 20, alignItems: "center", marginTop: 10 },
  scheduleEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  joinBox: { borderRadius: 16, padding: 20, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  joinTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  joinSub: { fontSize: 13, marginBottom: 14 },
  joinRow: { flexDirection: "row", gap: 10 },
  joinInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1 },
  joinBtn: { backgroundColor: "#6366f1", paddingHorizontal: 20, borderRadius: 12, justifyContent: "center" },
  joinBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  classCode: { fontSize: 11, marginTop: 2 },
  classSchedule: { fontSize: 11, marginTop: 2 },
  createClassBox: { flexDirection: "row", gap: 10, marginBottom: 16 },
  classInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1 },
  createBtn: { backgroundColor: "#10b981", paddingHorizontal: 16, borderRadius: 12, justifyContent: "center" },
  createBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  classCard: { borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  classCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  classCardIcon: { fontSize: 22 },
  classCardName: { fontSize: 15, fontWeight: "700" },
  manageBtn: { backgroundColor: "#eff6ff", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  manageBtnText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  deleteBtn: { backgroundColor: "#fee2e2", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  deleteBtnText: { fontSize: 16 },
  leaveBtn: { backgroundColor: "#fee2e2", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  leaveBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  bottomNav: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  navBtn: { flex: 1, alignItems: "center", paddingVertical: 6, position: "relative" },
  navBtnIcon: { fontSize: 20, marginBottom: 3 },
  navBtnLabel: { fontSize: 10, fontWeight: "600" },
  navIndicator: { position: "absolute", bottom: -8, width: 4, height: 4, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: "#00000077", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 20, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.5 },
  modalInput: { padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1, marginBottom: 14 },
  darkModeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderTopWidth: 1, marginBottom: 16 },
  darkModeLabel: { fontSize: 15, fontWeight: "600" },
  saveBtn: { padding: 14, borderRadius: 14, alignItems: "center", marginBottom: 10 },
  saveBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  cancelBtn: { padding: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontWeight: "600", fontSize: 15 },

  // Profile Modal
  profileBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: "90%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  profileImageContainer: { alignItems: "center", marginBottom: 16 },
  profileImageLarge: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  profileImageBtns: { flexDirection: "row", gap: 10 },
  profileImgBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  profileImgBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  profileName: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  roleBadgeLarge: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  roleBadgeLargeText: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  profileInfoCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  profileInfoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  profileInfoIcon: { fontSize: 22 },
  profileInfoLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  profileInfoValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  profileStatsCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  profileStatsTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  profileStatsRow: { flexDirection: "row", justifyContent: "space-around" },
  profileStat: { alignItems: "center" },
  profileStatNum: { fontSize: 24, fontWeight: "800" },
  profileStatLabel: { fontSize: 11, marginTop: 4 },
});