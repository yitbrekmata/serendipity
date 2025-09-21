"use client";
import { useRef, useEffect, useState } from "react";

type StartVideoPlayerProps = {
    onFinish: () => void; // callback for parent
};

export default function StartVideoPlayer({ onFinish }: StartVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const START_TIME = 0;
  const PAUSE_TIMES = [6, 13, 18, 28];

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  // track which checkpoint is next
  const checkpointIndexRef = useRef(0);

  // jump to start time when metadata is loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      video.currentTime = START_TIME;

      if (playing) {
        video.play().then(() => setPaused(false)).catch(console.error);
      } else {
        video.pause();
        setPaused(true);
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    return () => video.removeEventListener("loadedmetadata", handleLoaded);
  }, [playing]);

  //pause video at specific timeframes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
  
    const handleTimeUpdate = () => {
      const idx = checkpointIndexRef.current;
      if (idx >= PAUSE_TIMES.length) return;
  
      // pause only if the video is just about to cross the checkpoint
      if (video.currentTime >= PAUSE_TIMES[idx]) {
        video.pause();
        setPaused(true);
        checkpointIndexRef.current += 1;
      }
    };
  
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [playing]);
  

  useEffect(() => {
    const video = videoRef.current; 
    if (!video) return; 

    const handleEnded = () => {
        setFinished(true); 
        setPaused(false);
    };

    video.addEventListener("ended", handleEnded); 
    return () => video.removeEventListener("ended", handleEnded);
  }, [playing])
  

  // start video from button
  const handleStart = () => {
    setPlaying(true);
    setPaused(false);
    const video = videoRef.current;
    if (video) video.play().catch(console.error);
  };

  // continue playing from checkpoint
  const handleNext = () => {
    const video = videoRef.current;
    if (!video) return;

    setPaused(false);
    video.play().catch(console.error);
  };

  const handlePlay = () => {
    onFinish();
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {playing ? (
        <div className="relative w-full max-w-4xl">
          <video
            ref={videoRef}
            src="/intro_video_2.mp4"
            className="w-full"
            muted
          />
  
          {paused && (
            <button
              onClick={handleNext}
              className="absolute bottom-4 right-4 bg-black text-[#5170ff] font-mono text-2xl rounded neon-hover"
            >
              $ Next --{'>'}
            </button>
          )}
  
          {finished && (
            <button
              onClick={handlePlay}
              className="absolute bottom-4 right-4 text-[#5170ff] font-mono text-2xl neon-hover"
            >
              $ Play
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="text-[#5170ff] font-mono p-10 text-2xl neon-hover"
        >
          $ Start Game
        </button>
      )}
    </div>
  );  

}
