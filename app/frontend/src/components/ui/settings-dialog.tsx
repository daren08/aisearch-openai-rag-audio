import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Snackbar, Alert, CircularProgress } from "@mui/material";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    userEmail: string;
    initialSystemMessage?: string; // Added this prop
}

const defaultSystemMessage = `You are a helpful assistant. 
                Only answer questions based on information you searched in the knowledge base, accessible with the 'search' tool.\n
                The user is listening to answers with audio, so it's *super* important that answers are as short as possible, a single sentence if at all possible.\n
                Never read file names or source names or keys out loud.\nAlways use the following step-by-step instructions to respond:\n
                1. Always use the 'search' tool to check the knowledge base before answering a question.\n
                2. Always use the 'report_grounding' tool to report the source of information from the knowledge base.\n
                3. If user asked 'What would I know' you respond with the task instruction on the knowledge base.\n
                4. Produce an answer that's as short as possible. If the answer isn't in the knowledge base, say you don't know.`;

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose, userEmail, initialSystemMessage }) => {
    const [systemMessage, setSystemMessage] = useState<string>(initialSystemMessage || defaultSystemMessage);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingInstruction, setLoadingInstruction] = useState(false);

    const fetchInstruction = React.useCallback(() => {
        setLoadingInstruction(true);
        setLoadingInstruction(false);
        fetch(`/api/get-instruction`)
            .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch instruction"))
            .then(data => {
                if (data && data.details && data.details.trim() !== "") {
                    setSystemMessage(data.details);
                } else {
                    setSystemMessage(defaultSystemMessage);
                }
            })
            .catch(() => setSystemMessage(defaultSystemMessage))
            .finally(() => setLoadingInstruction(false));
    }, []);

    // Fetch instruction when dialog opens
    React.useEffect(() => {
        console.log(userEmail);

        if (open) {
            fetchInstruction();
        }
    }, [open, fetchInstruction]);

    const handleSystemMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSystemMessage(event.target.value);
    };

    const handleSendSystemMessage = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/insert-instruction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    details: systemMessage,
                    userEmail
                })
            });
            if (!response.ok) throw new Error("Failed to save instructions");
            // After saving, trigger backend to update in-memory system prompt
            await fetch(`/api/update-system-message`, { method: "POST" });
            setSnackbarMessage("Instructions updated successfully");
            setSnackbarOpen(true);
            //fetchInstruction(); // Fetch the latest instruction after save
        } catch (error) {
            setSnackbarMessage("Failed to update instructions");
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
            onClose(); // Close the dialog after sending the system message
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    if (loadingInstruction) {
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>Settings</DialogTitle>
                <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                    <CircularProgress />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        display: "flex",
                        flexDirection: "column"
                    }
                }}
            >
                <DialogTitle>Settings</DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        flex: 1,
                        overflow: "auto",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0
                    }}
                >
                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        placeholder="Update the assistant instructions"
                        label="Assistant Instructions"
                        value={systemMessage}
                        onChange={handleSystemMessageChange}
                        variant="outlined"
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSendSystemMessage} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
                        {loading ? "Saving..." : "Update"}
                    </Button>
                    <Button onClick={onClose} variant="outlined">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

export default SettingsDialog;
