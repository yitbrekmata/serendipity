'use client'
import { useState, useRef, useEffect } from "react";
import StartVideoPlayer from "@/components/StartVideoPlayer";


export default function Terminal() {
  const asciiLogo = `  
     ___  ____  ____  ____  _  _  ____  ____  ____  ____  ____  _  _ 
    / __)( ___)(  _ \( ___)( \( )(  _ \(_  _)(  _ \(_  _)(_  _)( \/ )
    \__ \ )__)  )   / )__)  )  (  )(_) )_)(_  )___/ _)(_   )(   \  / 
    (___/(____)(_)\_)(____)(_)\_)(____/(____)(__)  (____) (__)  (__) 
  `;

  const [history, setHistory] = useState([
    { cmd: null, output: asciiLogo }, // preload ASCII banner
  ]);
  const [gameStarted, setGameStarted] = useState(false); 
  const [userInput, setInput] = useState("");
  const inputRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [waitingStream, setWaitingStream] = useState(false); 
  const [messages, setMessages] = useState('');
  const [dots, setDots] = useState(""); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [historyPos, setHistoryPos] = useState(history.length - 1); 


  useEffect(() => {
    inputRef.current?.focus(); // focus on mount
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history, messages]);
  

  useEffect(() => {
    if (!waitingStream){
      setDots("");
      return; 
    }
  
    const interval = setInterval(() => {
      setDots(prev => (prev.length === 3 ? "" : prev + "$"));
    }, 500);
  
    return () => clearInterval(interval);
  }, [waitingStream]);


  const handleStream = async (cmd: string) => {
    setIsStreaming(true);
    setWaitingStream(true);
  
    // Add placeholder history entry
    setHistory(prev => [...prev, { cmd, output: "" }]);
  
    try {
      const response = await fetch("api/gemini-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cmd })
      });
  
      if (!response.ok) throw new Error("Failed to fetch");
  
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
  
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
  
        const chunk = decoder.decode(value, { stream: true });

        setWaitingStream(false);
  
        // Reveal each character individually
        for (let i = 0; i < chunk.length; i++) {
          fullText += chunk[i];
  
          // Update last history entry in place
          setHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              output: fullText,
            };
            return updated;
          });
  
          await new Promise(r => setTimeout(r, 20)); // 20ms per character
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      setIsStreaming(false);
    }
  };
  
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userInput.trim() !== "") {
      const cmd = userInput;
      setInput(""); // clear user input
      if (cmd.toLowerCase() === "clear") {
        setHistory([{ cmd: null, output: asciiLogo }]);
      } else {
        handleStream(cmd);
      }
      setHistoryPos(history.length - 1);
    }
    else if (e.key == "ArrowDown" && historyPos <= history.length - 1 && historyPos >= 0){
      const lastCmd = history[historyPos]?.cmd || "";
      setInput(lastCmd); 

      setHistoryPos(prev => prev + 1); 
    }
    else if(e.key == "ArrowUp" && historyPos >= 0 && historyPos <= history.length - 1){
      const nextCmd = history[historyPos]?.cmd || "";
      setInput(nextCmd); 

      setHistoryPos(prev => prev - 1); 
    }
  };

  

  return gameStarted? 
      <div
        ref = {containerRef}
        className="bg-black text-[#5170ff] overflow-y-hidden font-mono p-4"
        onClick={() => !isStreaming && inputRef.current?.focus()} // click to focus
      >
        
        {history.map((entry, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            <div className = "text-[#ff3131]">
              {entry.cmd !== null && <div>$ {entry.cmd}</div>}
            </div>
            <div>{entry.output}</div>
          </div>
        ))}
        {!isStreaming?
          <div>
            <div className = "text-[#ff3131]">
              $ {userInput}
              <span className="animate-pulse">|</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute"
            />
          </div>
          : 
          <div className = "text-[#5170ff]">
            {dots}
            <br></br>
          </div>
        }
        
        <div>
          {messages}
        </div>
      </div>: 
      <div className = "flex justify-center items-center h-screen">
        <StartVideoPlayer onFinish = {() => setGameStarted(true)}></StartVideoPlayer>
      </div>
}
