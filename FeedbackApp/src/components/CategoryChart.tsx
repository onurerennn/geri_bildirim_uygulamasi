import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface CategoryData {
    category: string;
    value: number;
    color: string;
}

interface CategoryChartProps {
    title: string;
    data: CategoryData[];
    maxValue?: number;
}

const CategoryChart: React.FC<CategoryChartProps> = ({
    title,
    data,
    maxValue = 100
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.chartContainer}>
                {data.map((item, index) => (
                    <View key={index} style={styles.chartItemContainer}>
                        <Text style={styles.categoryLabel}>{item.category}</Text>
                        <View style={styles.barContainer}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        width: `${(item.value / maxValue) * 100}%`,
                                        backgroundColor: item.color
                                    }
                                ]}
                            />
                            <Text style={styles.valueLabel}>{item.value}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#2c3e50',
    },
    chartContainer: {
        marginTop: 8,
    },
    chartItemContainer: {
        marginBottom: 12,
    },
    categoryLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
    },
    bar: {
        height: '100%',
        borderRadius: 4,
    },
    valueLabel: {
        position: 'absolute',
        right: 8,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
});

export default CategoryChart; 