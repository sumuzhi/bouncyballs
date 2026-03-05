import { useState, useCallback } from 'react';
import { message } from 'antd';

const useAudioPlayer = () => {
  const [playingId, setPlayingId] = useState(null);

  const playAudio = useCallback((audioBase64, id = null) => {
    if (!audioBase64) return;
    if (playingId) return; // Prevent multiple plays

    if (id) setPlayingId(id);
    const audio = new Audio(audioBase64);
    
    audio.onended = () => {
      setPlayingId(null);
    };
    
    audio.onerror = () => {
      message.error('播放失败');
      setPlayingId(null);
    };

    audio.play().catch(e => {
      console.error(e);
      message.error('播放失败');
      setPlayingId(null);
    });
  }, [playingId]);

  return { playingId, playAudio };
};

export default useAudioPlayer;
