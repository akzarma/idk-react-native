import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { MOCK_SPEND_DATA, SpendTransaction } from "../data/mockSpendData";

type AnalyticsScreenProps = {
  onBack: () => void;
};

type TimeFilter = "today" | "week" | "month" | "year";

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#3B82F6",
  },
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: "#E2E8F0",
    strokeWidth: 1,
  },
};

const AnalyticsScreen = ({ onBack }: AnalyticsScreenProps) => {
  const insets = useSafeAreaInsets();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");

  // Filter transactions based on selected time period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return MOCK_SPEND_DATA.filter((tx) => {
      const txDate = new Date(tx.date);

      switch (timeFilter) {
        case "today":
          return txDate >= today;
        case "week": {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return txDate >= weekAgo;
        }
        case "month": {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return txDate >= monthAgo;
        }
        case "year": {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return txDate >= yearAgo;
        }
        default:
          return true;
      }
    });
  }, [timeFilter]);

  // Calculate total spend
  const totalSpend = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [filteredTransactions]);

  // Calculate average spend
  const averageSpend = useMemo(() => {
    if (filteredTransactions.length === 0) return 0;
    return totalSpend / filteredTransactions.length;
  }, [filteredTransactions, totalSpend]);

  // Calculate spend by category
  const spendByCategory = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};

    filteredTransactions.forEach((tx) => {
      if (!categoryMap[tx.category]) {
        categoryMap[tx.category] = 0;
      }
      categoryMap[tx.category] += tx.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: (amount / totalSpend) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, totalSpend]);

  // Prepare data for line chart (daily spending over time)
  const dailySpendData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};

    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const dateKey = date.toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = 0;
      }
      dailyMap[dateKey] += tx.amount;
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const numPoints =
      timeFilter === "today" ? 1 : Math.min(sortedDates.length, 10);
    const step = Math.max(1, Math.floor(sortedDates.length / numPoints));

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < sortedDates.length; i += step) {
      const dateKey = sortedDates[i];
      const date = new Date(dateKey);
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
      data.push(dailyMap[dateKey]);
    }

    return { labels, data };
  }, [filteredTransactions, timeFilter]);

  // Prepare data for pie chart
  const pieChartData = useMemo(() => {
    const colors = [
      "#3B82F6", // blue
      "#10B981", // green
      "#F59E0B", // amber
      "#EF4444", // red
      "#8B5CF6", // purple
      "#EC4899", // pink
      "#06B6D4", // cyan
      "#F97316", // orange
    ];

    return spendByCategory.slice(0, 6).map((cat, index) => ({
      name: cat.name,
      amount: cat.amount,
      color: colors[index % colors.length],
      legendFontColor: "#334155",
      legendFontSize: 12,
    }));
  }, [spendByCategory]);

  // Prepare data for category bar chart
  const categoryBarData = useMemo(() => {
    const topCategories = spendByCategory.slice(0, 5);
    return {
      labels: topCategories.map((cat) =>
        cat.name.length > 8 ? cat.name.substring(0, 8) + "..." : cat.name
      ),
      datasets: [
        {
          data: topCategories.map((cat) => cat.amount),
        },
      ],
    };
  }, [spendByCategory]);

  const timeFilterButtons: Array<{ key: TimeFilter; label: string }> = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Filter */}
        <View style={styles.filterContainer}>
          {timeFilterButtons.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.filterButton,
                timeFilter === btn.key && styles.filterButtonActive,
              ]}
              onPress={() => setTimeFilter(btn.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === btn.key && styles.filterButtonTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Spend Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Total Spend (
            {timeFilterButtons.find((b) => b.key === timeFilter)?.label})
          </Text>
          <Text style={styles.totalAmount}>${totalSpend.toFixed(2)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Transactions</Text>
              <Text style={styles.statValue}>
                {filteredTransactions.length}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>${averageSpend.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Spending Trend Chart - Only show for week/month/year */}
        {timeFilter !== "today" && dailySpendData.labels.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Spending Trend</Text>
            <LineChart
              data={{
                labels: dailySpendData.labels,
                datasets: [{ data: dailySpendData.data }],
              }}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              fromZero={true}
              yAxisLabel="$"
            />
          </View>
        )}

        {/* Category Distribution - Featured for Today */}
        {pieChartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {timeFilter === "today"
                ? "Today's Spending by Category"
                : "Category Distribution"}
            </Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Top Categories Bar Chart */}
        {categoryBarData.labels.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top Categories</Text>
            <BarChart
              data={categoryBarData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel="$"
              fromZero={true}
              showValuesOnTopOfBars={true}
              withInnerLines={false}
            />
          </View>
        )}

        {/* Category Breakdown List */}
        <View style={styles.categoryList}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {spendByCategory.map((category, index) => (
            <View key={category.name} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor: pieChartData[index]?.color || "#94A3B8",
                    },
                  ]}
                />
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryAmount}>
                  ${category.amount.toFixed(2)}
                </Text>
                <Text style={styles.categoryPercentage}>
                  {category.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsList}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {filteredTransactions.slice(0, 10).map((tx) => {
            const txDate = new Date(tx.date);
            return (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionDescription}>
                    {tx.description}
                  </Text>
                  <Text style={styles.transactionCategory}>{tx.category}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>
                    ${tx.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {txDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#F8FAFC",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonLabel: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 16,
  },
  headerSpacer: {
    width: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  categoryList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  categoryStats: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#64748B",
  },
  transactionsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: "#64748B",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: "#64748B",
  },
});
