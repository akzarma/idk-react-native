import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  LLAMA3_2_1B,
  Message,
  ResourceFetcher,
  useLLM,
} from "react-native-executorch";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { EMAIL_PURCHASE_EXTRACTION_PROMPT } from "./src/prompts/emailPurchasePrompt";
import mockEmails from "./mock_emails.json";
import AnalyticsScreen from "./src/components/AnalyticsScreen";

type ScreenKey = "home" | "chat" | "emails" | "analytics";

type ChatMessage = Message & { id: string };

type Email = {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
};

type AnalysisResult = {
  email: Email;
  amount: string;
  prompt: string;
};

const EMAIL_SAMPLES: Email[] = mockEmails as Email[];

const SYSTEM_PROMPT =
  "You are an on-device assistant. Provide concise, actionable replies and keep responses under 80 words unless more detail is requested.";

const flushMicrotasks = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const getErrorMessage = (value: unknown) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  return "Something went wrong.";
};

const buildEmailPrompt = (email: Email) => {
  return [
    `Message ID: ${email.id}`,
    `Subject: ${email.subject}`,
    "Body:",
    email.body,
  ].join("\n");
};

const useEdgeModel = (systemPrompt: string) => {
  const llm = useLLM({ model: LLAMA3_2_1B });
  const { isReady, configure } = llm;
  const configuredRef = useRef(false);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  const refreshDownloadedModels = useCallback(async () => {
    try {
      const models = await ResourceFetcher.listDownloadedModels();
      setDownloadedModels(models);
    } catch (fetchError) {
      console.warn("Unable to list downloaded models", fetchError);
    }
  }, []);

  useEffect(() => {
    if (isReady && !configuredRef.current) {
      configure({
        chatConfig: {
          systemPrompt,
          initialMessageHistory: [],
        },
      });
      configuredRef.current = true;
    }
  }, [configure, isReady, systemPrompt]);

  useEffect(() => {
    refreshDownloadedModels();
  }, [refreshDownloadedModels]);

  useEffect(() => {
    if (isReady) {
      refreshDownloadedModels();
    }
  }, [isReady, refreshDownloadedModels]);

  return {
    ...llm,
    downloadedModels,
    refreshDownloadedModels,
  };
};

const App = () => {
  const [screen, setScreen] = useState<ScreenKey>("home");

  return (
    <SafeAreaProvider>
      {screen === "home" ? (
        <HomeScreen
          onOpenChat={() => setScreen("chat")}
          onOpenEmails={() => setScreen("emails")}
          onOpenAnalytics={() => setScreen("analytics")}
        />
      ) : screen === "chat" ? (
        <ChatScreen onBack={() => setScreen("home")} />
      ) : screen === "emails" ? (
        <EmailAnalyzerScreen onBack={() => setScreen("home")} />
      ) : (
        <AnalyticsScreen onBack={() => setScreen("home")} />
      )}
    </SafeAreaProvider>
  );
};

type HomeScreenProps = {
  onOpenChat: () => void;
  onOpenEmails: () => void;
  onOpenAnalytics: () => void;
};

const HomeScreen = ({
  onOpenChat,
  onOpenEmails,
  onOpenAnalytics,
}: HomeScreenProps) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="light" />
      <View style={styles.homeContent}>
        <View>
          <Text style={styles.homeTitle}>Edge AI Playground</Text>
          <Text style={styles.homeSubtitle}>
            Choose a demo to explore the on-device model.
          </Text>
        </View>
        <View style={styles.homeCardGrid}>
          <TouchableOpacity style={styles.homeCard} onPress={onOpenChat}>
            <Text style={styles.homeCardTitle}>Edge Chat</Text>
            <Text style={styles.homeCardSubtitle}>
              Chat with the lightweight on-device model.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeCard} onPress={onOpenEmails}>
            <Text style={styles.homeCardTitle}>Emails Analyzer</Text>
            <Text style={styles.homeCardSubtitle}>
              Extract purchase totals from recent emails.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeCard} onPress={onOpenAnalytics}>
            <Text style={styles.homeCardTitle}>Analytics</Text>
            <Text style={styles.homeCardSubtitle}>
              View your spending patterns and insights.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

type ChatScreenProps = {
  onBack: () => void;
};

const ChatScreen = ({ onBack }: ChatScreenProps) => {
  const {
    messageHistory,
    response,
    isReady,
    isGenerating,
    downloadProgress,
    error,
    sendMessage,
    downloadedModels,
  } = useEdgeModel(SYSTEM_PROMPT);

  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const displayMessages = useMemo<ChatMessage[]>(() => {
    const baseMessages = messageHistory.map((msg, index) => ({
      ...msg,
      id: `${index}-${msg.role}`,
    }));

    if (isGenerating) {
      return [
        ...baseMessages,
        {
          id: `stream-${baseMessages.length}`,
          role: "assistant",
          content: response,
        },
      ];
    }

    return baseMessages;
  }, [isGenerating, messageHistory, response]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !isReady || isGenerating) {
      return;
    }

    try {
      setLocalError(null);
      setInput("");
      await sendMessage(trimmed);
    } catch (sendError) {
      console.error(sendError);
      setLocalError(
        sendError instanceof Error
          ? sendError.message
          : "Something went wrong while generating a response."
      );
    }
  }, [input, isReady, isGenerating, sendMessage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    const bubbleStyle = isUser ? styles.userBubble : styles.assistantBubble;
    const textStyle = isUser ? styles.userText : styles.assistantText;

    if (item.role === "system") {
      return null;
    }

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowReversed]}>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={[styles.messageText, textStyle]}>{item.content}</Text>
        </View>
      </View>
    );
  }, []);

  const statusText = useMemo(() => {
    const resolvedError = getErrorMessage(error);
    if (resolvedError) {
      return resolvedError;
    }
    if (!isReady) {
      if (downloadProgress > 0 && downloadProgress < 1) {
        return `Downloading model… ${(downloadProgress * 100).toFixed(0)}%`;
      }
      return "Preparing on-device model…";
    }
    if (isGenerating) {
      return "Thinking…";
    }
    return "Ready";
  }, [downloadProgress, error, isGenerating, isReady]);

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
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonLabel}>Home</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edge Chat</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.statusRow}>
            {!isReady || isGenerating ? (
              <ActivityIndicator size="small" color="#A1B7FF" />
            ) : null}
            <Text
              style={[
                styles.status,
                !isReady || isGenerating
                  ? styles.statusBusy
                  : styles.statusReady,
                error ? styles.statusError : undefined,
              ]}
            >
              {statusText}
            </Text>
          </View>
          {downloadedModels.length > 0 ? (
            <Text style={styles.cacheHint}>
              Cached models:{" "}
              {downloadedModels
                .map((model) => model.split("/").pop())
                .join(", ")}
            </Text>
          ) : (
            <Text style={styles.cacheHint}>
              Downloads are cached locally. First load may take a minute.
            </Text>
          )}
        </View>

        <FlatList
          data={[...displayMessages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          inverted
        />

        {localError ? <Text style={styles.errorText}>{localError}</Text> : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your message…"
            placeholderTextColor="#8A8E99"
            value={input}
            onChangeText={setInput}
            multiline
            editable={isReady && !isGenerating}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isReady || isGenerating || input.trim().length === 0) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!isReady || isGenerating || input.trim().length === 0}
          >
            <Text style={styles.sendLabel}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

type EmailAnalyzerScreenProps = {
  onBack: () => void;
};

const EmailAnalyzerScreen = ({ onBack }: EmailAnalyzerScreenProps) => {
  const {
    messageHistory,
    isReady,
    isGenerating,
    downloadProgress,
    error,
    sendMessage,
    configure,
    downloadedModels,
  } = useEdgeModel(EMAIL_PURCHASE_EXTRACTION_PROMPT);

  const insets = useSafeAreaInsets();
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "running" | "done"
  >("idle");
  const [processedCount, setProcessedCount] = useState(0);
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(
    null
  );

  const messageHistoryRef = useRef(messageHistory);
  useEffect(() => {
    messageHistoryRef.current = messageHistory;
  }, [messageHistory]);

  const totalEmails = EMAIL_SAMPLES.length;

  const statusText = useMemo(() => {
    const resolvedError = getErrorMessage(error);
    if (resolvedError) {
      return resolvedError;
    }
    if (!isReady) {
      if (downloadProgress > 0 && downloadProgress < 1) {
        return `Downloading model… ${(downloadProgress * 100).toFixed(0)}%`;
      }
      return "Preparing on-device model…";
    }
    if (analysisStatus === "running") {
      if (activeEmailId) {
        const currentOrdinal = Math.min(processedCount + 1, totalEmails);
        return `Processing ${activeEmailId} (${currentOrdinal} of ${totalEmails})`;
      }
      return "Processing emails…";
    }
    if (isGenerating) {
      return "Thinking…";
    }
    if (analysisStatus === "done") {
      return "Analysis complete.";
    }
    return "Ready";
  }, [
    activeEmailId,
    analysisStatus,
    downloadProgress,
    error,
    isGenerating,
    isReady,
    processedCount,
    totalEmails,
  ]);

  const handleAnalyze = useCallback(async () => {
    if (!isReady || isGenerating || analysisStatus === "running") {
      return;
    }
    setAnalysisError(null);
    setResults([]);
    setAnalysisStatus("running");
    setProcessedCount(0);

    try {
      if (totalEmails === 0) {
        setAnalysisStatus("done");
        return;
      }

      for (let index = 0; index < totalEmails; index += 1) {
        const email = EMAIL_SAMPLES[index];
        const prompt = buildEmailPrompt(email);
        setActiveEmailId(email.id);
        configure({
          chatConfig: {
            systemPrompt: EMAIL_PURCHASE_EXTRACTION_PROMPT,
            initialMessageHistory: [],
          },
        });
        await flushMicrotasks();
        await sendMessage(prompt);
        await flushMicrotasks();

        const latestMessages = messageHistoryRef.current;
        const assistantReply = [...latestMessages]
          .reverse()
          .find((msg) => msg.role === "assistant");
        const amount = assistantReply?.content?.trim() ?? "";

        setResults((prev) => [...prev, { email, amount, prompt }]);
        setProcessedCount((prev) => prev + 1);
      }

      setActiveEmailId(null);
      setAnalysisStatus("done");
    } catch (analysisErr) {
      console.error(analysisErr);
      setAnalysisError(
        analysisErr instanceof Error
          ? analysisErr.message
          : "Failed to analyze emails."
      );
      setAnalysisStatus("idle");
      setActiveEmailId(null);
    }
  }, [
    analysisStatus,
    configure,
    isGenerating,
    isReady,
    sendMessage,
    totalEmails,
  ]);

  const progressRatio =
    totalEmails === 0 ? 0 : Math.min(processedCount / totalEmails, 1);

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
      <StatusBar style="light" />
      <View style={styles.emailContainer}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonLabel}>Home</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Emails Analyzer</Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.screenIntro}>
            Run the saved chat model against sample emails to pull purchase
            amounts.
          </Text>
          <View style={styles.statusRow}>
            {(!isReady || isGenerating || analysisStatus === "running") && (
              <ActivityIndicator size="small" color="#A1B7FF" />
            )}
            <Text
              style={[
                styles.status,
                !isReady || isGenerating || analysisStatus === "running"
                  ? styles.statusBusy
                  : styles.statusReady,
                error ? styles.statusError : undefined,
              ]}
            >
              {statusText}
            </Text>
          </View>
          {downloadedModels.length > 0 ? (
            <Text style={styles.cacheHint}>
              Cached models:{" "}
              {downloadedModels
                .map((model) => model.split("/").pop())
                .join(", ")}
            </Text>
          ) : (
            <Text style={styles.cacheHint}>
              Downloads are cached locally. First load may take a minute.
            </Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowInputModal(true)}
          >
            <Text style={styles.secondaryButtonText}>View input emails</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isReady || isGenerating || analysisStatus === "running") &&
                styles.primaryButtonDisabled,
            ]}
            disabled={!isReady || isGenerating || analysisStatus === "running"}
            onPress={handleAnalyze}
          >
            <Text style={styles.primaryButtonText}>Analyse</Text>
          </TouchableOpacity>
        </View>

        {analysisError ? (
          <Text style={styles.errorText}>{analysisError}</Text>
        ) : null}

        {analysisStatus === "running" || processedCount > 0 ? (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressRatio * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {activeEmailId
                ? `Processing ${activeEmailId} (${Math.min(
                    processedCount + 1,
                    totalEmails
                  )} of ${totalEmails})`
                : `Processed ${processedCount} of ${totalEmails}`}
            </Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContainer}
        >
          {results.length === 0 ? (
            <Text style={styles.placeholderText}>
              Run the analyser to populate purchase amounts for each email.
            </Text>
          ) : (
            results.map((result) => (
              <TouchableOpacity
                key={result.email.id}
                style={styles.resultCard}
                onPress={() => setSelectedResult(result)}
              >
                <Text style={styles.resultId}>{result.email.id}</Text>
                <Text style={styles.resultAmount}>
                  Amount:{" "}
                  {result.amount.length > 0 ? result.amount : "Not detected"}
                </Text>
                <Text style={styles.resultMeta}>{result.email.subject}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        visible={showInputModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInputModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowInputModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sample emails</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowInputModal(false)}
              >
                <Text style={styles.modalCloseLabel}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
            >
              {EMAIL_SAMPLES.map((email) => (
                <View key={email.id} style={styles.modalEmailBlock}>
                  <Text style={styles.resultId}>{email.id}</Text>
                  <Text style={styles.codeBlock}>
                    {JSON.stringify(email, null, 2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedResult}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedResult(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedResult(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Email: {selectedResult?.email.id ?? ""}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedResult(null)}
              >
                <Text style={styles.modalCloseLabel}>Close</Text>
              </TouchableOpacity>
            </View>
            {selectedResult ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
              >
                <Text style={styles.modalHighlight}>
                  Amount detected:{" "}
                  {selectedResult.amount.length > 0
                    ? selectedResult.amount
                    : "Not detected"}
                </Text>
                <Text style={styles.codeBlock}>
                  {JSON.stringify(selectedResult.email, null, 2)}
                </Text>
                <Text style={styles.modalLabel}>Prompt used</Text>
                <Text style={styles.codeBlock}>{selectedResult.prompt}</Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  homeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    gap: 32,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  homeSubtitle: {
    fontSize: 15,
    color: "#A0AEC0",
  },
  homeCardGrid: {
    gap: 16,
  },
  homeCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: "#2E3A4F",
  },
  homeCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  homeCardSubtitle: {
    fontSize: 14,
    color: "#CBD5F5",
    lineHeight: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  backButtonLabel: {
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 14,
  },
  headerSpacer: {
    width: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    fontSize: 14,
    color: "#E2E8F0",
  },
  statusReady: {
    color: "#4ADE80",
  },
  statusBusy: {
    color: "#FACC15",
  },
  statusError: {
    color: "#F87171",
  },
  cacheHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowReversed: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: "#1E293B",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  assistantText: {
    color: "#E2E8F0",
  },
  userText: {
    color: "#F8FAFC",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1E293B",
    backgroundColor: "#111827",
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    fontSize: 15,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    color: "#F8FAFC",
    fontWeight: "600",
    fontSize: 15,
  },
  errorText: {
    color: "#F87171",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  emailContainer: {
    flex: 1,
  },
  screenIntro: {
    fontSize: 14,
    color: "#A0AEC0",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#111827",
  },
  secondaryButtonText: {
    textAlign: "center",
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 15,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  progressBar: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
  },
  progressLabel: {
    fontSize: 13,
    color: "#CBD5F5",
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  placeholderText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
  },
  resultCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#273144",
    gap: 6,
  },
  resultId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7DD3FC",
    textTransform: "uppercase",
  },
  resultAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  resultMeta: {
    fontSize: 13,
    color: "#CBD5F5",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#273144",
    maxHeight: "85%",
    width: "100%",
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  modalClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  modalCloseLabel: {
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 13,
  },
  modalScroll: {
    maxHeight: "70%",
  },
  modalScrollContent: {
    paddingBottom: 16,
    gap: 12,
  },
  modalEmailBlock: {
    marginBottom: 16,
    gap: 6,
  },
  modalHighlight: {
    fontSize: 15,
    fontWeight: "600",
    color: "#38BDF8",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeBlock: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
    color: "#E2E8F0",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    lineHeight: 18,
  },
});
