import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Colors } from "../../src/constants/colors";
import { useVinLookup } from "../../src/hooks/useVinLookup";
import { VehicleIdentityCard } from "../../src/components/VehicleIdentityCard";
import { ConfidenceGauge } from "../../src/components/ConfidenceGauge";
import { RiskFlagsCard } from "../../src/components/RiskFlagsCard";
import { RecallsCard } from "../../src/components/RecallsCard";
import { EventTimeline } from "../../src/components/EventTimeline";
import { DataGapsCard } from "../../src/components/DataGapsCard";

export default function ReportScreen() {
  const { vin } = useLocalSearchParams<{ vin: string }>();
  const navigation = useNavigation();
  const { report, loading, error, lookup } = useVinLookup();

  useEffect(() => {
    if (vin) {
      lookup(vin);
      navigation.setOptions({ title: vin });
    }
  }, [vin]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Querying data sources…</Text>
        <Text style={styles.loadingSubtext}>
          NHTSA · CARFAX · AutoCheck · NMVTIS
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Lookup Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => vin && lookup(vin)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!report) return null;

  const highRisk = report.risk_flags.filter((f) => f.severity === "high").length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* Summary Banner */}
      <View style={[styles.summaryBanner, highRisk > 0 && styles.summaryBannerWarning]}>
        <Text style={styles.summaryText}>{report.buyer_summary}</Text>
        <Text style={styles.generatedAt}>
          Report generated {new Date(report.generated_at).toLocaleString()}
        </Text>
      </View>

      {/* Confidence Gauge */}
      <ConfidenceGauge score={report.confidence_score} />

      {/* Vehicle Identity */}
      {report.identity && (
        <VehicleIdentityCard identity={report.identity} vin={report.vin} />
      )}

      {/* Risk Flags */}
      <RiskFlagsCard flags={report.risk_flags} />

      {/* Recalls */}
      <RecallsCard recalls={report.recalls} openCount={report.open_recall_count} />

      {/* Event Timeline */}
      <EventTimeline events={report.events} />

      {/* Coverage & Gaps */}
      <DataGapsCard
        gaps={report.data_gaps}
        sourcesQueried={report.sources_queried}
        sourcesAvailable={report.sources_available}
      />

      <Text style={styles.legalNote}>
        This report reflects available reported data only. It is not an endorsement of
        vehicle condition. Private repairs, unreported incidents, and dealer-only records
        are not visible to this system. Always perform a pre-purchase inspection by a
        qualified mechanic.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  loadingSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
    color: Colors.warning,
  },
  errorTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  summaryBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  summaryBannerWarning: {
    borderLeftColor: Colors.warning,
  },
  summaryText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  generatedAt: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  legalNote: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    fontStyle: "italic",
  },
});
