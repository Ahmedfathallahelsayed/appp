import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ManageClassScreen({ route }) {
  const { classId } = route.params;
  const nav = useNavigation();

  const [classData, setClassData] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState("main");

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");

  useEffect(() => {
    loadClass();
  }, []);

  const loadClass = async () => {
    try {
      const snapshot = await getDocs(collection(db, "classes"));
      snapshot.forEach((d) => {
        if (d.id === classId) {
          const data = { id: d.id, ...d.data() };
          setClassData(data);
          setEditName(data.name || "");
          setEditCode(data.classCode || "");
          setEditDay(data.day || "");
          setEditFrom(data.fromTime || "");
          setEditTo(data.toTime || "");
        }
      });
    } catch (e) { console.log(e); }
  };

  const loadStudents = async () => {
    try {
      const q = query(collection(db, "enrollments"), where("classId", "==", classId));
      const snapshot = await getDocs(q);
      let list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setStudents(list);
    } catch (e) { console.log(e); }
  };

  const handleSave = async () => {
    if (!editName.trim() || !editCode.trim() || !editDay || !editFrom.trim() || !editTo.trim()) {
      Alert.alert("Please fill all fields");
      return;
    }
    try {
      await updateDoc(doc(db, "classes", classId), {
        name: editName.trim(),
        classCode: editCode.trim().toUpperCase(),
        day: editDay,
        fromTime: editFrom.trim(),
        toTime: editTo.trim(),
      });
      Alert.alert("✅ Saved successfully");
      setEditVisible(false);
      loadClass();
    } catch (e) {
      console.log(e);
      Alert.alert("Error saving");
    }
  };

  const handleDeleteClass = () => {
    Alert.alert(
      "Delete Class",
      "Are you sure you want to delete this class? This will also remove all enrolled students.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // حذف الكلاس
              await deleteDoc(doc(db, "classes", classId));

              // حذف كل الـ enrollments بتاعت الكلاس ده
              const enrollQ = query(collection(db, "enrollments"), where("classId", "==", classId));
              const enrollSnap = await getDocs(enrollQ);
              const deletePromises = enrollSnap.docs.map((d) => deleteDoc(doc(db, "enrollments", d.id)));
              await Promise.all(deletePromises);

              Alert.alert("✅ Class deleted");
              nav.goBack();
            } catch (e) {
              console.log(e);
              Alert.alert("Error", "Failed to delete class");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          if (page !== "main") setPage("main");
          else nav.goBack();
        }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          {page === "main" ? "Manage Class" : "Students"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {page === "main" && (
        <ScrollView style={styles.container}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🏫</Text>
            <Text style={styles.infoName}>{classData?.name || "Loading..."}</Text>
            {classData?.classCode && (
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>Code: {classData.classCode}</Text>
              </View>
            )}
            {classData?.day && (
              <Text style={styles.infoSchedule}>
                📅 {classData.day}  {classData.fromTime} → {classData.toTime}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#6366f1" }]}
            onPress={() => setEditVisible(true)}
          >
            <Text style={styles.actionBtnIcon}>✏️</Text>
            <View>
              <Text style={styles.actionBtnTitle}>Edit Class Details</Text>
              <Text style={styles.actionBtnSub}>Update name, code, schedule</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
            onPress={() => { setPage("students"); loadStudents(); }}
          >
            <Text style={styles.actionBtnIcon}>👥</Text>
            <View>
              <Text style={styles.actionBtnTitle}>View Students</Text>
              <Text style={styles.actionBtnSub}>See enrolled students</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#dc2626" }]}
            onPress={handleDeleteClass}
          >
            <Text style={styles.actionBtnIcon}>🗑️</Text>
            <View>
              <Text style={styles.actionBtnTitle}>Delete Class</Text>
              <Text style={styles.actionBtnSub}>Remove class and all enrollments</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {page === "students" && (
        <ScrollView style={styles.container}>
          {students.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No students enrolled yet</Text>
            </View>
          ) : (
            students.map((s) => (
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
        </ScrollView>
      )}

      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✏️ Edit Class</Text>

            <Text style={styles.modalLabel}>Class Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Mathematics"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.modalLabel}>Class Code</Text>
            <TextInput
              style={styles.modalInput}
              value={editCode}
              onChangeText={setEditCode}
              placeholder="e.g. CS101"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />

            <Text style={styles.modalLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setEditDay(d)}
                  style={[styles.dayChip, editDay === d && styles.dayChipSelected]}
                >
                  <Text style={[styles.dayChipText, editDay === d && styles.dayChipTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>From Time</Text>
            <TextInput
              style={styles.modalInput}
              value={editFrom}
              onChangeText={setEditFrom}
              placeholder="e.g. 9:00 AM"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.modalLabel}>To Time</Text>
            <TextInput
              style={styles.modalInput}
              value={editTo}
              onChangeText={setEditTo}
              placeholder="e.g. 11:00 AM"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", elevation: 3,
  },
  backBtn: { fontSize: 15, fontWeight: "600", color: "#2563eb", width: 60 },
  topTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", flex: 1, textAlign: "center" },
  container: { flex: 1, padding: 20 },
  infoCard: {
    backgroundColor: "#ffffff", borderRadius: 16, padding: 24,
    alignItems: "center", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  infoIcon: { fontSize: 40, marginBottom: 10 },
  infoName: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  codeBadge: {
    backgroundColor: "#10b98120", borderWidth: 1, borderColor: "#10b981",
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginBottom: 8,
  },
  codeText: { color: "#10b981", fontWeight: "700", fontSize: 13 },
  infoSchedule: { fontSize: 13, color: "#64748b", marginTop: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 18, borderRadius: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  actionBtnIcon: { fontSize: 30 },
  actionBtnTitle: { fontSize: 16, fontWeight: "800", color: "white" },
  actionBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  studentCard: {
    backgroundColor: "#ffffff", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  studentAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center",
  },
  studentAvatarText: { color: "white", fontWeight: "800", fontSize: 18 },
  studentName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  studentDate: { fontSize: 12, color: "#64748b", marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "#00000077", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 20, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  modalInput: {
    backgroundColor: "#f1f5f9", padding: 12, borderRadius: 12,
    fontSize: 14, color: "#0f172a", marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0",
  },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "#e2e8f0", marginRight: 8, backgroundColor: "#f8fafc",
  },
  dayChipSelected: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  dayChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  dayChipTextSelected: { color: "white" },
  saveBtn: {
    backgroundColor: "#6366f1", padding: 14, borderRadius: 14,
    alignItems: "center", marginBottom: 10,
  },
  saveBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  cancelBtn: { padding: 14, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  cancelBtnText: { color: "#64748b", fontWeight: "600", fontSize: 15 },
});