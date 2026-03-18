import { useState, useEffect, useRef } from 'react';
import { MAX_FILE_SIZE, classifyError } from '../lib/utils';

export function useAudioFile(resetState: () => void) {
  const [file, setFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'local' | 'drive'>('local');
  const [driveLink, setDriveLink] = useState('');
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl('');
      setAudioDuration(null);
    }
  }, [file]);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      const msg = `檔案大小超過限制！目前最大支援 70MB（您上傳的檔案為 ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB）。`;
      alert(msg);
      setErrorMessage(msg);
      setFile(null);
      return false;
    }
    setFile(selectedFile);
    resetState();
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('audio/') || droppedFile.type.startsWith('video/')) {
        validateAndSetFile(droppedFile);
      } else {
        setErrorMessage('請上傳音訊或影片檔案。');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDriveSubmit = async () => {
    if (!driveLink) return;
    setIsFetchingDrive(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/fetch-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveLink })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '下載失敗');
      }
      const blob = await res.blob();
      const filename = "drive_audio_" + Date.now() + (blob.type.includes('video') ? '.mp4' : '.mp3');
      const downloadedFile = new File([blob], filename, { type: blob.type || 'audio/mp3' });
      if (validateAndSetFile(downloadedFile)) {
        setUploadMode('local');
        setDriveLink('');
      }
    } catch (e: any) {
      const errMsg = e.message?.includes('timeout') || e.message?.includes('504')
        ? 'Google Drive 下載逾時，請確認檔案小於 70MB 且連結權限正確。'
        : classifyError(e.message);
      setErrorMessage(errMsg);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  return {
    file,
    setFile,
    audioDuration,
    setAudioDuration,
    uploadMode,
    setUploadMode,
    driveLink,
    setDriveLink,
    isFetchingDrive,
    audioUrl,
    errorMessage,
    setErrorMessage,
    fileInputRef,
    audioRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDriveSubmit,
  };
}
