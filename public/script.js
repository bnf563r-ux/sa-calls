const socket = io();

let localStream;
let peer;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

function generateRoomId() {
    return Math.random().toString(36).substring(2, 7);
}

function createRoom() {
    const id = generateRoomId();
    document.getElementById("roomId").value = id;
    alert("رمز الغرفة: " + id);
}

async function joinRoom() {
    const roomId = document.getElementById("roomId").value;

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    localVideo.srcObject = localStream;

    socket.emit("join-room", roomId);
}

socket.on("user-joined", userId => {
    createPeer(userId, true);
});

socket.on("signal", data => {
    if (!peer) {
        createPeer(data.from, false);
    }
    peer.signal(data.signal);
});

socket.on("user-left", () => {
    if (peer) {
        peer.destroy();
        peer = null;
        remoteVideo.srcObject = null;
    }
});

function createPeer(userId, initiator) {
    peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: localStream,
        config: {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }
            ]
        }
    });

    peer.on("signal", signal => {
        socket.emit("signal", {
            to: userId,
            signal: signal
        });
    });

    peer.on("stream", stream => {
        remoteVideo.srcObject = stream;
    });

    peer.on("error", err => {
        console.error("Peer error:", err);
    });
}
