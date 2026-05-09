import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

interface Props {
  score: number;
}

function getColor(score: number): string {
  if (score >= 70) return Colors.success;
  if (score >= 40) return Colors.warning;
  return Colors.danger;
}

function getLabel(score: number): string {
  if (score >= 70) return "Good Coverage";
  if (score >= 40) return "Partial Coverage";
  return "Limited Coverage";
}

export function ConfidenceGauge({ score }: Props) {
  const color = getColor(score);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Confidence Score</Text>
        <Text style={[styles.score, { color }]}>{pct}/100</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.sublabel, { color }]}>{getLabel(score)}</Text>
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
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  score: {
    fontSize: 22,
    fontWeight: "800",
  },
  track: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
