import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../constants/colors";

interface Props {
  gaps: string[];
  sourcesQueried: string[];
  sourcesAvailable: string[];
}

export function DataGapsCard({ gaps, sourcesQueried, sourcesAvailable }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>Coverage & Data Gaps</Text>
        <Text style={styles.toggle}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      <View style={styles.coverage}>
        <Text style={styles.coverageLabel}>
          {sourcesAvailable.length}/{sourcesQueried.length} sources returned data
        </Text>
        <View style={styles.dots}>
          {sourcesQueried.map((source) => (
            <View
              key={source}
              style={[
                styles.dot,
                { backgroundColor: sourcesAvailable.includes(source) ? Colors.success : Colors.border },
              ]}
            />
          ))}
        </View>
      </View>

      {expanded && (
        <View style={styles.gapList}>
          <Text style={styles.disclaimer}>
            The following data was not available for this report. This reflects source coverage
            limitations, not necessarily a clean vehicle history.
          </Text>
          {gaps.map((gap, i) => (
            <View key={i} style={styles.gapRow}>
              <Text style={styles.gapBullet}>○</Text>
              <Text style={styles.gapText}>{gap}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  toggle: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  coverage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coverageLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gapList: {
    marginTop: 12,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    marginBottom: 10,
  },
  gapRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  gapBullet: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  gapText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
