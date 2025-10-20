// components/HumeVoiceChat.tsx
'use client';

import { useVoice, VoiceProvider } from '@humeai/voice-react';
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HumeVoiceChatProps {
    character: any;
    coachingEnabled: boolean;
    onBack: () => void;
}

function VoiceInterface({ character, accessToken, configId, onBack }: {
    character: any;
    accessToken: string;
    configId: string;
    onBack: () => void;
}) {
    const { connect, disconnect, messages, status, isMuted, mute, unmute } = useVoice();

    const isConnected = status.value === 'connected';
    const isConnecting = status.value === 'connecting';

    const handleConnect = async () => {
        try {
            await connect({
                auth: {
                    type: 'accessToken',
                    value: accessToken,
                },
                configId: configId,
            });
        } catch (error) {
            console.error('Failed to connect:', error);
        }
    };

    const handleDisconnect = () => {
        disconnect();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-md p-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-purple-900">Talk Again</h1>
                        <p className="text-sm text-gray-600">
                            Practicing with {character?.name} • 🎤 Hume AI Voice •
                            {isConnected ? ' 🟢 Live' : isConnecting ? ' 🟡 Connecting...' : ' ⚪ Ready'}
                        </p>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        End Session
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.type === 'user_message' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`max-w-2xl rounded-2xl p-4 ${message.type === 'user_message'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white shadow-md'
                                    }`}
                            >
                                <div className="whitespace-pre-wrap">
                                    {message.message?.content || 'Listening...'}
                                </div>
                            </div>
                        </div>
                    ))}

                    {messages.length === 0 && !isConnected && (
                        <div className="text-center py-12">
                            <div className="bg-white rounded-2xl shadow-md p-8 max-w-2xl mx-auto">
                                <h2 className="text-2xl font-bold text-purple-900 mb-4">
                                    Ready to Practice with {character?.name}
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    Click the button below to start a natural voice conversation. You can interrupt
                                    at any time, just like a real phone call.
                                </p>
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        💡 <strong>Tip:</strong> This uses Hume AI's Empathic Voice Interface, which
                                        can detect emotions in your voice and respond naturally. Speak as you would
                                        in a real conversation with your child.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto">
                    {!isConnected ? (
                        <div className="text-center">
                            <button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="px-8 py-4 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center mx-auto text-lg font-medium shadow-lg"
                            >
                                <Phone className="w-6 h-6 mr-2" />
                                {isConnecting ? 'Connecting...' : 'Start Conversation'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={isMuted ? unmute : mute}
                                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all flex items-center text-lg font-medium shadow-lg"
                            >
                                <PhoneOff className="w-6 h-6 mr-2" />
                                End Conversation
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 text-center mt-3">
                        {isConnected
                            ? 'Speak naturally - you can interrupt at any time'
                            : 'Click to start a real-time empathic conversation'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function HumeVoiceChat({ character, coachingEnabled, onBack }: HumeVoiceChatProps) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initialize() {
            try {
                // Fetch access token
                const tokenResponse = await fetch('/api/hume/access-token');
                const tokenData = await tokenResponse.json();

                if (!tokenData.accessToken) {
                    throw new Error('Failed to get access token');
                }

                setAccessToken(tokenData.accessToken);
            } catch (err: any) {
                console.error('Initialization error:', err);
                setError(err.message);
            }
        }

        initialize();
    }, [character, coachingEnabled]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={onBack}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!accessToken) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Initializing empathic voice interface...</p>
                </div>
            </div>
        );
    }

    // Use the character's specific Hume Config ID
    const configId = character.humeConfigId;

    return (
        <VoiceProvider>
            <VoiceInterface
                character={character}
                accessToken={accessToken}
                configId={configId}
                onBack={onBack}
            />
        </VoiceProvider>
    );
}