import React from 'react'


import MuiAlert from '@mui/lab/Alert';

function Alert(props)
{
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function Notifications(props)
{
    const elements = [];

    if (!props.connected)
    {
        elements.push({ id: 1, severity: "info", text: "Connecting ..." });
    }
    else if (!props.active)
    {
        elements.push({ id: 1, severity: "info", text: "Waiting for somebody to join ..." });
    }

    // more notifications to come ... or not!? ... who knows ...

    if (elements.length === 0)
    {
        return null;
    }

    return (
        <div >
            {elements.map(el =>
                <Alert
                    key={"vid-a-" + el.id}
                    severity={el.severity}
                    
                >
                    {el.text}
                </Alert>)
            }
        </div>
    );
}

export default Notifications;