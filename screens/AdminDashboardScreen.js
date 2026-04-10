import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function AdminDashboardScreen() {
  const nav = useNavigation();

  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [instructorCount, setInstructorCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [recentClasses, setRecentClasses] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const studentsQ = query(collection(db, "users"), where("role", "==", "student"));
      const instructorsQ = query(collection(db, "users"), where("role", "==", "instructor"));

      const [studentsSnap, instructorsSnap, classesSnap, enrollmentsSnap, attendanceSnap] =
        await Promise.all([
          getDocs(studentsQ),
          getDocs(instructorsQ),
          getDocs(collection(db, "classes")),
          getDocs(collection(db, "enrollments")),
          getDocs(collection(db, "attendance")),
        ]);

      setStudentCount(studentsSnap.size);
      setInstructorCount(instructorsSnap.size);
      setClassCount(classesSnap.size);
      setEnrollmentCount(enrollmentsSnap.size);
      setAttendanceCount(attendanceSnap.size);

      let classList = [];
      classesSnap.forEach((d) => classList.push({ id: d.id, ...d.data() }));

      classList.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

      setRecentClasses(classList.slice(0, 5));
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Admin Dashboard</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>⚙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSub}>System overview</Text>
              <Text style={styles.heroTitle}>Campus Administration Panel</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#2563eb" }]}>{studentCount}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#10b981" }]}>{instructorCount}</Text>
              <Text style={styles.statLabel}>Instructors</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#6366f1" }]}>{classCount}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#f59e0b" }]}>{enrollmentCount}</Text>
              <Text style={styles.statLabel}>Enrollments</Text>
            </View>
          </View>

          <View style={styles.fullStatCard}>
            <Text style={[styles.statNumber, { color: "#dc2626" }]}>{attendanceCount}</Text>
            <Text style={styles.statLabel}>Attendance Records</Text>
          </View>

          <Text style={styles.sectionTitle}>RECENT CLASSES</Text>

          {recentClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏫</Text>
              <Text style={styles.emptyText}>No classes found</Text>
            </View>
          ) : (
            recentClasses.map((item) => (
              <View key={item.id} style={styles.classCard}>
                <Text style={styles.classIcon}>📖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{item.name || "Unnamed Class"}</Text>
                  {item.classCode && (
                    <Text style={styles.classSub}>Code: {item.classCode}</Text>
                  )}
                  {item.day && (
                    <Text style={styles.classSub}>
                      📅 {item.day} {item.fromTime} → {item.toTime}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={() => nav.navigate("Admin")}>
            <Text style={styles.actionBtnText}>Open Instructors Management</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    elevation: 3,
  },

  backBtn: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
    width: 60,
  },

  topTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
    textAlign: "center",
  },

  container: {
    flex: 1,
    padding: 20,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },

  heroEmoji: {
    fontSize: 36,
  },

  heroSub: {
    fontSize: 13,
    color: "#64748b",
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  fullStatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 12,
  },

  classCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  classIcon: {
    fontSize: 24,
  },

  className: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  classSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },

  actionBtn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },

  actionBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },
});