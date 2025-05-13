import { useState, useEffect } from 'react';
import {
    Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, CircularProgress, Box, Checkbox, FormControlLabel, Tooltip, IconButton, Snackbar, Alert
} from '@mui/material';
import { CloudUpload, Delete } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';
import ChunkedUploaderModal from './upload-documents';

// Define a type for file metadata
interface FileMeta {
    name: string;
    last_modified?: string;
    size?: number;
}

const DocumentList = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
    const [uploadOpen, setUploadOpen] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const [reindexingFile, setReindexingFile] = useState<string | null>(null);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/fetch-files');
            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }
            const data = await response.json();
            setFiles(data.files);
            // Reset checked state when files are fetched
            const initialChecked: { [key: string]: boolean } = {};
            data.files.forEach((file: FileMeta) => {
                initialChecked[file.name] = false;
            });
            setChecked(initialChecked);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchFiles();
        }
    }, [open]);

    const deleteFile = async (fileName: string) => {
        setDeletingFile(fileName);
        try {
            const response = await fetch(`/api/delete-file?name=${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete file');
            }
            setFiles(files.filter(file => file.name !== fileName));
            setChecked(prev => {
                const updated = { ...prev };
                delete updated[fileName];
                return updated;
            });
            setSnackbarMsg('File deleted successfully');
            setSnackbarOpen(true);
            // Call reindex API after successful delete
            // await fetch('/api/reindex', { method: 'POST' });
        } catch (error) {
            console.error('Error deleting file:', error);
        } finally {
            setDeletingFile(null);
        }
    };

    const reindexFile = async (fileName: string) => {
        setReindexingFile(fileName);
        try {
            // If your backend supports per-file reindex, pass fileName as a param. Otherwise, just call as is.
            const response = await fetch(`/api/reindex?name=${encodeURIComponent(fileName)}`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to reindex file');
            }
            setSnackbarMsg('Reindex triggered successfully');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error reindexing file:', error);
        } finally {
            setReindexingFile(null);
        }
    };

    const handleCheck = (file: string) => {
        setChecked(prev => ({ ...prev, [file]: !prev[file] }));
    };

    const handleUploadOpen = () => setUploadOpen(true);
    const handleUploadClose = () => {
        setUploadOpen(false);
        fetchFiles(); // Refresh file list after upload
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Document List</DialogTitle>
            <DialogContent>
                <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Tooltip title="Upload" placement="bottom" arrow>
                        <IconButton onClick={handleUploadOpen} aria-label="upload" color="primary">
                            <CloudUpload />
                        </IconButton>
                    </Tooltip>
                </Box>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        <Box mt={2}>
                            {/* Header Row */}
                            <Grid container alignItems="center" spacing={2} style={{ fontWeight: 600, marginBottom: 8 }}>
                                <Grid item style={{ width: 40 }}></Grid>
                                <Grid item xs>
                                    <Paper elevation={0} style={{ background: 'none', boxShadow: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
                                        <Typography variant="body2" style={{ flex: 2, textAlign: 'center' }}>File Name</Typography>
                                        <Typography variant="body2" style={{ flex: 1, textAlign: 'center' }}>Last Modified</Typography>
                                        <Typography variant="body2" style={{ flex: 1, textAlign: 'center' }}>Size</Typography>
                                        <Box style={{ width: 120 }}></Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                            {files.map((file, index) => (
                                <Grid container alignItems="center" spacing={2} key={index} style={{ marginBottom: 4 }}>
                                    <Grid item>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={checked[file.name] || false}
                                                    onChange={() => handleCheck(file.name)}
                                                    color="primary"
                                                />
                                            }
                                            label=""
                                        />
                                    </Grid>
                                    <Grid item xs>
                                        <Paper elevation={3} style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body1" style={{ flex: 2 }}>{file.name}</Typography>
                                            <Typography variant="body2" style={{ flex: 1, textAlign: 'center' }}>{file.last_modified ? new Date(file.last_modified).toLocaleString() : '-'}</Typography>
                                            <Typography variant="body2" style={{ flex: 1, textAlign: 'center' }}>{file.size !== undefined && file.size !== null ? (file.size / 1024).toFixed(1) + ' KB' : '-'}</Typography>
                                            <Box display="flex" gap={1} style={{ width: 120, justifyContent: 'flex-end' }}>
                                                <Tooltip title="Download" placement="bottom" arrow>
                                                    <IconButton
                                                        aria-label="download"
                                                        sx={{ color: '#009688' }}
                                                        component="a"
                                                        href={`/api/download-file?name=${encodeURIComponent(file.name)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <DownloadIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Reindex" placement="bottom" arrow>
                                                    <span>
                                                        <IconButton
                                                            aria-label="reindex"
                                                            color="info"
                                                            disabled={reindexingFile === file.name}
                                                            onClick={() => reindexFile(file.name)}
                                                        >
                                                            {reindexingFile === file.name ? <CircularProgress size={24} color="info" /> : <SyncIcon />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                {deletingFile === file.name ? (
                                                    <CircularProgress size={24} color="secondary" />
                                                ) : (
                                                    <Tooltip title="Delete" placement="bottom" arrow>
                                                        <IconButton
                                                            aria-label="delete"
                                                            color="warning"
                                                            component="a"
                                                            onClick={() => deleteFile(file.name)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            ))}
                        </Box>
                    </Box>
                )}

                <ChunkedUploaderModal open={uploadOpen} onClose={handleUploadClose} />
                <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                    <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
                        {snackbarMsg}
                    </Alert>
                </Snackbar>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DocumentList;