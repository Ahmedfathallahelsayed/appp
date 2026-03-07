import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

import { useNavigation } from "@react-navigation/native";

export default function ManageClassScreen({ route }) {
  const { classId } = route.params;
  const nav = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.faculty}>
            Faculty of Science - Cairo University
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Manage Class</Text>

          <Text style={styles.id}>Class ID: {classId}</Text>

          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Start Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>View Students</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Text style={styles.backText}>Back to Classes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },

  topBar: {
    marginBottom: 40,
  },

  faculty: {
    fontWeight: "700",
    fontSize: 16,
  },

  content: {
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },

  id: {
    marginBottom: 20,
  },

  btn: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    width: 250,
    alignItems: "center",
    marginBottom: 10,
  },

  btnText: {
    color: "white",
    fontWeight: "700",
  },

  bottom: {
    alignItems: "flex-start",
  },

  backBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    width: 150,
    alignItems: "center",
  },

  backText: {
    color: "white",
    fontWeight: "600",
  },
});
