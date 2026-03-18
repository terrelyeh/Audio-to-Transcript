import { useState } from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { hasEnvKey, getEffectiveApiKey } from './lib/utils';
import { useDarkMode } from './hooks/useDarkMode';
import { useGlossary } from './hooks/useGlossary';
import { usePrompts } from './hooks/usePrompts';
import { useAudioFile } from './hooks/useAudioFile';
import { useTranscription } from './hooks/useTranscription';
import AppHeader from './components/AppHeader';
import ApiKeyInput from './components/ApiKeyInput';
import AudioUploadPanel from './components/AudioUploadPanel';
import ContentGenerationPanel from './components/ContentGenerationPanel';
import TranscriptViewer from './components/TranscriptViewer';
import GlossaryModal from './components/GlossaryModal';

export default function App() {
  const [isDark, setIsDark] = useDarkMode();
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [transcriptionLang, setTranscriptionLang] = useState(() =>
    localStorage.getItem('ai_transcriber_lang') || 'zh-TW'
  );
  const [hasApiKey, setHasApiKey] = useState(() => !!getEffectiveApiKey());
  const needsApiKey = !hasEnvKey && !hasApiKey;

  const transcription = useTranscription();
  const audioFile = useAudioFile(transcription.resetState);
  const glossary = useGlossary();
  const prompts = usePrompts();

  const combinedErrorMessage = transcription.errorMessage || audioFile.errorMessage;

  const handleLangChange = (lang: string) => {
    setTranscriptionLang(lang);
    localStorage.setItem('ai_transcriber_lang', lang);
  };

  const handleProcessAudio = () => {
    if (!audioFile.file) return;
    audioFile.setErrorMessage('');
    transcription.processAudio(audioFile.file, glossary.glossaryTerms, transcriptionLang);
  };

  const handleGenerateSummary = () => {
    transcription.generateSummary(prompts.customPrompt);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-stone-900 dark:text-stone-100 transition-colors duration-200 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
      <div className="max-w-[1200px] mx-auto px-5 py-6">
        <AppHeader
          isDark={isDark}
          setIsDark={setIsDark}
          isLeftPanelOpen={isLeftPanelOpen}
          setIsLeftPanelOpen={setIsLeftPanelOpen}
        />

        {/* BYOK: API Key Input */}
        {needsApiKey && (
          <ApiKeyInput onKeySet={() => setHasApiKey(true)} />
        )}

        {/* Draft Restore Banner */}
        {transcription.hasDraft && !transcription.transcript && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">偵測到上次未完成的草稿，是否恢復？</p>
            <div className="flex items-center gap-2">
              <button onClick={transcription.restoreDraft} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> 恢復草稿
              </button>
              <button onClick={transcription.dismissDraft} className="p-1.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors" aria-label="忽略">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column */}
          <div className={`lg:col-span-4 space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto custom-scrollbar pb-4 ${!isLeftPanelOpen ? 'hidden lg:block' : ''}`}>
            <AudioUploadPanel
              file={audioFile.file}
              setFile={audioFile.setFile}
              uploadMode={audioFile.uploadMode}
              setUploadMode={audioFile.setUploadMode}
              driveLink={audioFile.driveLink}
              setDriveLink={audioFile.setDriveLink}
              isFetchingDrive={audioFile.isFetchingDrive}
              fileInputRef={audioFile.fileInputRef}
              handleFileChange={audioFile.handleFileChange}
              handleDrop={audioFile.handleDrop}
              handleDragOver={audioFile.handleDragOver}
              handleDriveSubmit={audioFile.handleDriveSubmit}
              glossaryTerms={glossary.glossaryTerms}
              termInput={glossary.termInput}
              setTermInput={glossary.setTermInput}
              handleAddTerms={glossary.handleAddTerms}
              setIsGlossaryModalOpen={glossary.setIsGlossaryModalOpen}
              audioStatus={transcription.audioStatus}
              audioProgress={transcription.audioProgress}
              transcript={transcription.transcript}
              cleanedText={transcription.cleanedText}
              onProcessAudio={handleProcessAudio}
              onResetState={transcription.resetState}
              transcriptionLang={transcriptionLang}
              onLangChange={handleLangChange}
            />

            <ContentGenerationPanel
              cleanedText={transcription.cleanedText}
              summaryStatus={transcription.summaryStatus}
              prompts={prompts.prompts}
              selectedPromptId={prompts.selectedPromptId}
              customPrompt={prompts.customPrompt}
              setCustomPrompt={prompts.setCustomPrompt}
              handlePromptSelect={prompts.handlePromptSelect}
              saveNewPrompt={prompts.saveNewPrompt}
              onGenerateSummary={handleGenerateSummary}
            />

            {/* Global Error Message */}
            {combinedErrorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-2 text-xs border border-red-100 dark:border-red-900/60">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{combinedErrorMessage}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 lg:sticky lg:top-6 lg:h-[calc(100vh-5rem)] flex flex-col">
            <TranscriptViewer
              file={audioFile.file}
              audioUrl={audioFile.audioUrl}
              audioDuration={audioFile.audioDuration}
              setAudioDuration={audioFile.setAudioDuration}
              audioRef={audioFile.audioRef}
              audioStatus={transcription.audioStatus}
              summaryStatus={transcription.summaryStatus}
              transcript={transcription.transcript}
              cleanedText={transcription.cleanedText}
              summaryText={transcription.summaryText}
              activeTab={transcription.activeTab}
              setActiveTab={transcription.setActiveTab}
              getCurrentText={transcription.getCurrentText}
              setCurrentText={transcription.setCurrentText}
              handleReplaceAll={transcription.handleReplaceAll}
            />
          </div>
        </div>
      </div>

      {/* Glossary Modal */}
      {glossary.isGlossaryModalOpen && (
        <GlossaryModal
          glossaryTerms={glossary.glossaryTerms}
          handleRemoveTerm={glossary.handleRemoveTerm}
          onClose={() => glossary.setIsGlossaryModalOpen(false)}
        />
      )}
    </div>
  );
}
