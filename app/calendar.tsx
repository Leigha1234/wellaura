import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export default function Calendar() {
  const router = useRouter();
  const [tasks, setTasks] = useState([
    { id: 1, title: "Meeting with Sam", time: "2025-05-24T09:00", view: "week" },
    { id: 2, title: "Buy groceries", time: "", view: "month" },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [viewMode, setViewMode] = useState("month");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState(null);

  const addTask = (selectedTime = "") => {
    if (newTaskTitle.trim() === "") return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      time: selectedTime || newTaskTime,
      view: viewMode
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
    setNewTaskTime("");
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const updateTask = () => {
    if (!taskBeingEdited) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskBeingEdited.id ? taskBeingEdited : task
      )
    );
    setEditModalVisible(false);
    setTaskBeingEdited(null);
  };

  const renderTasks = (filterView) => {
    return tasks
      .filter((task) => task.view === filterView)
      .map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View>
            <Text style={styles.taskTitle}>{task.title}</Text>
            {task.time ? <Text style={styles.taskTime}>{task.time}</Text> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                setTaskBeingEdited(task);
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={20} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTask(task.id)}>
              <Ionicons name="trash" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
      ));
  };

  const renderDayTimeline = () => (
    <ScrollView style={{ marginTop: 10 }}>
      {hours.map((hour) => (
        <TouchableOpacity
          key={hour}
          style={styles.timeSlot}
          onPress={() => addTask(`Today at ${hour}`)}
        >
          <Text style={styles.timeLabel}>{hour}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafe" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Calendar</Text>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewOption, viewMode === "day" && styles.activeView]}
            onPress={() => setViewMode("day")}
          >
            <MaterialCommunityIcons name="calendar-today" size={20} color={viewMode === "day" ? "#fff" : "#555"} />
            <Text style={[styles.viewLabel, viewMode === "day" && { color: "#fff" }]}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewOption, viewMode === "week" && styles.activeView]}
            onPress={() => setViewMode("week")}
          >
            <MaterialCommunityIcons name="calendar-week" size={20} color={viewMode === "week" ? "#fff" : "#555"} />
            <Text style={[styles.viewLabel, viewMode === "week" && { color: "#fff" }]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewOption, viewMode === "month" && styles.activeView]}
            onPress={() => setViewMode("month")}
          >
            <MaterialCommunityIcons name="calendar-month" size={20} color={viewMode === "month" ? "#fff" : "#555"} />
            <Text style={[styles.viewLabel, viewMode === "month" && { color: "#fff" }]}>Month</Text>
          </TouchableOpacity>
        </View>

        {/* Add Task */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Task title"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Optional time (e.g. 5PM)"
            value={newTaskTime}
            onChangeText={setNewTaskTime}
            style={styles.input}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => addTask()}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* View Rendering */}
        {viewMode === "month" && <View style={styles.taskList}>{renderTasks("month")}</View>}
        {viewMode === "week" && <View style={styles.taskList}>{renderTasks("week")}</View>}
        {viewMode === "day" && (
          <View style={{ flex: 1 }}>
            {renderDayTimeline()}
            <View style={{ marginTop: 20 }}>{renderTasks("day")}</View>
          </View>
        )}

        {/* Edit Task Modal */}
        <Modal visible={editModalVisible} animationType="slide">
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TextInput
              placeholder="Task title"
              value={taskBeingEdited?.title}
              onChangeText={(text) =>
                setTaskBeingEdited({ ...taskBeingEdited, title: text })
              }
              style={styles.input}
            />
            <TextInput
              placeholder="Time"
              value={taskBeingEdited?.time}
              onChangeText={(text) =>
                setTaskBeingEdited({ ...taskBeingEdited, time: text })
              }
              style={styles.input}
            />
            <TouchableOpacity onPress={updateTask} style={styles.addButton}>
              <Text style={styles.addButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ marginTop: 10 }}>
              <Text style={{ color: "#888", textAlign: "center" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e2a3c",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#f2f4f7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  taskList: {
    gap: 15,
    marginTop: 10,
  },
  taskCard: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e2a3c",
  },
  taskTime: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  viewOption: {
    flex: 1,
    backgroundColor: "#f2f4f7",
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  viewLabel: {
    fontWeight: "600",
    color: "#555",
  },
  activeView: {
    backgroundColor: "#4a90e2",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  timeSlot: {
    paddingVertical: 14,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  timeLabel: {
    color: "#333",
    fontSize: 16,
  },
});
