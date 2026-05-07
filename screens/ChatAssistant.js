import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

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

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
            ? "Hi 👋 I’m your AI assistant.\nAsk me anything about your attendance, classes, schedule, or dashboard."
            : role === "instructor"
              ? "Hi 👋 I’m your AI assistant.\nAsk me anything about students, classes, attendance, or sessions."
              : "Hi 👋 I’m your AI assistant.\nAsk me anything about users, dashboard, reports, or system activity.",
      },
    ]);
  }, [role]);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({
          animated: true,
        });
      }
    }, 100);
  }, [messages, isOpen]);

  const suggestions = useMemo(() => {
    if (role === "student") {
      return [
        "What is my attendance rate?",
        "What classes do I have today?",
        "Show my weekly schedule",
        "What is my recent activity?",
        "نسبة حضوري كام؟",
        "عندي ايه النهارده؟",
      ];
    }

    if (role === "instructor") {
      return [
        "How many students do I have?",
        "What classes do I have today?",
        "What is my average attendance?",
        "How many sessions this week?",
        "Show all my classes",
        "كام طالب عندي؟",
        "متوسط الحضور كام؟",
      ];
    }

    return [
      "Show system statistics",
      "How many users are registered?",
      "Show recent activity",
      "كام يوزر موجود؟",
    ];
  }, [role]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = {
      sender: "user",
      text: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("");

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `
You are a smart university dashboard assistant.

Rules:
- Reply clearly
- Keep answers short
- Support Arabic and English
- Use dashboard data when possible
              `,
          },

          {
            role: "user",
            content: `
Role:
${role}

Dashboard Data:
${JSON.stringify(data)}

Question:
${messageText}
              `,
          },
        ],

        model: "llama-3.3-70b-versatile",
      });

      const reply = completion.choices[0].message.content;

      const botMessage = {
        sender: "bot",
        text: reply,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.log(error);

      const botMessage = {
        sender: "bot",
        text: "AI Error.",
      };

      setMessages((prev) => [...prev, botMessage]);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "bot",
        text:
          role === "student"
            ? "Chat cleared successfully."
            : role === "instructor"
              ? "Instructor assistant cleared."
              : "Admin assistant cleared.",
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
                    {role === "student"
                      ? "🎓"
                      : role === "instructor"
                        ? "👨‍🏫"
                        : "🛡"}
                  </Text>
                </View>

                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>

                  <Text style={styles.headerSub}>
                    {role === "student"
                      ? "Student Helper"
                      : role === "instructor"
                        ? "Instructor Helper"
                        : "Admin Helper"}
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
              contentContainerStyle={{
                paddingBottom: 10,
              }}
            >
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.message,
                    msg.sender === "user"
                      ? styles.userMessage
                      : styles.botMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === "user" && {
                        color: "white",
                      },
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
