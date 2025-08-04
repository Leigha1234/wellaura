import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatWithLaura() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I'm Laura. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer YOUR_OPENAI_API_KEYsk-proj-7iHTxyug3hAk8vfViFh6TuvElnqitOSz06MbIcGuqW_z8-vsVmzuI2EzWPV2SrXAjt2ZE3-d29T3BlbkFJ9KGv4HPP4H_VfO3aakuI3HV6FA87SyLy8iLlDeKhLtX1JvLw58mJPVgdooozaSmbNT_Boo3eQA`, // Replace with real key
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: updatedMessages,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Hmm, I'm not sure!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't respond." }]);
    }

    setLoading(false);
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageContainer, isUser ? styles.userAlign : styles.assistantAlign]}>
        {!isUser && (
            <Image
                source={{ uri: "https://example.com/assistant-avatar.png" }} // Replace with your avatar URL
                style={styles.avatar}
            />
        
        )}
        <View style={[styles.messageBubble, isUser ? styles.userMsg : styles.botMsg]}>
          <Text style={{ color: isUser ? "#fff" : "#000" }}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatArea}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <Text style={styles.typingIndicator}>Laura is typing...</Text>
      )}

      <View style={styles.inputBox}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Laura something..."
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={loading}>
          <Text style={{ color: "#fff" }}>{loading ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdff" },
  chatArea: { padding: 16, paddingBottom: 100 },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  assistantAlign: { alignSelf: "flex-start" },
  userAlign: { alignSelf: "flex-end" },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 12,
    padding: 10,
  },
  userMsg: {
    backgroundColor: "#6b4ca5",
    borderBottomRightRadius: 0,
  },
  botMsg: {
    backgroundColor: "#e1e5f2",
    borderBottomLeftRadius: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  typingIndicator: {
    marginLeft: 16,
    marginBottom: 6,
    fontStyle: "italic",
    color: "#888",
  },
  inputBox: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 40,
  },
  sendButton: {
    backgroundColor: "#6b4ca5",
    borderRadius: 10,
    marginLeft: 10,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
});
