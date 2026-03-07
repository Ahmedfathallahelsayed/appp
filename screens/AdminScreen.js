import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function AdminScreen() {
  const nav = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel (UI Only)</Text>
      <Text style={styles.subtitle}>This is a placeholder screen.</Text>

      <Pressable style={styles.button} onPress={() => nav.goBack()}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ width:"90%", alignSelf:"center", marginTop:80, backgroundColor:"#fff",
    padding:25, borderRadius:15, elevation:2 },
  title:{ fontSize:22, fontWeight:"700", textAlign:"center" },
  subtitle:{ fontSize:13, color:"gray", textAlign:"center", marginTop:6, marginBottom:20 },
  button:{ height:45, backgroundColor:"dodgerblue", justifyContent:"center", borderRadius:10 },
  btnText:{ color:"#fff", fontWeight:"bold", textAlign:"center", fontSize:15 },
});