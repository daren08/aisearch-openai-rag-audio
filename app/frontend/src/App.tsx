import React, { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { GroundingFiles } from "@/components/ui/grounding-files";
import { Button as MUIButton, TextField, Divider, Snackbar, Alert, IconButton, Tooltip, Typography } from '@mui/material';
import { ManageAccounts, Storage } from '@mui/icons-material';

import GroundingFileView from "@/components/ui/grounding-file-view";
import StatusMessage from "@/components/ui/status-message";
import DocumentList from "@/components/ui/document-list";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

import { GroundingFile, ToolResult } from "./types";

import SubHeader from "./Subheader";
import Header from "./Header";
import DocumentUploader from "@/components/ui/upload-documents";

import "./App.css";

const App: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
    const [showDocumentList, setShowDocumentList] = useState(false);
    const defaultSystemMessage = `You are a helpful assistant. Only answer questions based on information you searched in the knowledge base, accessible with the 'search' tool. 
        The user is listening to answers with audio, so it's *super* important that answers are as short as possible, a single sentence if at all possible. 
        Never read file names or source names or keys out loud. 
        Always use the following step-by-step instructions to respond: 
        1. Always use the 'search' tool to check the knowledge base before answering a question. 
        2. Always use the 'report_grounding' tool to report the source of information from the knowledge base. 
        3. If user asked 'What would I know' you respond with the task instruction on the knowledge base.
        4. Produce an answer that's as short as possible. If the answer isn't in the knowledge base, say you don't know.`;
    const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    const { startSession, addUserAudio, inputAudioBufferClear, sendSystemMessage } = useRealTime({
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

    const handleSystemMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value === '') {
            setSystemMessage(defaultSystemMessage);
        }
        else {
            setSystemMessage(event.target.value);
        }
    };

    const handleSendSystemMessage = () => {
        sendSystemMessage(systemMessage);
        setSnackbarMessage('Instructions updated successfully');
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleToggleSettings = () => {
        setShowSettings(prev => !prev);
    };

    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
            <Header />
            <SubHeader />
            <div className="p-4 sm:left-4 sm:top-4" style={{ display: 'flex', justifyContent: 'end' }} >
                {/* <Tooltip title="Upload Document" placement="bottom" arrow>
                    <IconButton onClick={() => setUploadModalOpen(true)} aria-label="upload">
                        <CloudUpload />
                    </IconButton>
                </Tooltip> */}
                {/* <button
                    onClick={() => setShowDocumentList(true)}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Show Documents
                </button> */}
                <Tooltip title="Manage Documents" placement="bottom" arrow>
                    <IconButton onClick={() => setShowDocumentList(true)} aria-label="manage-documents">
                        <Storage />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Settings" placement="bottom" arrow>
                    <IconButton onClick={handleToggleSettings} aria-label="settings">
                        <ManageAccounts />
                    </IconButton>
                </Tooltip>
            </div>
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

                <DocumentList open={showDocumentList} onClose={() => setShowDocumentList(false)} />

                <Divider />

                <DocumentUploader open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />

                {showSettings && (
                    <div style={{ width: '100vh', display: isRecording ? 'none' : 'block' }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            placeholder="Update the assistant instructions"
                            label="Assistant Instructions"
                            value={systemMessage}
                            onChange={handleSystemMessageChange}
                            variant="outlined"
                            className="mb-4"
                            disabled={isRecording}
                        />
                        <MUIButton onClick={handleSendSystemMessage} variant="contained" color="primary"
                            sx={{ marginTop: '10px', width: '100%' }}
                            disabled={isRecording}>
                            Update
                        </MUIButton>
                    </div>
                )}

                <GroundingFiles files={groundingFiles} onSelected={setSelectedFile} />

            </main>

            <footer className="py-4 text-center">
                <p>{t("app.footer")}</p>
            </footer>

            <GroundingFileView groundingFile={selectedFile} onClosed={() => setSelectedFile(null)} />

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity="success" sx={{
                    width: '100%',
                    backgroundColor: '#3db779', color: 'white'
                }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default App;
