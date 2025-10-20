"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone, Send, Loader2, Volume2, PhoneOff } from 'lucide-react';
import dynamic from 'next/dynamic';

const HumeVoiceChat = dynamic(() => import('../components/HumeVoiceChat'), { ssr: false });

const TalkAgainApp = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatMode, setChatMode] = useState('text');
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [continuousMode, setContinuousMode] = useState(false);

    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const silenceTimeoutRef = useRef(null);
    const voiceActiveRef = useRef(false);
    const continuousModeRef = useRef(false);

    const characters = [
        {
            id: 1,
            name: 'Maya',
            age: '14-16',
            personality: 'Quiet, thoughtful, may be guarded at first',
            humeConfigId: '96382145-7203-46d2-abbe-c760d95019ed'
        },
        {
            id: 2,
            name: 'Jordan',
            age: '16-18',
            personality: 'Direct, asks tough questions, testing boundaries',
            humeConfigId: '73434079-1628-428f-8ee1-32e6df35ce5f'
        }
    ];

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const startSession = (character) => {
        setSelectedCharacter(character);
        setSessionStarted(true);

        // Only show welcome message for text chat
        if (chatMode === 'text') {
            const welcomeMessage = {
                role: 'assistant',
                content: `**Practice Session Starting**\n\nYou'll be practicing a conversation with ${character.name}, a ${character.age} year old who is ${character.personality.toLowerCase()}.\n\nRemember: This is a safe space to practice. You can take your time and think through your responses.\n\nHow would you like to start the conversation?`,
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    };

    const handleSendMessage = async (messageText = inputText) => {
        const trimmedText = messageText.trim();
        console.log('📤 handleSendMessage called with:', trimmedText);
        console.log('📤 isProcessing:', isProcessing);

        if (!trimmedText) {
            console.log('❌ Empty message, skipping');
            return;
        }

        console.log('📤 Sending message:', trimmedText);

        const userMessage = {
            role: 'user',
            content: trimmedText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');

        try {
            console.log('🔄 Calling chat API...');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    character: selectedCharacter,
                    coachingEnabled: true
                }),
            });

            console.log('📥 Chat API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Chat API error:', errorText);
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            console.log('✅ Got AI response:', data.message.substring(0, 50) + '...');

            const aiResponse = {
                role: 'assistant',
                content: data.message,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiResponse]);

            if (chatMode === 'voice' || continuousMode) {
                console.log('🔊 Playing audio response...');
                await playAudioResponse(data.message);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            const errorMessage = {
                role: 'assistant',
                content: "I'm sorry, I had trouble responding. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            console.log('✓ handleSendMessage complete');
            setIsProcessing(false);
        }
    };

    const playAudioResponse = async (text) => {
        setIsPlayingAudio(true);
        console.log('🎵 Starting audio playback...');

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    character: selectedCharacter
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('🎵 Audio URL created, playing...');

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.onended = handleAudioEnded;
                await audioRef.current.play();
                console.log('🎵 Audio playing...');
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsPlayingAudio(false);
            if (continuousModeRef.current && voiceActiveRef.current) {
                setTimeout(() => startContinuousRecording(), 500);
            }
        }
    };

    const handleAudioEnded = () => {
        console.log('🔇 Audio playback ended');
        console.log('continuousModeRef.current:', continuousModeRef.current);
        console.log('voiceActiveRef.current:', voiceActiveRef.current);

        setIsPlayingAudio(false);

        if (continuousModeRef.current && voiceActiveRef.current) {
            console.log('🔄 Restarting recording in 500ms...');
            setTimeout(() => {
                startContinuousRecording();
            }, 500);
        } else {
            console.log('❌ Not restarting - continuous:', continuousModeRef.current, 'active:', voiceActiveRef.current);
        }
    };

    const startContinuousRecording = async () => {
        if (isPlayingAudio || isProcessing) return;

        try {
            if (!streamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                console.log('✅ Microphone access granted');
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            console.log('Using MIME type:', mimeType);

            mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                console.log('📍 Recording stopped');
                console.log('voiceActiveRef.current:', voiceActiveRef.current);
                console.log('audioChunksRef.current.length:', audioChunksRef.current.length);

                if (!voiceActiveRef.current) {
                    console.log('⚠️ Voice not active, skipping processing');
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                console.log('📦 Audio blob size:', audioBlob.size, 'bytes');

                if (audioBlob.size > 100) {
                    console.log('✅ Audio size acceptable, processing...');
                    await processAudio(audioBlob, mimeType);
                } else {
                    console.log('⚠️ Audio too small:', audioBlob.size, 'bytes - retrying...');
                    if (voiceActiveRef.current) {
                        setIsProcessing(false);
                        setTimeout(() => startContinuousRecording(), 500);
                    }
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            console.log('🎙️ Recording started - speak now!');

            silenceTimeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    console.log('⏰ Auto-stopping after 5 seconds');
                    mediaRecorderRef.current.stop();
                    setIsRecording(false);
                }
            }, 5000);

        } catch (error) {
            console.error('❌ Microphone error:', error);
            alert('Cannot access microphone: ' + error.message);
            stopVoiceConversation();
        }
    };

    const startVoiceConversation = async () => {
        setVoiceActive(true);
        voiceActiveRef.current = true;
        setContinuousMode(true);
        continuousModeRef.current = true;
        await startContinuousRecording();
    };

    const stopVoiceConversation = () => {
        console.log('🛑 Stopping voice conversation');
        setVoiceActive(false);
        voiceActiveRef.current = false;
        setContinuousMode(false);
        continuousModeRef.current = false;
        setIsRecording(false);

        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const processAudio = async (audioBlob, mimeType = 'audio/webm') => {
        setIsProcessing(true);
        console.log('Processing audio blob of size:', audioBlob.size, 'type:', mimeType);

        try {
            const formData = new FormData();

            let fileName = 'recording.webm';
            if (mimeType.includes('mp4')) {
                fileName = 'recording.mp4';
            } else if (mimeType.includes('ogg')) {
                fileName = 'recording.ogg';
            }

            formData.append('audio', audioBlob, fileName);

            console.log('Sending audio to transcribe API...');
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Transcription failed:', errorText);
                throw new Error('Failed to transcribe audio');
            }

            const data = await response.json();
            console.log('Transcription result:', data.transcription);
            const transcription = data.transcription.trim();

            if (transcription && transcription.length > 2) {
                console.log('Valid transcription received, sending message...');
                console.log('continuousModeRef.current:', continuousModeRef.current);
                console.log('chatMode:', chatMode);

                if (continuousModeRef.current) {
                    console.log('⚡ About to call handleSendMessage with:', transcription);
                    try {
                        await handleSendMessage(transcription);
                        console.log('⚡ handleSendMessage returned');
                    } catch (err) {
                        console.error('⚡ handleSendMessage error:', err);
                    }
                } else {
                    console.log('Not in continuous mode, setting input text');
                    setInputText(transcription);
                }
            } else if (voiceActiveRef.current) {
                console.log('No speech detected or transcription too short, continuing...');
                setIsProcessing(false);
                setTimeout(() => startContinuousRecording(), 100);
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            if (!continuousModeRef.current) {
                alert('Failed to transcribe audio. Please try typing instead.');
            } else if (voiceActiveRef.current) {
                setIsProcessing(false);
                setTimeout(() => startContinuousRecording(), 500);
            }
        } finally {
            if (!continuousModeRef.current) {
                setIsProcessing(false);
            }
        }
    };

    // Character selection screen
    if (!sessionStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-purple-900 mb-2">Talk Again</h1>
                            <p className="text-gray-600">Practice reconnecting with your child in a safe, supportive space</p>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Choose Your Chat Mode</h2>
                            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <button
                                    onClick={() => setChatMode('text')}
                                    className={`p-6 rounded-xl border-2 transition-all ${chatMode === 'text' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    <MessageCircle className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                                    <h3 className="font-semibold text-lg mb-1">Text Chat</h3>
                                    <p className="text-sm text-gray-600">Type your messages</p>
                                </button>
                                <button
                                    onClick={() => setChatMode('voice')}
                                    className={`p-6 rounded-xl border-2 transition-all ${chatMode === 'voice' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    <Phone className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                                    <h3 className="font-semibold text-lg mb-1">Voice Chat</h3>
                                    <p className="text-sm text-gray-600">Real-time empathic conversation</p>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Select a Character to Practice With</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                {characters.map(character => (
                                    <button
                                        key={character.id}
                                        onClick={() => startSession(character)}
                                        className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                                    >
                                        <h3 className="font-semibold text-lg text-purple-900 mb-2">{character.name}</h3>
                                        <p className="text-sm text-gray-600 mb-2">Age: {character.age}</p>
                                        <p className="text-sm text-gray-700">{character.personality}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-2">💙 Remember</h3>
                        <p className="text-blue-800 text-sm">
                            This is a practice space. There's no right or wrong way to start.
                            You can practice what you want to say in a safe, supportive environment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Voice mode with Hume
    if (chatMode === 'voice' && sessionStarted) {
        return (
            <HumeVoiceChat
                character={selectedCharacter}
                coachingEnabled={true}
                onBack={() => {
                    setSessionStarted(false);
                }}
            />
        );
    }

    // Text chat mode
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
            <audio ref={audioRef} onEnded={() => setIsPlayingAudio(false)} />

            <div className="bg-white shadow-md p-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-purple-900">Talk Again</h1>
                        <p className="text-sm text-gray-600">
                            Practicing with {selectedCharacter?.name} • 💬 Text Mode
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSessionStarted(false);
                            setMessages([]);
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        New Session
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl rounded-2xl p-4 ${message.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white shadow-md'
                                }`}>
                                <div className="whitespace-pre-wrap">{message.content}</div>
                                {message.role === 'assistant' && (
                                    <button
                                        onClick={() => playAudioResponse(message.content)}
                                        disabled={isPlayingAudio}
                                        className="mt-2 text-purple-600 hover:text-purple-800 flex items-center text-sm disabled:opacity-50"
                                    >
                                        {isPlayingAudio ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Volume2 className="w-4 h-4 mr-1" />}
                                        {isPlayingAudio ? 'Playing...' : 'Play audio'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex justify-start">
                            <div className="bg-white shadow-md rounded-2xl p-4">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder="Type your message..."
                            disabled={isProcessing}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || isProcessing}
                            className="p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TalkAgainApp;