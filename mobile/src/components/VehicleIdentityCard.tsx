import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import type { VehicleIdentity } from "../types/report";

interface Props {
  identity: VehicleIdentity;
  vin: string;
}

interface RowProps {
  label: string;
  value: string | undefined | null;
}

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, !value && styles.rowValueMissing]}>
        {value ?? "Not available"}
      </Text>
    </View>
  );
}

export function VehicleIdentityCard({ identity, vin }: Props) {
  const year = identity.year?.value as string | undefined;
  const make = identity.make?.value as string | undefined;
  const model = identity.model?.value as string | undefined;
  const title = [year, make, model].filter(Boolean).join(" ") || "Unknown Vehicle";

  return (
    <View style={styles.container}>
      <Text style={styles.vehicleTitle}>{title}</Text>
      <Text style={styles.vin}>{vin}</Text>
      <View style={styles.divider} />
      <Row label="Trim" value={identity.trim?.value as string} />
      <Row label="Body" value={identity.body_style?.value as string} />
      <Row label="Engine" value={identity.engine?.value as string} />
      <Row label="Transmission" value={identity.transmission?.value as string} />
      <Row label="Drive" value={identity.drive_type?.value as string} />
      <Row label="Built In" value={identity.plant_country?.value as string} />
      <Text style={styles.sourceNote}>
        Identity: NHTSA VIN Decoder — high confidence
      </Text>
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
  vehicleTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  vin: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  rowValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  rowValueMissing: {
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  sourceNote: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 10,
  },
});
