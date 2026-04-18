import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";

export default function ChatAssistant({ role, data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);

  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        sender: "bot",
        text:
          role === "student"
            ? "Hi 👋 I’m your AI assistant.\nYou can ask me about your attendance, classes, today’s schedule, weekly schedule, recent activity, or digital ID."
            : role === "instructor"
            ? "Hi 👋 I’m your AI assistant.\nYou can ask me about your students, attendance, sessions, classes, today’s schedule, and recent activity."
            : "Hi 👋 I’m your AI assistant.\nYou can ask me about dashboard information.",
      },
    ]);
  }, [role]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [messages, isOpen]);

  const suggestions = useMemo(() => {
    if (role === "student") {
      return [
        "What is my attendance rate?",
        "What classes do I have today?",
        "Show my weekly schedule",
        "How many classes did I join?",
        "What is my recent activity?",
        "Where is my digital ID?",
        "نسبة حضوري كام؟",
        "عندي ايه النهارده؟",
        "وريني الجدول الاسبوعي",
      ];
    }

    if (role === "instructor") {
      return [
        "How many students do I have?",
        "What classes do I have today?",
        "What is my average attendance?",
        "How many sessions this week?",
        "Show all my classes",
        "What is my recent activity?",
        "كام طالب عندي؟",
        "عندي كام محاضرة النهارده؟",
        "متوسط الحضور كام؟",
      ];
    }

    return ["What can you do?"];
  }, [role]);

  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[؟?.,!]/g, "")
      .replace(/\s+/g, " ");
  };

  const includesAny = (msg, words) => {
    return words.some((word) => msg.includes(word));
  };

  const getTodayClassesText = (todayClasses, isStudent = true) => {
    if (!todayClasses || todayClasses.length === 0) {
      return isStudent
        ? "You have no classes today."
        : "You have no classes scheduled for today.";
    }

    const lines = todayClasses.map((cls, index) => {
      const name = cls.className || cls.name || "Class";
      const code = cls.classId || cls.classCode || "—";
      const start = cls.startTime || cls.fromTime || "—";
      const end = cls.endTime || cls.toTime || "—";
      return `${index + 1}. ${name} (${code}) from ${start} to ${end}`;
    });

    return `Here are today's classes:\n${lines.join("\n")}`;
  };

  const getWeeklyClassesText = (allClasses, isStudent = true) => {
    if (!allClasses || allClasses.length === 0) {
      return isStudent
        ? "You are not enrolled in any classes yet."
        : "You have not created any classes yet.";
    }

    const lines = allClasses.map((cls, index) => {
      const name = cls.className || cls.name || "Class";
      const code = cls.classId || cls.classCode || "—";
      const day = cls.day || "—";
      const start = cls.startTime || cls.fromTime || "—";
      const end = cls.endTime || cls.toTime || "—";
      return `${index + 1}. ${name} (${code}) - ${day} from ${start} to ${end}`;
    });

    return `Here is the full list:\n${lines.join("\n")}`;
  };

  const getActivityFeedText = (feed) => {
    if (!feed || feed.length === 0) {
      return "No recent activity found.";
    }

    return feed.map((item, index) => `${index + 1}. ${item.text}`).join("\n");
  };

  const getLowAttendanceAdvice = (rate) => {
    if (rate >= 85) return "Your attendance is very good. Keep it up ✅";
    if (rate >= 70) return "Your attendance is acceptable, but try not to miss more lectures.";
    if (rate >= 50) return "Your attendance is getting low. You should attend more lectures soon.";
    return "Your attendance is critically low. You need to improve it urgently.";
  };

  const getBotReply = (rawMessage) => {
    const msg = normalizeText(rawMessage);

    if (!msg) return "Please type a message first.";

    if (
      includesAny(msg, [
        "help",
        "what can you do",
        "what do you do",
        "who are you",
        "how can you help",
        "ممكن تساعدني في ايه",
        "بتعمل ايه",
        "تقدر تعمل ايه",
        "مين انت",
        "مساعدة",
      ])
    ) {
      if (role === "student") {
        return "I can help you with:\n1. Your attendance rate\n2. Today’s classes\n3. Weekly schedule\n4. Joined classes\n5. Recent activity\n6. Digital ID location";
      }

      if (role === "instructor") {
        return "I can help you with:\n1. Total students\n2. Today’s classes\n3. Average attendance\n4. Sessions this week\n5. All classes\n6. Recent activity";
      }

      return "I can help you with dashboard information.";
    }

    if (
      includesAny(msg, [
        "hi",
        "hello",
        "hey",
        "السلام عليكم",
        "اهلا",
        "هاي",
        "مرحبا",
        "ازيك",
      ])
    ) {
      return role === "student"
        ? "Hello 👋 Ready to help with your attendance, schedule, and classes."
        : "Hello 👋 Ready to help with your classes, students, and attendance.";
    }

    if (includesAny(msg, ["thanks", "thank you", "شكرا", "متشكر", "تسلم"])) {
      return "You’re welcome 🌟";
    }

    if (role === "student") {
      if (
        includesAny(msg, [
          "attendance",
          "attendance rate",
          "my attendance",
          "attendance percentage",
          "نسبة حضوري",
          "الحضور",
          "حضوري",
          "حضوري كام",
          "نسبتي كام",
        ])
      ) {
        const rate = data?.studentAttendanceRate ?? 0;
        return `Your attendance rate is ${rate}%.\n${getLowAttendanceAdvice(rate)}`;
      }

      if (
        includesAny(msg, [
          "today",
          "today classes",
          "classes today",
          "schedule today",
          "today schedule",
          "جدولي النهارده",
          "عندي ايه النهارده",
          "محاضرات النهارده",
          "النهارده",
        ])
      ) {
        return getTodayClassesText(data?.todayStudentClasses, true);
      }

      if (
        includesAny(msg, [
          "joined classes",
          "how many classes",
          "my classes",
          "joined",
          "enrolled",
          "عدد المواد",
          "مشترك في كام ماده",
          "انا مشترك في كام",
          "موادي",
          "كلاساتي",
        ])
      ) {
        return `You are enrolled in ${data?.studentEnrollments?.length || 0} classes.`;
      }

      if (
        includesAny(msg, [
          "weekly schedule",
          "week schedule",
          "all classes",
          "my weekly classes",
          "الجدول الاسبوعي",
          "كل المواد",
          "كل الكلاسات",
          "جدولي الاسبوعي",
          "الاسبوع",
        ])
      ) {
        return getWeeklyClassesText(data?.studentEnrollments, true);
      }

      if (
        includesAny(msg, [
          "recent activity",
          "activity",
          "history",
          "recent",
          "النشاط",
          "اخر نشاط",
          "اخر حاجة",
          "history log",
        ])
      ) {
        return getActivityFeedText(data?.studentActivityFeed);
      }

      if (
        includesAny(msg, [
          "digital id",
          "id",
          "my id",
          "بطاقتي",
          "الكارنيه",
          "الديجيتال id",
          "فين البطاقة",
        ])
      ) {
        return "You can open your Digital ID from the bottom menu using the Digital ID page.";
      }

      return "I didn’t fully understand.\nTry asking about:\n- your attendance\n- today’s classes\n- weekly schedule\n- joined classes\n- recent activity\n- digital ID";
    }

    if (role === "instructor") {
      if (
        includesAny(msg, [
          "students",
          "how many students",
          "total students",
          "student count",
          "كام طالب",
          "عدد الطلاب",
          "الطلاب",
          "عندي كام طالب",
        ])
      ) {
        return `You currently have ${data?.totalEnrolledStudents ?? 0} enrolled students across your classes.`;
      }

      if (
        includesAny(msg, [
          "today",
          "today classes",
          "today schedule",
          "classes today",
          "محاضرات النهارده",
          "عندي كام محاضرة النهارده",
          "جدولي النهارده",
          "النهارده",
        ])
      ) {
        return getTodayClassesText(data?.todayInstructorClasses, false);
      }

      if (
        includesAny(msg, [
          "attendance",
          "average attendance",
          "avg attendance",
          "attendance rate",
          "متوسط الحضور",
          "الحضور",
          "نسبة الحضور",
        ])
      ) {
        const rate = data?.instructorAttendanceRate ?? 0;
        return `Your average attendance is ${rate}%.`;
      }

      if (
        includesAny(msg, [
          "sessions",
          "sessions this week",
          "this week sessions",
          "كام session",
          "عدد السيشنز",
          "عدد المحاضرات",
          "السيشنز",
        ])
      ) {
        return `You have ${data?.sessionsThisWeek ?? 0} recorded sessions this week.`;
      }

      if (
        includesAny(msg, [
          "all classes",
          "my classes",
          "classes",
          "كل الكلاسات",
          "كل المواد",
          "كلاساتي",
          "المواد",
        ])
      ) {
        return getWeeklyClassesText(data?.instructorClasses, false);
      }

      if (
        includesAny(msg, [
          "recent activity",
          "activity",
          "recent",
          "اخر نشاط",
          "النشاط",
          "التحركات",
        ])
      ) {
        return getActivityFeedText(data?.instructorActivityFeed);
      }

      return "I didn’t fully understand.\nTry asking about:\n- students\n- today’s classes\n- average attendance\n- sessions this week\n- all classes\n- recent activity";
    }

    return "Dashboard assistant is not available for this role.";
  };

  const sendMessage = (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = {
      sender: "user",
      text: messageText,
    };

    const botMessage = {
      sender: "bot",
      text: getBotReply(messageText),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "bot",
        text:
          role === "student"
            ? "Chat cleared. Ask me again about your attendance, schedule, or classes."
            : "Chat cleared. Ask me again about your students, classes, or attendance.",
      },
    ]);
  };

  return (
    <>
      {!isOpen && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)}>
          <Text style={styles.fabText}>💬</Text>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.chatBox, isExpanded && styles.chatBoxExpanded]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.botIcon}>
                  <Text style={styles.botIconText}>
                    {role === "student" ? "🎓" : "👨‍🏫"}
                  </Text>
                </View>

                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSub}>
                    {role === "student" ? "Student Helper" : "Instructor Helper"}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => setIsExpanded((prev) => !prev)}
                >
                  <Text style={styles.headerBtnText}>⛶</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerBtn} onPress={clearChat}>
                  <Text style={styles.headerBtnText}>🗑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => setIsOpen(false)}
                >
                  <Text style={styles.headerBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionTitle}>💡 Suggestions</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionList}
              >
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionBtn}
                    onPress={() => sendMessage(item)}
                  >
                    <Text style={styles.suggestionBtnText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messagesWrap}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.message,
                    msg.sender === "user" ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === "user" && { color: "white" },
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Ask me anything..."
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
              />

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => sendMessage()}
              >
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 8,
  },

  fabText: {
    fontSize: 24,
    color: "white",
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.18)",
  },

  chatBox: {
    height: "78%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  chatBoxExpanded: {
    height: "92%",
  },

  header: {
    backgroundColor: "#4f46e5",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  botIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },

  botIconText: {
    fontSize: 18,
  },

  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  headerSub: {
    color: "white",
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },

  suggestionsWrap: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    backgroundColor: "#fafbff",
  },

  suggestionTitle: {
    color: "#4f46e5",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  suggestionList: {
    gap: 8,
    paddingRight: 10,
  },

  suggestionBtn: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "white",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  suggestionBtnText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },

  messagesWrap: {
    flex: 1,
    padding: 14,
    backgroundColor: "#ffffff",
  },

  message: {
    maxWidth: "86%",
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 16,
    marginBottom: 10,
  },

  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4f46e5",
  },

  messageText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
  },

  inputWrap: {
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
  },

  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
  },

  sendBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});