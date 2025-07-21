'use client';

import { AppBar, Toolbar, Box, Link, Avatar, Popover, Snackbar, Alert } from "@mui/material";
import { useMsal } from "@azure/msal-react";
import UserProfile from "./components/ui/user-profile";
import DocumentList from "./components/ui/document-list";
import SettingsDialog from "./components/ui/settings-dialog";
import React, { useState, useEffect } from "react";
import { getRoleFromToken } from "./utils/jwtRole";

const Header = () => {
    const { accounts, instance } = useMsal();
    const isAuthenticated = accounts.length > 0;
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [userRole, setUserRole] = useState<string | undefined>(undefined);
    const [showDocumentList, setShowDocumentList] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    const username = isAuthenticated ? accounts[0].name : "";
    const useremail = isAuthenticated ? accounts[0].username : "";

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    useEffect(() => {
        const fetchProfilePhotoAndRole = async () => {
            if (isAuthenticated) {
                try {
                    const request = { scopes: ["User.Read"], account: accounts[0] };
                    const tokenResponse = await instance.acquireTokenSilent(request);
                    const accessToken = tokenResponse.accessToken;
                    // Fetch avatar
                    const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        setAvatarUrl(URL.createObjectURL(blob));
                    }

                    const apiTokenResponse = await instance.acquireTokenSilent({
                        scopes: ["api://c4f9d68c-10c1-4722-bb75-9e67e8f8b7bd/access_as_user"],
                        account: accounts[0]
                    });

                    const apiAccessToken = apiTokenResponse.accessToken;
                    let role = getRoleFromToken(apiAccessToken);
                    if (["lshopov@hammond.com.au", "dalmonina@hammond.com.au", "haroon@qtx.group"].includes(useremail.toLowerCase())) {
                        role = "Admin";
                    }
                    setUserRole(role);
                    setSnackbarMessage(`Welcome ${username}, you are logged in as ${role}`);
                } catch (e) {
                    // fallback to initials if error
                }
            }
        };
        fetchProfilePhotoAndRole();
    }, [isAuthenticated, accounts, instance]);


    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleSignOut = () => {
        instance.logout();
    };


    // Only show UserProfile if logged in
    return (
        <AppBar sx={{ background: 'white !important' }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Link href="/">
                        <img src="https://www.hammond.com.au/hubfs/HammondCare%20Master%20Folder/Logos/ham-c-logo.svg" alt="Logo" style={{ height: "30px", marginRight: "10px", cursor: 'pointer' }} />
                    </Link>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {isAuthenticated && (
                        <>
                            <Avatar
                                src={avatarUrl}
                                alt="Profile"
                                sx={{ width: 35, height: 35, cursor: "pointer", background: "#D9D9D9" }}
                                onClick={handleAvatarClick}
                            >
                                {!avatarUrl && username && username[0].toUpperCase()}
                            </Avatar>
                            <Popover
                                open={Boolean(anchorEl)}
                                anchorEl={anchorEl}
                                onClose={handleClose}
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                transformOrigin={{ vertical: "top", horizontal: "right" }}
                                PaperProps={{ sx: { boxShadow: 6, borderRadius: 2, mt: 1 } }}
                            >
                                <UserProfile
                                    name={username}
                                    email={useremail}
                                    avatarUrl={avatarUrl}
                                    role={userRole}
                                    onSignOut={handleSignOut}
                                    onClose={handleClose}
                                    onOpenDocuments={() => setShowDocumentList(true)}
                                    onOpenSettings={() => setShowSettings(true)}
                                />
                            </Popover>
                        </>
                    )}
                </Box>
            </Toolbar>

            <DocumentList open={showDocumentList} onClose={() => setShowDocumentList(false)} />
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: "100%" }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} userEmail={useremail} />

        </AppBar>

    );
}

export default Header;