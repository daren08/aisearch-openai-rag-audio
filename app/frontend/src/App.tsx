import React, { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

import { Button } from "@/components/ui/button";
import { GroundingFiles } from "@/components/ui/grounding-files";
import { Typography } from '@mui/material';

import GroundingFileView from "@/components/ui/grounding-file-view";
import StatusMessage from "@/components/ui/status-message";
import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

import { GroundingFile, ToolResult } from "./types";

import SubHeader from "./Subheader";
import Header from "./Header";

import "./App.css";

const App: React.FC = () => {
    const { instance, accounts, inProgress } = useMsal();
    useEffect(() => {
        if (inProgress === InteractionStatus.None && accounts.length === 0) {
            console.log("No accounts found, triggering loginRedirect()");
            instance.loginRedirect();
        }
    }, [accounts, instance, inProgress]);

    const [isRecording, setIsRecording] = useState(false);
    const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);

    const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            isRecording && playAudio(message.delta);
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            stopAudioPlayer();
        },
        onReceivedExtensionMiddleTierToolResponse: message => {
            const result: ToolResult = JSON.parse(message.tool_result);

            console.log(result);

            const files: GroundingFile[] = result.sources.map(x => {
                return { id: x.chunk_id, name: x.title, content: x.chunk };
            });

            setGroundingFiles(prev => [...prev, ...files]);
        }
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();

            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();

            setIsRecording(false);
        }
    };
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
            <Header />
            <SubHeader />
            <main className="flex flex-grow flex-col items-center justify-center" style={{ marginTop: '-5%' }}>
                <div className="flex flex-col items-center justify-center text-center mb-10">
                    <Typography className="mb-8 text-4xl font-bold md:text-7xl text-gray-900" variant="h2">
                        {isRecording ?
                            (
                                <div>
                                    <div>Listening to you</div>
                                    <div>questions...</div>
                                </div>
                            ) :
                            (
                                <div>
                                    <div>Ready to dive into</div>
                                    <div>your data?</div>
                                </div>

                            )
                        }
                    </Typography>
                </div>

                <div className="mb-4 flex flex-col items-center justify-center">
                    {isRecording && (
                        <div className="flex items-end space-x-1 mt-2 h-10">
                            {[...Array(30)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-purple-900 opacity-80 rounded-full"
                                    style={{
                                        height: "20%", // base height for transition
                                        animation: `barHeight${(i % 3) + 1} 1s ease-in-out infinite`,
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={onToggleListening}
                        className={`h-12 w-60 ${isRecording ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-yellow-500 hover:bg-yellow-500 text-[#212121]"}`}
                        aria-label={isRecording ? t("app.stopRecording") : t("app.startRecording")}
                    >
                        {isRecording ? (
                            <>
                                <MicOff className="mr-2 h-4 w-4" />
                                {t("app.stopConversation")}
                            </>
                        ) : (
                            <>
                                <Mic className="mx-2 h-6 w-6" />
                                {t("app.startSpeaking")}

                            </>
                        )}
                    </Button>
                    <StatusMessage isRecording={isRecording} />
                </div>

                <GroundingFiles files={groundingFiles} onSelected={setSelectedFile} />

            </main>

            <footer className="py-4 text-center">
                <p>{t("app.footer")}</p>
            </footer>

            <GroundingFileView groundingFile={selectedFile} onClosed={() => setSelectedFile(null)} />

        </div>
    );
};

export default App;
