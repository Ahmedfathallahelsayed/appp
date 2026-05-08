import React, { useCallback, useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { useNavigation } from "@react-navigation/native";

import { collection, getDocs, query, where } from "firebase/firestore";

import { auth, db } from "../firebase";

export default function InstructorReviewsScreen() {
  const navigation = useNavigation();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setReviews([]);
        return;
      }

      const classesQuery = query(
        collection(db, "classes"),
        where("instructorId", "==", user.uid),
      );

      const classesSnapshot = await getDocs(classesQuery);

      const classIds = classesSnapshot.docs.map((doc) => doc.id);

      if (classIds.length === 0) {
        setReviews([]);
        return;
      }

      let allReviews = [];

      for (const classId of classIds) {
        const reviewQuery = query(
          collection(db, "reviews"),
          where("classId", "==", classId),
        );

        const reviewSnapshot = await getDocs(reviewQuery);

        const reviewData = reviewSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        allReviews.push(...reviewData);
      }

      allReviews.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setReviews(allReviews);
    } catch (error) {
      console.log("Load Reviews Error:", error);
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const renderStars = (rating) => {
    return "⭐".repeat(Number(rating || 0));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    try {
      return timestamp.toDate().toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Student Reviews</Text>

        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⭐</Text>

          <Text style={styles.emptyTitle}>No reviews yet</Text>

          <Text style={styles.emptySubtitle}>
            Reviews submitted by students will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 40,
          }}
        >
          <Text style={styles.reviewCount}>
            {reviews.length} Review
            {reviews.length !== 1 ? "s" : ""}
          </Text>

          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>
                    {review.className || "Class"}
                  </Text>

                  <Text style={styles.classCode}>{review.classCode || ""}</Text>
                </View>

                <Text style={styles.stars}>{renderStars(review.rating)}</Text>
              </View>

              <Text style={styles.studentName}>
                From: {review.studentName || "Student"}
              </Text>

              <Text style={styles.comment}>{review.comment || ""}</Text>

              <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

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

  backBtn: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },

  reviewCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
  },

  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  className: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },

  classCode: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },

  stars: {
    fontSize: 15,
  },

  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
  },

  comment: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
  },

  date: {
    marginTop: 12,
    fontSize: 12,
    color: "#94a3b8",
  },
});
