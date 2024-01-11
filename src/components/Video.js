import React from 'react'

import { IconButton } from '@mui/material';

import FlipCameraIcon from '@mui/icons-material/FlipCameraAndroid';
import VideocamOnIcon from '@mui/icons-material/Visibility';
import VideocamOffIcon from '@mui/icons-material/VisibilityOff';
import CancelIcon from '@mui/icons-material/Cancel';

import io from 'socket.io-client'
import { getStream } from '../utils/MediaUtils';
import { createSimplePeer } from '../utils/PeerUtils';

import Notifications from './Notifications';


class Video extends React.PureComponent
{
    state = {
        socket: {},
        localStream: {},
        remoteStreams: {},
        peers: {},
        connected: false,
        facingMode: "user",
        localDisabled: false,
        peerConfig: {},
    };

    getPeer = id => this.createPeer(id, false);

    createPeer = (id, initiator) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            // console.log("createPeer", "ALREADY THERE!?", id, peers[id]);

            return peers[id];
        }

        debugger;
        const peer = peers[id] = createSimplePeer(this.state.localStream, initiator, this.state.peerConfig);

        this.setState({ peers: { ...peers } });

        peer.on("signal", data =>
        {
            console.log("signal", data);

            const signal =
            {
                from: this.state.socket.id,
                room: id,
                desc: data,
            }

            this.state.socket.emit("signal", signal)
        });

        peer.on("stream", stream =>
        {
            // if (this.state.remoteStreams[id]) return;

            const remoteStreams = { ...this.state.remoteStreams };

            remoteStreams[id] = stream;

            console.log("deb.1 remote-streams", remoteStreams);

            this.setState({ remoteStreams });
        });

        peer.once("close", () =>
        {
            console.log("close");
            this.destroyPeer(id);

            // this.setState({ connecting: true, remoteStream: {}, peer: {} });
        });

        peer.on('error', err =>
        {
            console.log("error");
            this.destroyPeer(id);

            // this.setState({ initiator: true, connecting: false, waiting: true })
        });

        return peer;
    };

    destroyPeer = (id) =>
    {
        const peers = this.state.peers;

        if (peers[id])
        {
            if (peers[id].destroy !== "undefined")
            {
                peers[id].destroy();
            }

            delete peers[id];

            const remoteStreams = { ...this.state.remoteStreams };
            delete remoteStreams[id];
            this.setState({ remoteStreams, peers, });
        }
    }

    componentDidMount()
    {
        const socket = io(this.props.signalServer);

        this.setState({ socket });

        const roomId = this.props.roomId;
        let isHost = this.props.flags === "true";

        this.getUserMedia(this.state.facingMode).then(() =>
        {
            console.log("emit enter");
            socket.emit("enter", { roomId: roomId });
        });

        socket.on("signal", signal =>
        {
            this.getPeer(signal.from).signal(signal.desc);
        });

        socket.on("sockets", ({ sockets, peerConfig }) =>
        {
            console.log("sockets fn", socket.id, sockets, peerConfig);

            this.setState({ connected: true, peerConfig });

            for (const id in sockets)
            {
                if (id !== socket.id)
                {
                    console.log(isHost);
                    debugger;
                    this.createPeer(id, isHost);
                }
            };
        });

        socket.on("message", message =>
        {
            console.log("message fn", socket.id, message);

            if (message?.type === "disconnected")
            {
                this.destroyPeer(message.from);
            }
            else if (message?.type === "toggle-stream")
            {
                console.log(message, this.state.peers);

                const remoteStreams = { ...this.state.remoteStreams };

                remoteStreams[message.from]._enabled = message.enabled;

                this.setState({ remoteStreams: remoteStreams });
            }
        });

        window.addEventListener('pagehide', this.onPageHide);
    }

    disconnect = () =>
    {
        if (typeof this.state.socket?.close !== "undefined")
        {
            this.state.socket.close();
        }

        if (typeof this.state.localStream?.getTracks !== "undefined")
        {
            this.state.localStream.getTracks().forEach(track => track.stop());
        }

        for (const stream of Object.values(this.state.remoteStreams))
        {
            if (typeof stream?.getTracks !== "undefined")
            {
                stream.getTracks().forEach(track => track.stop());
            }
        }

        for (const peer of Object.values(this.state.peers))
        {
            if (typeof peer?.destroy !== "undefined")
            {
                peer.destroy();
            }
        }

        this.setState({ socket: null, connected: false, localStream: {}, remoteStreams: {}, peers: {} });
    }

    onPageHide = () =>
    {
        this.disconnect();
    }

    componentWillUnmount = () =>
    {
        window.removeEventListener('pagehide', this.onPageHide);

        this.disconnect();
    }

    setLocalVideoStream = ref =>
    {
        if ((this.localVideo = ref))
        {
            console.log("setLocalVideoStream fn");

            // ref.muted = true;
            // ref.setAttribute("muted", "");

            if (ref.srcObject !== this.state.localStream && this.state.localStream instanceof MediaStream)
            {
                ref.srcObject = this.state.localStream;
                ref.muted = true;
                ref.setAttribute("muted", "");
            }
        }
    }

    setRemoteVideoStream = (ref, stream) =>
    {
        console.log("set-remote-video-stream", stream, ref);

        if (ref && stream instanceof MediaStream && ref.srcObject !== stream)
        {
            console.log("set-remote-video-stream-old", ref.srcObject);

            ref.srcObject = stream;
        }
    }

    componentDidUpdate()
    {
        if (this.localVideo)
        {
            console.log("did update");

            this.localVideo.muted = true;
            this.localVideo.setAttribute("muted", "");
        }
    }

    getUserMedia(facingMode = null)
    {
        return new Promise((resolve, reject) =>
        {
            getStream(facingMode).then(stream =>
            {
                if (this.localVideo)
                {
                    this.localVideo.srcObject = stream;
                    this.localVideo.muted = "";
                }

                this.setState({ localStream: stream, facingMode: facingMode });

                // setTimeout(() => { resolve(); }, 3000);
                resolve();

            }).catch(error =>
            {
                console.log("err", error);
            });
        });
    }

    toggleLocalStream = () =>
    {
        // this.state.peer.addStream(this.state.localStream);

        const tracks = this.state.localStream.getTracks();
        console.log("tracks", tracks);

        for (const track of tracks)
        {
            if (track.kind === "video")
            {
                track.enabled = !track.enabled;

                this.setState({ localDisabled: !track.enabled });

                this.state.socket.emit("message", { room: this.props.roomId, data: { type: "toggle-stream", from: this.state.socket.id, enabled: track.enabled } });

                break;
            }
        };
    }

    toggleCamera = () =>
    {
        this.state.localStream.getTracks().forEach(track => track.stop());

        if (this.localVideo)
        {
            this.localVideo.srcObject = null;
        }

        Object.keys(this.state.peers).forEach(id =>
        {
            this.state.peers[id].removeStream(this.state.localStream);
        });

        this.getUserMedia(this.state.facingMode === "user" ? "environment" : "user").then(() => 
        {
            Object.keys(this.state.peers).forEach(id =>
            {
                this.state.peers[id].addStream(this.state.localStream);
            });
        });
    }

    render()
    {
        const remoteUsers = Object.keys(this.state.remoteStreams).length;
        //const activeUsers = Object.values(this.state.remoteStreams).reduce((count, stream) => count += stream._enabled !== false ? 1 : 0, 0);

       
        return (
            <div id="videoWrapper" >

                {/* the local stream ... */}
                {this.state.localDisabled !== true &&
                    < div id="localVideoWrapper" style="width: 300px; display: inline" >
                        <video
                            id="localVideo"
                            style="width: 300px; display: inline" 
                            ref={this.setLocalVideoStream}
                            autoPlay
                            playsInline
                        />
                    </div>
                }

                {/* the remote streams ... */}
                {
                    Object.entries(this.state.remoteStreams).map(([id, stream]) => (
                        stream._enabled !== false &&
                        <div key={"remote-stream-" + id} style="width: 300px; display: inline" >
                            <video
                            style="width: 300px; display: inline" 
                                id={"remote-video-" + id}
                                ref={ref => this.setRemoteVideoStream(ref, stream)}
                                autoPlay
                                playsInline
                            />
                        </div>
                    ))
                }

                <Notifications connected={this.state.connected} active={remoteUsers > 0} />

                <div >
                    {remoteUsers > 0 &&
                        <>
                            <IconButton  onClick={e => this.toggleCamera(e)}>
                                <FlipCameraIcon />
                            </IconButton>
                            <IconButton  onClick={e => this.toggleLocalStream(e)}>
                                {this.state.localDisabled ? <VideocamOnIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </>
                    }
                    {this.props.closeAction &&
                        <IconButton onClick={this.props.closeAction}>
                            <CancelIcon />
                        </IconButton>
                    }
                </div>
            </div >
        )
    }
}

export default  Video;