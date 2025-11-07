import { useState, useCallback } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { toast } from 'sonner';

const SPEECH_KEY = '9zMZdd9AnkTcDvxT6MnDYfPopybq0Pydkwv6ihDRURqUTwWC5QlMJQQJ99BIACYeBjFXJ3w3AAAAACOGUgI4';
const SPEECH_REGION = 'eastus';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [recognizer, setRecognizer] = useState<SpeechSDK.SpeechRecognizer | null>(null);

  const startListening = useCallback(async (onTranscript: (text: string) => void) => {
    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
      
      // Support both English and Bahasa Melayu (Malay)
      // We'll use continuous recognition to auto-detect language
      speechConfig.speechRecognitionLanguage = 'en-US';
      
      // Enable language auto-detection for English and Malay
      const autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages([
        'en-US', 
        'ms-MY'  // Malay (Malaysia)
      ]);

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(
        speechConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
      );

      let fullTranscript = '';

      speechRecognizer.recognizing = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          console.log('Recognizing:', e.result.text);
        }
      };

      speechRecognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log('Recognized:', e.result.text);
          if (e.result.text) {
            fullTranscript += (fullTranscript ? ' ' : '') + e.result.text;
            onTranscript(fullTranscript);
          }
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
          console.log('No speech recognized');
        }
      };

      speechRecognizer.canceled = (s, e) => {
        console.log('Recognition canceled:', e.errorDetails);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          toast.error(`Speech recognition error: ${e.errorDetails}`);
        }
        setIsListening(false);
      };

      speechRecognizer.sessionStopped = (s, e) => {
        console.log('Session stopped');
        setIsListening(false);
      };

      speechRecognizer.startContinuousRecognitionAsync(
        () => {
          console.log('Speech recognition started');
          setIsListening(true);
          toast.success('Listening... Speak in English or Bahasa Melayu');
        },
        (error) => {
          console.error('Error starting recognition:', error);
          toast.error('Failed to start speech recognition');
          setIsListening(false);
        }
      );

      setRecognizer(speechRecognizer);
    } catch (error) {
      console.error('Speech recognition error:', error);
      toast.error('Failed to initialize speech recognition');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log('Speech recognition stopped');
          recognizer.close();
          setRecognizer(null);
          setIsListening(false);
          toast.info('Speech recognition stopped');
        },
        (error) => {
          console.error('Error stopping recognition:', error);
          setIsListening(false);
        }
      );
    }
  }, [recognizer]);

  return {
    isListening,
    startListening,
    stopListening,
  };
}
