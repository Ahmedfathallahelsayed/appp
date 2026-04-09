import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

export default function AdminScreen() {
  const nav = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [instructors, setInstructors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [instructorClasses, setInstructorClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    setLoading(true);
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
      setFiltered(activeInstructors);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (!text.trim()) {
      setFiltered(instructors);
      return;
    }
    const lower = text.toLowerCase();
    const results = instructors.filter((inst) => {
      const fullName = (inst.firstName + " " + inst.lastName).toLowerCase();
      return fullName.includes(lower);
    });
    setFiltered(results);
  };

  const openInstructor = async (instructor) => {
    setSelectedInstructor(instructor);
    setSelectedClass(null);
    setClassStudents([]);
    setLoadingDetails(true);
    setModalVisible(true);

    try {
      const q = query(collection(db, "classes"), where("instructorId", "==", instructor.uid));
      const snapshot = await getDocs(q);
      let classes = [];
      snapshot.forEach((d) => classes.push({ id: d.id, ...d.data() }));
      setInstructorClasses(classes);
    } catch (error) {
      console.log(error);
    }
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
    } catch (error) {
      console.log(error);
    }
    setLoadingDetails(false);
  };

  const handleDeleteClass = (classId, className) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete "${className}"?`,
      [
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
              const updatedClasses = instructorClasses.filter((c) => c.id !== classId);
              setInstructorClasses(updatedClasses);

              const updatedInstructors = instructors.map((inst) => {
                if (inst.uid === selectedInstructor.uid) {
                  return { ...inst, classCount: inst.classCount - 1 };
                }
                return inst;
              });
              setInstructors(updatedInstructors);
              setFiltered(updatedInstructors);
            } catch (e) {
              console.log(e);
              Alert.alert("Error", "Failed to delete class");
            }
          },
        },
      ]
    );
  };

  const handleDeleteInstructor = (instructor) => {
    Alert.alert(
      "Delete Instructor",
      `Are you sure you want to delete "${instructor.firstName} ${instructor.lastName}"? This will also delete all their classes and enrollments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // حذف كل كلاساته
              const classQ = query(collection(db, "classes"), where("instructorId", "==", instructor.uid));
              const classSnap = await getDocs(classQ);

              for (const classDoc of classSnap.docs) {
                // حذف enrollments كل كلاس
                const enrollQ = query(collection(db, "enrollments"), where("classId", "==", classDoc.id));
                const enrollSnap = await getDocs(enrollQ);
                const deleteEnrollments = enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id)));
                await Promise.all(deleteEnrollments);

                // حذف الكلاس نفسه
                await deleteDoc(doc(db, "classes", classDoc.id));
              }

              // حذف الإنستراكتور من users
              await deleteDoc(doc(db, "users", instructor.docId));

              Alert.alert("✅ Instructor deleted");
              setModalVisible(false);
              setSelectedInstructor(null);
              setInstructorClasses([]);

              // تحديث الليست
              const updatedInstructors = instructors.filter((i) => i.uid !== instructor.uid);
              setInstructors(updatedInstructors);
              setFiltered(updatedInstructors);
            } catch (e) {
              console.log(e);
              Alert.alert("Error", "Failed to delete instructor");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Instructors</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch(searchText)}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.countText}>
          {filtered.length} instructor{filtered.length !== 1 ? "s" : ""} found
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👨‍🏫</Text>
                <Text style={styles.emptyText}>No instructors found</Text>
              </View>
            ) : (
              filtered.map((inst) => (
                <View key={inst.docId} style={styles.instructorCard}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
                    onPress={() => openInstructor(inst)}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {inst.firstName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instName}>{inst.firstName} {inst.lastName}</Text>
                      <Text style={styles.instEmail}>{inst.email}</Text>
                    </View>
                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>
                        {inst.classCount} class{inst.classCount !== 1 ? "es" : ""}
                      </Text>
                    </View>
                    <Text style={styles.arrowText}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteInstructor(inst)}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => {
              if (selectedClass) {
                setSelectedClass(null);
                setClassStudents([]);
              } else {
                setModalVisible(false);
                setSelectedInstructor(null);
                setInstructorClasses([]);
              }
            }}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle} numberOfLines={1}>
              {selectedClass
                ? selectedClass.name
                : selectedInstructor?.firstName + " " + selectedInstructor?.lastName}
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
                  {selectedClass.classCode && (
                    <Text style={styles.infoSub}>Code: {selectedClass.classCode}</Text>
                  )}
                  {selectedClass.day && (
                    <Text style={styles.infoSub}>
                      📅 {selectedClass.day} {selectedClass.fromTime} → {selectedClass.toTime}
                    </Text>
                  )}
                  <Text style={styles.infoSub}>
                    🗓 Created: {formatDate(selectedClass.createdAt)}
                  </Text>
                  <Text style={styles.infoSub}>
                    👥 {classStudents.length} student{classStudents.length !== 1 ? "s" : ""} enrolled
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>ENROLLED STUDENTS</Text>

                {classStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyText}>No students enrolled yet</Text>
                  </View>
                ) : (
                  classStudents.map((s) => (
                    <View key={s.id} style={styles.studentCard}>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>
                          {s.studentName?.charAt(0) || "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{s.studentName || "Unknown"}</Text>
                        <Text style={styles.studentDate}>
                          Joined: {s.joinedAt?.toDate ? s.joinedAt.toDate().toLocaleDateString("en-GB") : "N/A"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>
                    👨‍🏫 {selectedInstructor?.firstName} {selectedInstructor?.lastName}
                  </Text>
                  <Text style={styles.infoSub}>📧 {selectedInstructor?.email}</Text>
                  <Text style={styles.infoSub}>
                    🏫 {instructorClasses.length} class{instructorClasses.length !== 1 ? "es" : ""}
                  </Text>
                </View>

                {/* زرار حذف الإنستراكتور */}
                <TouchableOpacity
                  style={styles.deleteInstructorBtn}
                  onPress={() => handleDeleteInstructor(selectedInstructor)}
                >
                  <Text style={styles.deleteInstructorText}>🗑️ Delete Instructor</Text>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>CLASSES</Text>

                {instructorClasses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🏫</Text>
                    <Text style={styles.emptyText}>No classes yet</Text>
                  </View>
                ) : (
                  instructorClasses.map((cls) => (
                    <View key={cls.id} style={styles.classCard}>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
                        onPress={() => openClass(cls)}
                      >
                        <Text style={styles.classCardIcon}>📖</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.classCardName}>{cls.name}</Text>
                          {cls.classCode && (
                            <Text style={styles.classCardSub}>Code: {cls.classCode}</Text>
                          )}
                          {cls.day && (
                            <Text style={styles.classCardSub}>
                              📅 {cls.day} {cls.fromTime} → {cls.toTime}
                            </Text>
                          )}
                          <Text style={styles.classCardSub}>
                            Created: {formatDate(cls.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.arrowText}>→</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteClass(cls.id, cls.name)}
                      >
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
  container: { flex: 1, padding: 20 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: "#ffffff", padding: 12,
    borderRadius: 12, fontSize: 14, color: "#0f172a",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  searchBtn: {
    backgroundColor: "#2563eb", paddingVertical: 12,
    paddingHorizontal: 18, borderRadius: 12,
  },
  searchBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  countText: { fontSize: 12, color: "#94a3b8", marginBottom: 16, fontWeight: "600" },
  instructorCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#10b981", justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "white", fontWeight: "800", fontSize: 18 },
  instName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  instEmail: { fontSize: 12, color: "#64748b", marginTop: 2 },
  classBadge: {
    backgroundColor: "#10b98115", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#10b981",
  },
  classBadgeText: { fontSize: 11, fontWeight: "700", color: "#10b981" },
  arrowText: { fontSize: 18, color: "#94a3b8" },
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
  deleteInstructorBtn: {
    backgroundColor: "#fee2e2", padding: 14, borderRadius: 14,
    alignItems: "center", marginBottom: 20,
    borderWidth: 1, borderColor: "#fca5a5",
  },
  deleteInstructorText: { color: "#dc2626", fontWeight: "800", fontSize: 15 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 1, marginBottom: 12,
  },
  classCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  classCardIcon: { fontSize: 24 },
  classCardName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  classCardSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  deleteBtn: {
    backgroundColor: "#fee2e2", paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 10, marginLeft: 8,
  },
  deleteBtnText: { fontSize: 16 },
  studentCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  studentAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center",
  },
  studentAvatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  studentName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  studentDate: { fontSize: 12, color: "#64748b", marginTop: 2 },
});