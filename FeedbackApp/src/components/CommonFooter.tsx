import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';

interface FooterItem {
    name: string;
    icon: string;
    onPress: () => void;
    isActive?: boolean;
}

interface CommonFooterProps {
    items: FooterItem[];
}

const CommonFooter: React.FC<CommonFooterProps> = ({ items }) => {
    return (
        <View style={styles.footer}>
            {items.map((item, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.footerItem}
                    onPress={item.onPress}
                >
                    <Ionicons
                        name={item.icon}
                        size={24}
                        color={item.isActive ? '#3498db' : '#7f8c8d'}
                    />
                    <Text
                        style={[
                            styles.footerText,
                            { color: item.isActive ? '#3498db' : '#7f8c8d' }
                        ]}
                    >
                        {item.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingVertical: 8,
        justifyContent: 'space-around',
    },
    footerItem: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    footerText: {
        fontSize: 12,
        marginTop: 4,
    },
});

export default CommonFooter; 