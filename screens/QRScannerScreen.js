import React, { useState } from "react";
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

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Camera permission needed</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={{ color: "white" }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getUserData = async (uid) => {
    // جرب بالـ uid مباشرة
    const directSnap = await getDoc(doc(db, "users", uid));
    if (directSnap.exists()) return directSnap.data();

    // fallback للأكاونتات القديمة
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data();

    return null;
  };

  const handleScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // جيب الـ sessionId من آخر جزء في الـ URL
      const sessionId = data.split("/").pop();

      if (!sessionId) {
        Alert.alert("❌ خطأ", "QR code غير صحيح", [
          { text: "حاول تاني", onPress: () => setScanned(false) },
        ]);
        setLoading(false);
        return;
      }

      // تأكد إن الـ session active
      const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionSnap.exists() || !sessionSnap.data().active) {
        Alert.alert("❌ Session منتهية", "الـ session دي مش شغالة دلوقتي", [
          { text: "حاول تاني", onPress: () => setScanned(false) },
        ]);
        setLoading(false);
        return;
      }

      // جيب بيانات الطالب
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("❌ مش logged in", "لازم تلوقن الأول");
        setLoading(false);
        return;
      }

      const userData = await getUserData(user.uid);
      if (!userData) {
        Alert.alert("❌ خطأ", "مش لاقي بيانات المستخدم");
        setLoading(false);
        return;
      }

      // تأكد مش سجّل قبل كده
      const alreadyQ = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        where("studentUid", "==", user.uid),
      );
      const alreadySnap = await getDocs(alreadyQ);
      if (!alreadySnap.empty) {
        Alert.alert("⚠️ مسجّل قبل كده", "انت بالفعل سجّلت حضورك", [
          { text: "OK", onPress: () => nav.goBack() },
        ]);
        setLoading(false);
        return;
      }

      // سجّل الحضور
      await addDoc(collection(db, "attendance"), {
        sessionId,
        classId: sessionSnap.data().classId,
        studentUid: user.uid,
        studentName: `${userData.firstName} ${userData.lastName}`,
        studentId: userData.studentId || "",
        timestamp: new Date(),
      });

      Alert.alert("✅ تم تسجيل حضورك", `أهلاً ${userData.firstName}!`, [
        { text: "OK", onPress: () => nav.goBack() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("❌ خطأ", "حصل مشكلة، حاول تاني", [
        { text: "حاول تاني", onPress: () => setScanned(false) },
      ]);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>جاري تسجيل الحضور...</Text>
        </View>
      )}

      <View style={styles.scanFrame} />

      <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
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
  },
  msg: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  btn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    paddingHorizontal: 24,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#00000088",
    padding: 10,
    borderRadius: 8,
  },
  scanFrame: {
    position: "absolute",
    top: "30%",
    left: "20%",
    width: "60%",
    height: "25%",
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 12,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { color: "white", fontSize: 16, fontWeight: "600" },
});
