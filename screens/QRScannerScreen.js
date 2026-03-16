import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const nav = useNavigation();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Scan QR</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={{ color: "white" }}>Allow Camera </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Alert.alert("✅ تم المسح", `QR Data: ${data}`, [
      {
        text: "OK",
        onPress: () => nav.goBack(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
        <Text style={{ color: "white", fontWeight: "700" }}>← رجوع</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  msg: { fontSize: 16, marginBottom: 20 },
  btn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#00000088",
    padding: 10,
    borderRadius: 8,
  },
});