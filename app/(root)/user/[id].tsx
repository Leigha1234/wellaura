import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

const User = () => {
    const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>User {id}</Text>
    </View>
  )
}

export default User;