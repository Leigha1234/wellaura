// app/(root)/(tabs)/test.tsx

import React from 'react';
import {
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

//==============================================================================
// 1. TypeScript Interfaces (to define the shape of our data)
//==============================================================================
interface Project {
  id: string;
  title: string;
  projectType: string;
  isArchived: boolean;
  createdDate: string;
  archiveTimestamp?: string;
}

interface ProjectsDashboardProps {
  projects: Project[];
  onLogout: () => void;
  onNewProject: () => void;
  onViewProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
}

//==============================================================================
// 2. The Main Dashboard Component
//==============================================================================
const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  onLogout,
  onNewProject,
  onViewProject,
  onArchiveProject,
}) => {
  return (
    <View>
      {/* --- Action Bar --- */}
      <View style={styles.actionBar}>
        <Pressable style={[styles.button, styles.logoutButton]} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.newProjectButton]} onPress={onNewProject}>
          <Text style={styles.newProjectButtonText}>New Project</Text>
        </Pressable>
      </View>

      {/* --- Projects List --- */}
      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>My Projects</Text>
        {projects.map((proj) => (
          <View key={proj.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.projectTitle}>{proj.title}</Text>
              <Text style={styles.projectSubtitle}>Type: {proj.projectType}</Text>
              <Text style={styles.projectSubtitle}>Created: {proj.createdDate}</Text>
            </View>
            <View style={styles.cardActions}>
              {proj.isArchived ? (
                <Text style={styles.archivedText}>Archived on {proj.archiveTimestamp}</Text>
              ) : (
                <>
                  <Pressable style={[styles.button, styles.archiveButton]} onPress={() => onArchiveProject(proj.id)}>
                    <Text style={styles.archiveButtonText}>Archive</Text>
                  </Pressable>
                  <Pressable style={[styles.button, styles.viewButton]} onPress={() => onViewProject(proj.id)}>
                    <Text style={styles.viewButtonText}>View Project</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};


//==============================================================================
// 3. The Main Screen (Parent Component with Sample Data)
//==============================================================================
const DashboardScreen = () => {
  // Sample data you would normally get from an API
  const sampleProjects: Project[] = [
    { id: 'proj1', title: "Summer Blockbuster", projectType: "Feature Film", isArchived: false, createdDate: "10 Jul 2025" },
    { id: 'proj2', title: "Downtown Commercial", projectType: "Commercial", isArchived: false, createdDate: "05 Jun 2025" },
    { id: 'proj3', title: "Old Documentary", projectType: "Documentary", isArchived: true, createdDate: "15 Jan 2025", archiveTimestamp: "01 Mar 2025" },
  ];

  // Placeholder functions for actions
  const handleAction = (action: string, id?: string) => {
    const message = id ? `${action}: ${id}` : action;
    Alert.alert("Action", message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.pageHeader}>
          <Image style={styles.logo} source={{ uri: 'https://via.placeholder.com/150x40.png?text=Logo' }} accessibilityLabel="Film Office Logo" />
          <Text style={styles.h1}>Filming Enquiry & Application Form</Text>
        </View>

        <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>Only select "New Project" if you are working on a new production that has not been registered.</Text>
        </View>

        <ProjectsDashboard
          projects={sampleProjects}
          onLogout={() => handleAction('Logout')}
          onNewProject={() => handleAction('New Project')}
          onViewProject={(id) => handleAction('View Project', id)}
          onArchiveProject={(id) => handleAction('Archive Project', id)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};


//==============================================================================
// 4. StyleSheet
//==============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fc' },
  pageHeader: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  logo: { width: 150, height: 40, resizeMode: 'contain', marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  noticeBox: { backgroundColor: '#fffbe6', padding: 20, margin: 20, borderRadius: 8, borderWidth: 1, borderColor: '#fef9c3' },
  noticeText: { color: '#713f12', fontSize: 14, lineHeight: 20 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  listContainer: { padding: 20 },
  listHeader: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  card: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  cardRow: { marginBottom: 12 },
  projectTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  projectSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 4 },
  archivedText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  logoutButton: { backgroundColor: '#fee2e2' },
  logoutButtonText: { color: '#991b1b', fontWeight: '500' },
  newProjectButton: { backgroundColor: '#fef3c7' },
  newProjectButtonText: { color: '#92400e', fontWeight: '500' },
  archiveButton: { backgroundColor: '#fee2e2', marginRight: 10 },
  archiveButtonText: { color: '#991b1b', fontWeight: '500' },
  viewButton: { backgroundColor: '#dbeafe' },
  viewButtonText: { color: '#1d4ed8', fontWeight: '500' },
});

export default DashboardScreen;