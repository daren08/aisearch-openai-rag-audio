import React, { useState } from "react";
import {
    Modal,
    Box,
    Typography,
    Button,
    LinearProgress,
    Stack,
    IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";

const modalStyle = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 500,
    bgcolor: "background.paper",
    borderRadius: 2,
    boxShadow: 24,
    p: 4
};

type Props = {
    open: boolean;
    onClose: () => void;
    setSnackbar?: (msg: string) => void;
};

export default function ChunkedUploaderModal({ open, onClose, setSnackbar }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [status, setStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setStatus("");
            setUploadProgress(0);
        }
    };

    const handleSafeClose = () => {
        if (!isUploading) {
            onClose();
            setFile(null);
            setStatus("");
            setUploadProgress(0);
        }
    };

    const uploadInChunks = async () => {
        if (!file) return;

        const chunkSize = 4 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const blockIds: string[] = [];

        setIsUploading(true);
        setStatus(`Uploading ${file.name}...`);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
            const blockId = `${i.toString().padStart(6, "0")}`;
            blockIds.push(blockId);

            const formData = new FormData();
            formData.append("blockId", blockId);
            formData.append("fileName", file.name);
            formData.append("chunk", chunk);

            try {
                const res = await fetch("/api/upload-chunk", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) throw new Error(`Chunk ${i + 1} failed`);
                setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
            } catch (error) {
                setStatus(`❌ Upload failed on chunk ${i + 1}`);
                setIsUploading(false);
                return;
            }
        }

        try {
            const commitRes = await fetch("/api/commit-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, blockIds }),
            });

            const result = await commitRes.json();
            if (!commitRes.ok) throw new Error(result.message);

            setStatus(`✅ Upload and indexing complete: ${file.name}`);
            if (setSnackbar) setSnackbar(`Upload and indexing complete: ${file.name}`);
            onClose();
        } catch (err: any) {
            setStatus(`❌ Commit failed: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal open={open} onClose={handleSafeClose}>
            <Box sx={modalStyle}>
                <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Upload Document</Typography>
                        <IconButton onClick={handleSafeClose} disabled={isUploading}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        disabled={isUploading}
                    >
                        Choose File
                        <input
                            type="file"
                            hidden
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.txt,.json,.md"
                        />
                    </Button>

                    {file && (
                        <Typography variant="body2" color="text.secondary">
                            Selected file: {file.name}
                        </Typography>
                    )}

                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!file || isUploading}
                        onClick={uploadInChunks}
                    >
                        {isUploading ? "Uploading..." : "Upload & Index"}
                    </Button>

                    {isUploading && (
                        <Box>
                            <LinearProgress variant="determinate" value={uploadProgress} />
                            <Typography variant="caption">{uploadProgress}%</Typography>
                        </Box>
                    )}

                    {status && (
                        <Typography variant="body2" color={status.startsWith("✅") ? "success.main" : "error"}>
                            {status}
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Modal>
    );
}
