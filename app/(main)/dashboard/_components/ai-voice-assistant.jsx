"use client";

import React, { useState } from "react";
import { askFinancialAI } from "@/lib/gemini";
// FIX: Updated import path to point to the root actions folder
import { createVoiceTransaction } from "@/actions/voice-transaction"; 
import { useRouter } from "next/navigation"; 

const VoiceAssistant = ({ transactions = [], accounts = [] }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [response, setResponse] = useState("");
  const router = useRouter();

  const calculateContext = () => {
    const totalBalance = accounts.reduce((acc, cur) => acc + (cur.balance || 0), 0);
    return {
      balance: totalBalance,
      recent_transactions: transactions.slice(0, 5).map(t => `${t.description}: ${t.amount}`),
    };
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Browser not supported. Try Chrome.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      await handleAIResponse(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleAIResponse = async (userQuestion) => {
    setResponse("Thinking...");
    const context = calculateContext();
    const aiReply = await askFinancialAI(userQuestion, context);

    // CHECK: Is this a JSON Action or just Text?
    try {
      const parsedAction = JSON.parse(aiReply);
      
      if (parsedAction.action === "create_transaction") {
        setResponse("Creating transaction...");
        
        // Call the Server Action
        const result = await createVoiceTransaction(parsedAction);
        
        if (result.success) {
          const successMsg = `Success! Added ${parsedAction.type.toLowerCase()} of ${parsedAction.amount} for ${parsedAction.category}.`;
          setResponse(successMsg);
          speakOutLoud(successMsg);
          router.refresh(); // Refresh the dashboard to show new data
        } else {
          const errorMsg = "I tried to add it, but something went wrong with the database.";
          setResponse(errorMsg);
          speakOutLoud(errorMsg);
        }
        return;
      }
    } catch (e) {
      // If JSON.parse fails, it means it's just a normal text reply
    }

    // Normal Text Conversation
    setResponse(aiReply);
    speakOutLoud(aiReply);
  };

  const speakOutLoud = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Female"));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {(response || isListening) && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-[300px] mb-2 animate-in slide-in-from-bottom-5">
          <p className="text-sm text-gray-700 dark:text-gray-200 font-medium leading-relaxed">
            {isListening ? "Listening..." : response}
          </p>
        </div>
      )}
      <button
        onClick={startListening}
        disabled={isListening || isSpeaking}
        className={`
          relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300
          ${isListening 
            ? "bg-red-500 scale-110 shadow-red-500/50" 
            : "bg-gradient-to-tr from-violet-600 to-indigo-600 hover:scale-105 shadow-indigo-500/50"
          }
        `}
      >
         {isListening && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="23"/>
          <line x1="8" x2="16" y1="23" y2="23"/>
        </svg>
      </button>
    </div>
  );
};

export default VoiceAssistant;