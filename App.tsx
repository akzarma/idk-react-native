import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  LLAMA3_2_1B_SPINQUANT,
  Message,
  ResourceFetcher,
  useLLM,
} from 'react-native-executorch';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type ChatMessage = Message & { id: string };

const SYSTEM_PROMPT =
  'You are an on-device assistant. Provide concise, actionable replies and keep responses under 80 words unless more detail is requested.';

const ChatApp = () => {
  const insets = useSafeAreaInsets();
  const {
    messageHistory,
    response,
    isReady,
    isGenerating,
    downloadProgress,
    error,
    sendMessage,
    configure,
  } = useLLM({ model: LLAMA3_2_1B_SPINQUANT });

  const [input, setInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const configuredRef = useRef(false);

  useEffect(() => {
    if (isReady && !configuredRef.current) {
      configure({
        chatConfig: {
          systemPrompt: SYSTEM_PROMPT,
          initialMessageHistory: [],
        },
      });
      configuredRef.current = true;
    }
  }, [configure, isReady]);

  const refreshDownloadedModels = useCallback(async () => {
    try {
      const models = await ResourceFetcher.listDownloadedModels();
      setDownloadedModels(models);
    } catch (fetchError) {
      console.warn('Unable to list downloaded models', fetchError);
    }
  }, []);

  useEffect(() => {
    refreshDownloadedModels();
  }, [refreshDownloadedModels]);

  useEffect(() => {
    if (isReady) {
      refreshDownloadedModels();
    }
  }, [isReady, refreshDownloadedModels]);

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
          role: 'assistant',
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
      setInput('');
      await sendMessage(trimmed);
    } catch (sendError) {
      console.error(sendError);
      setLocalError(
        sendError instanceof Error
          ? sendError.message
          : 'Something went wrong while generating a response.',
      );
    }
  }, [input, isReady, isGenerating, sendMessage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const bubbleStyle = isUser ? styles.userBubble : styles.assistantBubble;
    const textStyle = isUser ? styles.userText : styles.assistantText;

    if (item.role === 'system') {
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
    if (error) {
      return error.message;
    }
    if (!isReady) {
      if (downloadProgress > 0 && downloadProgress < 1) {
        return `Downloading model… ${(downloadProgress * 100).toFixed(0)}%`;
      }
      return 'Preparing on-device model…';
    }
    if (isGenerating) {
      return 'Thinking…';
    }
    return 'Ready';
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
      edges={['top', 'bottom']}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Edge Chat</Text>
          <View style={styles.statusRow}>
            {!isReady || isGenerating ? (
              <ActivityIndicator size="small" color="#A1B7FF" />
            ) : null}
            <Text
              style={[
                styles.status,
                !isReady || isGenerating ? styles.statusBusy : styles.statusReady,
                error ? styles.statusError : undefined,
              ]}
            >
              {statusText}
            </Text>
          </View>
          {downloadedModels.length > 0 ? (
            <Text style={styles.cacheHint}>
              Cached models: {downloadedModels.map(model => model.split('/').pop()).join(', ')}
            </Text>
          ) : (
            <Text style={styles.cacheHint}>
              Downloads are cached locally. First load may take a minute.
            </Text>
          )}
        </View>

        <FlatList
          data={[...displayMessages].reverse()}
          keyExtractor={item => item.id}
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

export default function App() {
  return (
    <SafeAreaProvider>
      <ChatApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  statusReady: {
    color: '#4ADE80',
  },
  statusBusy: {
    color: '#FACC15',
  },
  statusError: {
    color: '#F87171',
  },
  cacheHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowReversed: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  assistantText: {
    color: '#E2E8F0',
  },
  userText: {
    color: '#F8FAFC',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
    backgroundColor: '#111827',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 15,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
});
