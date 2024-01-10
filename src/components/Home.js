import React, { useState } from 'react';

import { Container, Box, Card, CardContent, Typography, TextField, CardActions, Button, CardHeader, } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';

function Home(props)
{

    const [code, setCode] = useState("");
    const [host, setHost] = useState(true);

    const startCall = () => 
    {
        props.history.push("/call/" + code + "/" + host);
    };

    return (
        <div>
            <Container maxWidth="sm">
                <Box mt={2} p={2} >
                    <Card elevation={8}>
                        <CardHeader></CardHeader>
                        <CardContent>
                            <Typography variant="h4" component="h4" color="textPrimary" gutterBottom style={{ fontWeight: 900 }}>
                                Simple Video-Chat Demo
                            </Typography>

                            <Box fontSize="subtitle1.fontSize" lineHeight={1.5} component="p" color="text.primary" mt={2} mb={3}>
                                Please enter a Room ID to join a video chat ...
                            </Box>

                            <form noValidate autoComplete="off" onSubmit={startCall}>
                                <TextField fullWidth={true} id="code" label="Room ID" variant="outlined" value={code} onChange={e => setCode(e.target.value)} />
                                <TextField fullWidth={true} id="code" label="Host" variant="outlined" value={host} onChange={e => setHost(e.target.value)} />
                            </form>

                        </CardContent>

                        <CardActions>
                            <Button size="large" color="primary" disabled={code.trim().length === 0} startIcon={<ContactPhoneIcon />} onClick={startCall}>Start video chat</Button>
                        </CardActions>
                    </Card>
                </Box>
            </Container>


        </div>
    );
}

export default Home;