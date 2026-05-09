import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../src/constants/colors";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

const SAMPLE_VINS = [
  { vin: "1HGBH41JXMN109186", label: "Honda Civic (demo)" },
  { vin: "JN1CA31A9XT801901", label: "Nissan (demo)" },
  { vin: "2T1BURHE0JC027151", label: "Toyota Corolla (demo)" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [vin, setVin] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatted = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "");

  function handleChange(text: string) {
    const clean = text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "");
    setVin(clean);
    setValidationError(null);
  }

  function handleSubmit() {
    const v = formatted.trim();
    if (!v) {
      setValidationError("Please enter a VIN.");
      return;
    }
    if (v.length !== 17) {
      setValidationError(`VIN must be 17 characters (currently ${v.length}).`);
      return;
    }
    if (!VIN_RE.test(v)) {
      setValidationError("VIN contains invalid characters (I, O, Q not allowed).");
      return;
    }
    router.push(`/report/${v}`);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🔍</Text>
          <Text style={styles.heroTitle}>Vehicle History Intelligence</Text>
          <Text style={styles.heroSubtitle}>
            Enter a 17-character VIN to get the best attainable history snapshot from
            multiple independent data sources.
          </Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Vehicle Identification Number (VIN)</Text>
          <TextInput
            style={[styles.input, validationError && styles.inputError]}
            value={formatted}
            onChangeText={handleChange}
            placeholder="e.g. 1HGBH41JXMN109186"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={17}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          <View style={styles.vinMeta}>
            <Text style={[styles.charCount, formatted.length === 17 && styles.charCountDone]}>
              {formatted.length}/17
            </Text>
            {formatted.length === 17 && VIN_RE.test(formatted) && (
              <Text style={styles.validMark}>✓ Valid format</Text>
            )}
          </View>
          {validationError && (
            <Text style={styles.errorText}>{validationError}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, formatted.length !== 17 && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Run Vehicle Check</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sampleSection}>
          <Text style={styles.sampleTitle}>Try a sample VIN</Text>
          {SAMPLE_VINS.map((s) => (
            <TouchableOpacity
              key={s.vin}
              style={styles.sampleRow}
              onPress={() => router.push(`/report/${s.vin}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.sampleLabel}>{s.label}</Text>
              <Text style={styles.sampleVin}>{s.vin}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>What this report covers</Text>
          <Text style={styles.disclaimerText}>
            • Vehicle identity & build configuration (NHTSA){"\n"}
            • Open & resolved safety recalls (NHTSA){"\n"}
            • Reported service events (CARFAX — when available){"\n"}
            • Auction & title history (AutoCheck — when available){"\n"}
            • Title brand & salvage status (NMVTIS — when available)
          </Text>
          <Text style={styles.disclaimerNote}>
            No API provides full service history. Private repairs, dealer records, and
            events not reported to a data provider are not visible to this system.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  vinMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  charCountDone: {
    color: Colors.success,
  },
  validMark: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: "600",
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  sampleSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sampleTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sampleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sampleLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  sampleVin: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  disclaimer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  disclaimerTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  disclaimerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 10,
  },
  disclaimerNote: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
});
