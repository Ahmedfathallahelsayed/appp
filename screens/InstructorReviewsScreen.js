import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const REVIEW_CHUNK = 30;

function formatReviewDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export default function InstructorReviewsScreen() {
  const nav = useNavigation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setReviews([]);
      setLoading(false);
      return;
    }

    try {
      const classesQ = query(collection(db, "classes"), where("instructorId", "==", user.uid));
      const classesSnap = await getDocs(classesQ);
      const classIds = classesSnap.docs.map((d) => d.id);

      if (classIds.length === 0) {
        setReviews([]);
        return;
      }

      const byId = new Map();
      for (let i = 0; i < classIds.length; i += REVIEW_CHUNK) {
        const chunk = classIds.slice(i, i + REVIEW_CHUNK);
        const revQ = query(collection(db, "reviews"), where("classId", "in", chunk));
        const revSnap = await getDocs(revQ);
        revSnap.forEach((docSnap) => {
          byId.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      }

      const list = Array.from(byId.values());
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setReviews(list);
    } catch (e) {
      console.warn("InstructorReviews load error:", e);
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    loadReviews();
  }, [loadReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Student reviews</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>No reviews yet for your classes.</Text>
          <Text style={styles.emptyHint}>Reviews from the web or the student app appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.count}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
          {reviews.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.className}>{r.className || "Class"}</Text>
                <Text style={styles.stars}>{"⭐".repeat(Math.min(5, Math.max(1, Number(r.rating) || 0)))}</Text>
              </View>
              {r.classCode ? <Text style={styles.meta}>Code: {r.classCode}</Text> : null}
              <Text style={styles.student}>From: {r.studentName || "Student"}</Text>
              <Text style={styles.comment}>{r.comment || ""}</Text>
              <Text style={styles.date}>{formatReviewDate(r.createdAt)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  back: { fontSize: 15, fontWeight: "600", color: "#2563eb" },
  title: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#334155", textAlign: "center" },
  emptyHint: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  count: { fontSize: 13, fontWeight: "600", color: "#64748b", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  className: { fontSize: 16, fontWeight: "800", color: "#0f172a", flex: 1, marginRight: 8 },
  stars: { fontSize: 14 },
  meta: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  student: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  comment: { fontSize: 14, color: "#1e293b", lineHeight: 20 },
  date: { fontSize: 11, color: "#94a3b8", marginTop: 10 },
});
