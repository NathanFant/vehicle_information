import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, RiskColors } from "../constants/colors";
import type { RiskFlag } from "../types/report";

interface Props {
  flags: RiskFlag[];
}

const SEVERITY_ICON: Record<string, string> = {
  high: "⚠",
  medium: "▲",
  low: "●",
};

export function RiskFlagsCard({ flags }: Props) {
  if (flags.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Risk Indicators</Text>
        <View style={styles.clearRow}>
          <Text style={styles.clearIcon}>✓</Text>
          <Text style={styles.clearText}>No risk indicators detected in available data.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk Indicators</Text>
      {flags.map((flag, i) => (
        <View key={i} style={[styles.flag, { borderLeftColor: RiskColors[flag.severity] }]}>
          <View style={styles.flagHeader}>
            <Text style={[styles.icon, { color: RiskColors[flag.severity] }]}>
              {SEVERITY_ICON[flag.severity]}
            </Text>
            <Text style={[styles.category, { color: RiskColors[flag.severity] }]}>
              {flag.category}
            </Text>
            <Text style={styles.severity}>{flag.severity.toUpperCase()}</Text>
          </View>
          <Text style={styles.description}>{flag.description}</Text>
          <Text style={styles.source}>Source: {flag.source}</Text>
        </View>
      ))}
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
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  clearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearIcon: {
    color: Colors.success,
    fontSize: 18,
  },
  clearText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  flag: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  flagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  icon: {
    fontSize: 14,
  },
  category: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  severity: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  description: {
    color: Colors.textPrimary,
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  source: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
