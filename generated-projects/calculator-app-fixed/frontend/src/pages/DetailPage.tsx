// DetailPage.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import DataForm from './DataForm';
import Button from './Button';
import { Note } from './types';
import { useApi } from './useApi';

interface DetailPageProps {
  noteId: string;
  onBack: () => void;
}

const DetailPage: React.FC<DetailPageProps> = ({ noteId, onBack }) => {
  const { notes, updateNote, removeNote } = useApi();
  const [formError, setFormError] = useState<string | null>(null);

  const note = notes.find((n) => n.id === noteId);

  if (!note) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Note not found.</Text>
      </View>
    );
  }

  const handleFormSubmit = async (updatedNote: Note) => {
    try {
      await updateNote(noteId, updatedNote);
      Alert.alert('Success', 'Note updated successfully!');
      onBack();
    } catch (err) {
      setFormError('Failed to update note.');
    }
  };

  const handleDelete = async () => {
    try {
      await removeNote(noteId);
      Alert.alert('Success', 'Note deleted successfully!');
      onBack();
    } catch (err) {
      setFormError('Failed to delete note.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Note</Text>
      {formError && <Text style={styles.errorText}>{formError}</Text>}
      <DataForm note={note} onSubmit={handleFormSubmit} />
      <View style={styles.buttonContainer}>
        <Button title="Delete Note" onPress={handleDelete} />
        <Button title="Back" onPress={onBack} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#6200ee',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});

export default DetailPage;