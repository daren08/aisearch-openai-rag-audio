'use client';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowCircleLeftOutlined } from '@mui/icons-material';

const Subheader = () => {
    return (

        <Box
            sx={{
                backgroundImage: 'url("/default/sub-header.svg")', // make sure this image is in your public/default folder
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                height: '30vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: 'white',
                position: 'relative',
            }}
        >
            {/* Back Button (top-left corner) */}
            <IconButton
                href="https://ai-demo.qtx.group/"
                sx={{ position: 'absolute', top: 77, left: 16, color: 'gold' }}
            >
                <ArrowCircleLeftOutlined />
                <Typography variant="body1" ml={1}>
                    Back to Dashboard
                </Typography>
            </IconButton>

            {/* Centered Text */}
            <Typography variant="h3" fontWeight="bold" sx={{ marginTop: '50px' }}>
                Voice Assistant
            </Typography>
            <Typography variant="body1" mt={1} maxWidth="600px">
                Ask questions and explore your data hands-free <br />
                with our voice-powered AI assistant.
            </Typography>
        </Box>
    )
}

export default Subheader;