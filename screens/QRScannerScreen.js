import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
} from "firebase/firestore";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigation();

  // القفل المركزي لمنع تكرار الـ QR
  const isProcessing = useRef(false);

  const handleSafeBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
    } else {
      nav.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>الكاميرا محتاجة إذن عشان تشتغل</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={{ color: "white", fontWeight: "bold" }}>سماح بالكاميرا</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getUserData = async (uid) => {
    try {
      const directSnap = await getDoc(doc(db, "users", uid));
      if (directSnap.exists()) return directSnap.data();

      const q = query(collection(db, "users"), where("uid", "==", uid));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data();
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
    return null;
  };

  const handleScanned = async ({ data }) => {
    if (isProcessing.current || scanned) return; // خروج لو في عملية
    isProcessing.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const sessionId = data.split("/").pop();
      if (!sessionId) throw new Error("QR code غير صالح");

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("❌ عذراً", "يجب عليك تسجيل الدخول أولاً");
        setLoading(false);
        return;
      }

      const attendanceRef = collection(db, "attendance");
      const alreadyQ = query(
        attendanceRef,
        where("sessionId", "==", sessionId),
        where("studentUid", "==", user.uid)
      );
      const alreadySnap = await getDocs(alreadyQ);

      if (!alreadySnap.empty) {
        Alert.alert("⚠️ تنبيه", "أنت مسجل حضور بالفعل في هذه الجلسة", [
          { text: "حسناً", onPress: handleSafeBack },
        ]);
        setLoading(false);
        return;
      }

      const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionSnap.exists() || !sessionSnap.data().active) {
        Alert.alert("❌ خطأ", "هذه الجلسة غير متاحة حالياً", [
          {
            text: "حاول مرة أخرى",
            onPress: () => {
              isProcessing.current = false;
              setScanned(false);
            },
          },
        ]);
        setLoading(false);
        return;
      }

      const userData = await getUserData(user.uid);

      await addDoc(attendanceRef, {
        sessionId,
        classId: sessionSnap.data().classId || "",
        studentUid: user.uid,
        studentName: userData
          ? `${userData.firstName} ${userData.lastName}`
          : "Unknown Student",
        studentId: userData?.studentId || "",
        timestamp: new Date(),
      });

      Alert.alert("✅ ناجح", `تم تسجيل حضورك بنجاح!`, [
        { text: "ممتاز", onPress: handleSafeBack },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("❌ خطأ", "حدث خطأ، حاول مرة أخرى", [
        {
          text: "إغلاق",
          onPress: () => {
            isProcessing.current = false;
            setScanned(false);
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>جاري التحقق من البيانات...</Text>
        </View>
      )}

      {!loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>ضع رمز الـ QR داخل الإطار</Text>
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={handleSafeBack}>
        <Text style={{ color: "white", fontWeight: "700" }}>← رجوع</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  msg: { fontSize: 16, marginBottom: 20, textAlign: "center", color: "#374151" },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  instructionText: {
    color: "white",
    marginTop: 20,
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingText: { color: "#2563eb", fontSize: 16, fontWeight: "600", marginTop: 10 },
});