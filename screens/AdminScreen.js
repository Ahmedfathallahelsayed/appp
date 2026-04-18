import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Modal, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

export default function AdminScreen() {
  const nav = useNavigation();
  const [activeTab, setActiveTab] = useState("instructors"); // instructors | students
  const [searchText, setSearchText] = useState("");

  // Instructors state
  const [instructors, setInstructors] = useState([]);
  const [filteredInstructors, setFilteredInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [instructorClasses, setInstructorClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [instructorModalVisible, setInstructorModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Students state
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentClasses, setStudentClasses] = useState([]);
  const [selectedStudentClass, setSelectedStudentClass] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [studentModalVisible, setStudentModalVisible] = useState(false);

  useEffect(() => {
    loadInstructors();
    loadStudents();
  }, []);

  const loadInstructors = async () => {
    setLoadingInstructors(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "instructor"));
      const snapshot = await getDocs(q);
      let list = [];
      snapshot.forEach((d) => list.push({ docId: d.id, ...d.data() }));

      const classesSnapshot = await getDocs(collection(db, "classes"));
      let allClasses = [];
      classesSnapshot.forEach((d) => allClasses.push({ id: d.id, ...d.data() }));

      list = list.map((inst) => ({
        ...inst,
        classCount: allClasses.filter((c) => c.instructorId === inst.uid).length,
      }));

      const activeInstructors = list.filter((inst) => inst.classCount > 0);
      setInstructors(activeInstructors);
      setFilteredInstructors(activeInstructors);
    } catch (error) { console.log(error); }
    setLoadingInstructors(false);
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      let list = [];
      snapshot.forEach((d) => list.push({ docId: d.id, ...d.data() }));
      setStudents(list);
      setFilteredStudents(list);
    } catch (error) { console.log(error); }
    setLoadingStudents(false);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const lower = text.toLowerCase();
    if (activeTab === "instructors") {
      if (!text.trim()) { setFilteredInstructors(instructors); return; }
      setFilteredInstructors(instructors.filter((inst) =>
        (inst.firstName + " " + inst.lastName).toLowerCase().includes(lower)
      ));
    } else {
      if (!text.trim()) { setFilteredStudents(students); return; }
      setFilteredStudents(students.filter((s) =>
        (s.firstName + " " + s.lastName).toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower)
      ));
    }
  };

  const openInstructor = async (instructor) => {
    setSelectedInstructor(instructor);
    setSelectedClass(null);
    setClassStudents([]);
    setLoadingDetails(true);
    setInstructorModalVisible(true);
    try {
      const q = query(collection(db, "classes"), where("instructorId", "==", instructor.uid));
      const snapshot = await getDocs(q);
      let classes = [];
      snapshot.forEach((d) => classes.push({ id: d.id, ...d.data() }));
      setInstructorClasses(classes);
    } catch (error) { console.log(error); }
    setLoadingDetails(false);
  };

  const openClass = async (cls) => {
    setSelectedClass(cls);
    setLoadingDetails(true);
    try {
      const q = query(collection(db, "enrollments"), where("classId", "==", cls.id));
      const snapshot = await getDocs(q);
      let students = [];
      snapshot.forEach((d) => students.push({ id: d.id, ...d.data() }));
      setClassStudents(students);
    } catch (error) { console.log(error); }
    setLoadingDetails(false);
  };

  const openStudent = async (student) => {
    setSelectedStudent(student);
    setSelectedStudentClass(null);
    setStudentAttendance([]);
    setLoadingDetails(true);
    setStudentModalVisible(true);
    try {
      // جيب الكلاسات اللي الطالب مشترك فيها
      const enrollQ = query(collection(db, "enrollments"), where("studentId", "==", student.uid));
      const enrollSnap = await getDocs(enrollQ);
      let classIds = [];
      enrollSnap.forEach((d) => classIds.push(d.data().classId));

      let classList = [];
      for (let cid of classIds) {
        const classSnap = await getDocs(query(collection(db, "classes"), where("__name__", "==", cid)));
        classSnap.forEach((d) => classList.push({ id: d.id, ...d.data() }));
      }
      setStudentClasses(classList);
    } catch (error) { console.log(error); }
    setLoadingDetails(false);
  };

  const openStudentClass = async (cls) => {
    setSelectedStudentClass(cls);
    setLoadingDetails(true);
    try {
      // جيب محاضرات الطالب في الكلاس ده
      const q = query(
        collection(db, "attendance"),
        where("classId", "==", cls.id),
        where("studentUid", "==", selectedStudent.uid)
      );
      const snapshot = await getDocs(q);
      let records = [];
      snapshot.forEach((d) => records.push({ id: d.id, ...d.data() }));
      setStudentAttendance(records);
    } catch (error) { console.log(error); }
    setLoadingDetails(false);
  };

  const handleDeleteClass = (classId, className) => {
    Alert.alert("Delete Class", `Are you sure you want to delete "${className}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "classes", classId));
            const enrollQ = query(collection(db, "enrollments"), where("classId", "==", classId));
            const enrollSnap = await getDocs(enrollQ);
            const deletePromises = enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id)));
            await Promise.all(deletePromises);
            Alert.alert("✅ Class deleted");
            const updatedClasses = instructorClasses.filter((c) => c.id !== classId);
            setInstructorClasses(updatedClasses);
          } catch (e) {
            Alert.alert("Error", "Failed to delete class");
          }
        },
      },
    ]);
  };

  const handleDeleteInstructor = (instructor) => {
    Alert.alert("Delete Instructor", `Are you sure you want to delete "${instructor.firstName} ${instructor.lastName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const classQ = query(collection(db, "classes"), where("instructorId", "==", instructor.uid));
            const classSnap = await getDocs(classQ);
            for (const classDoc of classSnap.docs) {
              const enrollQ = query(collection(db, "enrollments"), where("classId", "==", classDoc.id));
              const enrollSnap = await getDocs(enrollQ);
              await Promise.all(enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id))));
              await deleteDoc(doc(db, "classes", classDoc.id));
            }
            await deleteDoc(doc(db, "users", instructor.docId));
            Alert.alert("✅ Instructor deleted");
            setInstructorModalVisible(false);
            const updated = instructors.filter((i) => i.uid !== instructor.uid);
            setInstructors(updated);
            setFilteredInstructors(updated);
          } catch (e) {
            Alert.alert("Error", "Failed to delete instructor");
          }
        },
      },
    ]);
  };

  const handleDeleteStudent = (student) => {
    Alert.alert("Delete Student", `Are you sure you want to delete "${student.firstName} ${student.lastName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            // حذف كل enrollments الطالب
            const enrollQ = query(collection(db, "enrollments"), where("studentId", "==", student.uid));
            const enrollSnap = await getDocs(enrollQ);
            await Promise.all(enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id))));
            await deleteDoc(doc(db, "users", student.docId));
            Alert.alert("✅ Student deleted");
            setStudentModalVisible(false);
            const updated = students.filter((s) => s.uid !== student.uid);
            setStudents(updated);
            setFilteredStudents(updated);
          } catch (e) {
            Alert.alert("Error", "Failed to delete student");
          }
        },
      },
    ]);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Admin Panel</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "instructors" && styles.tabActive]}
          onPress={() => { setActiveTab("instructors"); setSearchText(""); setFilteredInstructors(instructors); }}
        >
          <Text style={[styles.tabText, activeTab === "instructors" && styles.tabTextActive]}>👨‍🏫 Instructors</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "students" && styles.tabActive]}
          onPress={() => { setActiveTab("students"); setSearchText(""); setFilteredStudents(students); }}
        >
          <Text style={[styles.tabText, activeTab === "students" && styles.tabTextActive]}>👨‍🎓 Students</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === "instructors" ? "Search instructor..." : "Search student..."}
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(searchText)}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Instructors List */}
        {activeTab === "instructors" && (
          <>
            <Text style={styles.countText}>{filteredInstructors.length} instructor{filteredInstructors.length !== 1 ? "s" : ""} found</Text>
            {loadingInstructors ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredInstructors.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👨‍🏫</Text>
                    <Text style={styles.emptyText}>No instructors found</Text>
                  </View>
                ) : (
                  filteredInstructors.map((inst) => (
                    <View key={inst.docId} style={styles.card}>
                      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }} onPress={() => openInstructor(inst)}>
                        <View style={[styles.avatarCircle, { backgroundColor: "#10b981" }]}>
                          <Text style={styles.avatarText}>{inst.firstName?.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName}>{inst.firstName} {inst.lastName}</Text>
                          <Text style={styles.cardSub}>{inst.email}</Text>
                        </View>
                        <View style={[styles.badge, { borderColor: "#10b981", backgroundColor: "#10b98115" }]}>
                          <Text style={[styles.badgeText, { color: "#10b981" }]}>{inst.classCount} class{inst.classCount !== 1 ? "es" : ""}</Text>
                        </View>
                        <Text style={styles.arrowText}>→</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteInstructor(inst)}>
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* Students List */}
        {activeTab === "students" && (
          <>
            <Text style={styles.countText}>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</Text>
            {loadingStudents ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👨‍🎓</Text>
                    <Text style={styles.emptyText}>No students found</Text>
                  </View>
                ) : (
                  filteredStudents.map((student) => (
                    <View key={student.docId} style={styles.card}>
                      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }} onPress={() => openStudent(student)}>
                        <View style={[styles.avatarCircle, { backgroundColor: "#6366f1" }]}>
                          <Text style={styles.avatarText}>{student.firstName?.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName}>{student.firstName} {student.lastName}</Text>
                          <Text style={styles.cardSub}>{student.email}</Text>
                          {student.studentId && <Text style={styles.cardSub}>ID: {student.studentId}</Text>}
                        </View>
                        <Text style={styles.arrowText}>→</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteStudent(student)}>
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Instructor Modal */}
      <Modal visible={instructorModalVisible} animationType="slide" onRequestClose={() => setInstructorModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => {
              if (selectedClass) { setSelectedClass(null); setClassStudents([]); }
              else { setInstructorModalVisible(false); setSelectedInstructor(null); setInstructorClasses([]); }
            }}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              {selectedClass ? selectedClass.name : selectedInstructor?.firstName + " " + selectedInstructor?.lastName}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingDetails ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : selectedClass ? (
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>📖 {selectedClass.name}</Text>
                  {selectedClass.classCode && <Text style={styles.infoSub}>Code: {selectedClass.classCode}</Text>}
                  {selectedClass.day && <Text style={styles.infoSub}>📅 {selectedClass.day} {selectedClass.fromTime} → {selectedClass.toTime}</Text>}
                  <Text style={styles.infoSub}>🗓 Created: {formatDate(selectedClass.createdAt)}</Text>
                  <Text style={styles.infoSub}>👥 {classStudents.length} student{classStudents.length !== 1 ? "s" : ""} enrolled</Text>
                </View>
                <Text style={styles.sectionLabel}>ENROLLED STUDENTS</Text>
                {classStudents.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyIcon}>👥</Text><Text style={styles.emptyText}>No students enrolled yet</Text></View>
                ) : (
                  classStudents.map((s) => (
                    <View key={s.id} style={styles.studentCard}>
                      <View style={styles.studentAvatar}><Text style={styles.studentAvatarText}>{s.studentName?.charAt(0) || "?"}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{s.studentName || "Unknown"}</Text>
                        <Text style={styles.studentDate}>Joined: {s.joinedAt?.toDate ? s.joinedAt.toDate().toLocaleDateString("en-GB") : "N/A"}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>👨‍🏫 {selectedInstructor?.firstName} {selectedInstructor?.lastName}</Text>
                  <Text style={styles.infoSub}>📧 {selectedInstructor?.email}</Text>
                  <Text style={styles.infoSub}>🏫 {instructorClasses.length} class{instructorClasses.length !== 1 ? "es" : ""}</Text>
                </View>
                <TouchableOpacity style={styles.deleteInstructorBtn} onPress={() => handleDeleteInstructor(selectedInstructor)}>
                  <Text style={styles.deleteInstructorText}>🗑️ Delete Instructor</Text>
                </TouchableOpacity>
                <Text style={styles.sectionLabel}>CLASSES</Text>
                {instructorClasses.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyIcon}>🏫</Text><Text style={styles.emptyText}>No classes yet</Text></View>
                ) : (
                  instructorClasses.map((cls) => (
                    <View key={cls.id} style={styles.classCard}>
                      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }} onPress={() => openClass(cls)}>
                        <Text style={styles.classCardIcon}>📖</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.classCardName}>{cls.name}</Text>
                          {cls.classCode && <Text style={styles.classCardSub}>Code: {cls.classCode}</Text>}
                          {cls.day && <Text style={styles.classCardSub}>📅 {cls.day} {cls.fromTime} → {cls.toTime}</Text>}
                          <Text style={styles.classCardSub}>Created: {formatDate(cls.createdAt)}</Text>
                        </View>
                        <Text style={styles.arrowText}>→</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteClass(cls.id, cls.name)}>
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Student Modal */}
      <Modal visible={studentModalVisible} animationType="slide" onRequestClose={() => setStudentModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => {
              if (selectedStudentClass) { setSelectedStudentClass(null); setStudentAttendance([]); }
              else { setStudentModalVisible(false); setSelectedStudent(null); setStudentClasses([]); }
            }}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              {selectedStudentClass ? selectedStudentClass.name : selectedStudent?.firstName + " " + selectedStudent?.lastName}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingDetails ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
            ) : selectedStudentClass ? (
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>📖 {selectedStudentClass.name}</Text>
                  {selectedStudentClass.classCode && <Text style={styles.infoSub}>Code: {selectedStudentClass.classCode}</Text>}
                  {selectedStudentClass.day && <Text style={styles.infoSub}>📅 {selectedStudentClass.day} {selectedStudentClass.fromTime} → {selectedStudentClass.toTime}</Text>}
                  <Text style={styles.infoSub}>✅ {studentAttendance.length} lecture{studentAttendance.length !== 1 ? "s" : ""} attended</Text>
                </View>
                <Text style={styles.sectionLabel}>ATTENDANCE RECORDS</Text>
                {studentAttendance.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>No attendance records yet</Text></View>
                ) : (
                  studentAttendance.map((record) => (
                    <View key={record.id} style={styles.studentCard}>
                      <Text style={{ fontSize: 24 }}>✅</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>Lecture attended</Text>
                        <Text style={styles.studentDate}>{formatDate(record.scannedAt || record.createdAt)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>👨‍🎓 {selectedStudent?.firstName} {selectedStudent?.lastName}</Text>
                  <Text style={styles.infoSub}>📧 {selectedStudent?.email}</Text>
                  {selectedStudent?.studentId && <Text style={styles.infoSub}>🪪 ID: {selectedStudent.studentId}</Text>}
                  <Text style={styles.infoSub}>📚 {studentClasses.length} class{studentClasses.length !== 1 ? "es" : ""} enrolled</Text>
                </View>

                <TouchableOpacity style={styles.deleteInstructorBtn} onPress={() => handleDeleteStudent(selectedStudent)}>
                  <Text style={styles.deleteInstructorText}>🗑️ Delete Student</Text>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>ENROLLED CLASSES</Text>
                {studentClasses.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyIcon}>📚</Text><Text style={styles.emptyText}>No classes yet</Text></View>
                ) : (
                  studentClasses.map((cls) => (
                    <TouchableOpacity key={cls.id} style={styles.classCard} onPress={() => openStudentClass(cls)}>
                      <Text style={styles.classCardIcon}>📖</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classCardName}>{cls.name}</Text>
                        {cls.classCode && <Text style={styles.classCardSub}>Code: {cls.classCode}</Text>}
                        {cls.day && <Text style={styles.classCardSub}>📅 {cls.day} {cls.fromTime} → {cls.toTime}</Text>}
                      </View>
                      <Text style={styles.arrowText}>→</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  modalSafe: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", elevation: 3,
  },
  backBtn: { fontSize: 15, fontWeight: "600", color: "#2563eb", width: 60 },
  topTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", flex: 1, textAlign: "center" },
  tabRow: {
    flexDirection: "row", backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#2563eb" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  tabTextActive: { color: "#2563eb" },
  container: { flex: 1, padding: 20 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: "#ffffff", padding: 12, borderRadius: 12, fontSize: 14, color: "#0f172a", borderWidth: 1, borderColor: "#e2e8f0" },
  searchBtn: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  searchBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  countText: { fontSize: 12, color: "#94a3b8", marginBottom: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "white", fontWeight: "800", fontSize: 18 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  arrowText: { fontSize: 18, color: "#94a3b8" },
  deleteBtn: { backgroundColor: "#fee2e2", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8 },
  deleteBtnText: { fontSize: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  modalContent: { flex: 1, padding: 20 },
  infoCard: {
    backgroundColor: "#ffffff", borderRadius: 16, padding: 20,
    marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  infoTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  infoSub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  deleteInstructorBtn: { backgroundColor: "#fee2e2", padding: 14, borderRadius: 14, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#fca5a5" },
  deleteInstructorText: { color: "#dc2626", fontWeight: "800", fontSize: 15 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 1, marginBottom: 12 },
  classCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  classCardIcon: { fontSize: 24 },
  classCardName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  classCardSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  studentCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center" },
  studentAvatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  studentName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  studentDate: { fontSize: 12, color: "#64748b", marginTop: 2 },
});