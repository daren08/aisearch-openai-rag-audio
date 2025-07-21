import React from "react";
import { Box, Avatar, Typography, Button, Chip, Divider, Link, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// import EditIcon from "@mui/icons-material/Edit";
import { Storage, ManageAccounts } from "@mui/icons-material";
// import EditPageDrawer from "../EditPageDrawer";

interface UserProfileProps {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    onSignOut: () => void;
    onClose: () => void;
    onOpenDocuments?: () => void;
    onOpenSettings?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
    name,
    email,
    avatarUrl,
    role = "User",
    onSignOut,
    onClose,
    onOpenDocuments,
    onOpenSettings
}) => {
    // const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
    return (
        <Box sx={{ width: 350, p: 2, display: "flex", flexDirection: "column" }}>
            <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, right: 8 }} size="small" aria-label="close">
                <CloseIcon />
            </IconButton>

            <Typography variant="subtitle1" fontWeight="bold">
                Profile
            </Typography>

            <Divider className="mt-2" />

            <Box sx={{ mt: 3, display: "flex" }}>
                <Avatar
                    src={avatarUrl}
                    alt={name}
                    sx={{
                        width: 80,
                        height: 80,
                        mx: "10px",
                        bgcolor: avatarUrl ? "transparent" : "#0078D4"
                    }}
                >
                    {!avatarUrl && name?.charAt(0)}
                </Avatar>

                <Box>
                    <Chip label={role} color="primary" size="small" sx={{ mb: 1, fontWeight: 500, bgcolor: "#00b2b2", color: "#fff", borderRadius: 2 }} />

                    <Typography variant="caption" sx={{ fontWeight: "bold", mt: 1, display: "block" }}>
                        {name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {email}
                    </Typography>
                    <Link href="https://myaccount.microsoft.com/" underline="none" sx={{ fontWeight: 500, color: "#1976d2", fontSize: 15 }}>
                        <Typography variant="caption" sx={{ color: "primary.main", cursor: "pointer", mt: 1, display: "block" }}>
                            View Profile
                        </Typography>
                    </Link>
                </Box>
            </Box>

            {role?.toLowerCase() === "admin" && (
                <>
                    <Divider className="mt-2" />
                    <Box sx={{ display: "contents", justifyContent: "center", gap: 3, mb: 2 }}>
                        <Tooltip title="Manage Documents" placement="bottom" arrow>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <IconButton
                                    aria-label="manage-documents"
                                    onClick={() => {
                                        onClose();
                                        onOpenDocuments && onOpenDocuments();
                                    }}
                                >
                                    <Storage />
                                    <Typography variant="body2" style={{ marginLeft: 5 }}>
                                        Manage Documents
                                    </Typography>
                                </IconButton>
                            </Box>
                        </Tooltip>
                        <Divider className="mt-2" />
                        <Tooltip title="Settings" placement="bottom" arrow>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <IconButton
                                    aria-label="settings"
                                    onClick={() => {
                                        onClose();
                                        onOpenSettings && onOpenSettings();
                                    }}
                                >
                                    <ManageAccounts />
                                    <Typography variant="body2" style={{ marginLeft: 5 }}>
                                        Settings
                                    </Typography>
                                </IconButton>
                            </Box>
                        </Tooltip>
                        <Divider className="mt-2" />
                    </Box>
                </>
            )}
            {/* {role?.toLowerCase() === "admin" && (
                <Button
                    startIcon={<EditIcon />}
                    onClick={() => {
                        if (onRequestEditPage) onRequestEditPage();
                    }}
                    variant="outlined"
                    sx={{ mt: 2 }}
                    fullWidth
                >
                    Edit Page
                </Button>
            )} */}

            <Divider sx={{ my: 2 }} />

            <Button variant="outlined" color="error" onClick={onSignOut}>
                Sign Out
            </Button>

            {/* <EditPageDrawer open={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} onRequestEditPage={onRequestEditPage} /> */}
        </Box>
    );
};

export default UserProfile;
