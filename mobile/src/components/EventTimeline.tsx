import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, EventTypeColors } from "../constants/colors";
import type { HistoryEvent } from "../types/report";

interface Props {
  events: HistoryEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  ownership_change: "Ownership Change",
  accident: "Accident",
  service: "Service",
  recall_repair: "Recall Repair",
  title_brand: "Title Brand",
  odometer: "Odometer",
  auction: "Auction Sale",
  insurance_claim: "Insurance Claim",
};

export function EventTimeline({ events }: Props) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? events : events.slice(0, 5);

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Event Timeline</Text>
        <Text style={styles.empty}>
          No reported events available. This may reflect limited data coverage,
          not a clean history.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Timeline</Text>
      {displayed.map((event, i) => {
        const color = EventTypeColors[event.event_type] ?? Colors.textMuted;
        const isLast = i === displayed.length - 1 && !showAll;
        return (
          <View key={i} style={styles.row}>
            <View style={styles.lineCol}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <View style={styles.eventHeader}>
                <Text style={[styles.eventType, { color }]}>
                  {EVENT_LABELS[event.event_type] ?? event.event_type}
                </Text>
                {event.date && <Text style={styles.date}>{event.date}</Text>}
              </View>
              <Text style={styles.description}>{event.description}</Text>
              <View style={styles.meta}>
                <Text style={styles.source}>{event.source}</Text>
                {event.odometer && (
                  <Text style={styles.odometer}>{event.odometer.toLocaleString()} mi</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
      {events.length > 5 && (
        <TouchableOpacity onPress={() => setShowAll(!showAll)} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {showAll ? "Show less" : `Show ${events.length - 5} more events`}
          </Text>
        </TouchableOpacity>
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
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  empty: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  lineCol: {
    width: 20,
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 2,
    marginBottom: -2,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  eventType: {
    fontSize: 13,
    fontWeight: "700",
  },
  date: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  description: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  meta: {
    flexDirection: "row",
    gap: 12,
  },
  source: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  odometer: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  toggle: {
    paddingTop: 4,
    alignItems: "center",
  },
  toggleText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});
