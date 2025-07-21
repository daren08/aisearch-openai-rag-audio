'use client';
import { Box, Typography } from '@mui/material';

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