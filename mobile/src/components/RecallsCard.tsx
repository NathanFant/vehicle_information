import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../constants/colors";
import type { Recall } from "../types/report";

interface Props {
  recalls: Recall[];
  openCount: number;
}

export function RecallsCard({ recalls, openCount }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (recalls.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Recalls & Safety Campaigns</Text>
        <Text style={styles.none}>No recalls found for this vehicle configuration.</Text>
        <Text style={styles.source}>Source: NHTSA Recall Database</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recalls & Safety Campaigns</Text>
        {openCount > 0 && (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>{openCount} OPEN</Text>
          </View>
        )}
      </View>
      {recalls.map((recall) => {
        const isOpen = recall.status === "open";
        const isExpanded = expanded === recall.campaign_id;
        return (
          <TouchableOpacity
            key={recall.campaign_id}
            style={[styles.recall, isOpen && styles.recallOpen]}
            onPress={() => setExpanded(isExpanded ? null : recall.campaign_id)}
            activeOpacity={0.7}
          >
            <View style={styles.recallHeader}>
              <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.danger : Colors.success }]} />
              <Text style={styles.component} numberOfLines={isExpanded ? undefined : 1}>
                {recall.component}
              </Text>
              <Text style={[styles.status, { color: isOpen ? Colors.danger : Colors.success }]}>
                {recall.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.summary} numberOfLines={isExpanded ? undefined : 2}>
              {recall.summary}
            </Text>
            {isExpanded && (
              <>
                {recall.consequence && (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Risk</Text>
                    <Text style={styles.detailText}>{recall.consequence}</Text>
                  </View>
                )}
                {recall.remedy && (
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Remedy</Text>
                    <Text style={styles.detailText}>{recall.remedy}</Text>
                  </View>
                )}
                <Text style={styles.campaignId}>Campaign: {recall.campaign_id}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
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
    marginBottom: 12,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  openBadge: {
    backgroundColor: Colors.danger + "33",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  none: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  source: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  recall: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recallOpen: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  recallHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  component: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  status: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  detail: {
    marginTop: 8,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  campaignId: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 8,
  },
});
