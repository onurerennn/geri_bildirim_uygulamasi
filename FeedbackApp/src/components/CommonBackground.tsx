import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CommonBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

const CommonBackground: React.FC<CommonBackgroundProps> = ({ children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
});

export default CommonBackground; 