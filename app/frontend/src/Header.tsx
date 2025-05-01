'use client';

import { AppBar, Toolbar, Typography, Box, Link, TextField } from "@mui/material";


const Header = () => {

    return (
        <AppBar sx={{ background: 'white !important' }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Link href="/">
                        <img src="https://images.squarespace-cdn.com/content/67a59b2813e24e4e74f84777/1738906450340-QFO8Z38UYBJU1VF7HO6L/QTX.group.png?format=1000w&content-type=image%2Fpng" alt="Logo" style={{ height: "30px", marginRight: "10px", cursor: 'pointer' }} />
                    </Link>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {/* <Link href="/"> */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, whiteSpace: "nowrap", color: '#212121' }}>
                        My AI Hub
                    </Typography>
                    {/* </Link> */}

                    {/* <IconButton sx={{color: uiDesignConfig?.fontColor}}>
            <Typography variant="subtitle1">Search</Typography>
            <Search />
          </IconButton> */}

                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Search..."
                        className="flex-1 bg-gray-100 text-sm px-2 outline-none border-none focus:outline-none focus:ring-0"
                    />
                </Box>

            </Toolbar>
        </AppBar>

    );
}

export default Header;