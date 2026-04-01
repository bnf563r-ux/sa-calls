const socket = io();

let localStream;
let peer;
let currentCamera = 0;
let videoTracks = [];

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const toggleCamBtn = document.getElementById("toggleCam");

function generateRoomId() {
    return Math.random().toString(36).substring(2, 7);
}

function createRoom() {
    const id = generateRoomId();
    document.getElementById("roomId").value = id;
    alert("رمز الغرفة: " + id);
}

// الحصول على الكاميرا والصوت
async function getCamera(cameraIndex = 0) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if(videoDevices.length === 0) return alert("لا يوجد كاميرا متاحة");
    const constraints = {
        video: { deviceId: { exact: videoDevices[cameraIndex].deviceId } },
        audio: true
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoTracks = localStream.getVideoTracks();
    localVideo.srcObject = localStream;
}

// الانضمام للغرفة
async function joinRoom() {
    const roomId = document.getElementById("roomId").value;
    if(!roomId) return alert("أدخل رمز الغرفة");

    await getCamera(currentCamera);

    socket.emit("join-room", roomId);
}

// تشغيل/إيقاف الكاميرا
toggleCamBtn.addEventListener("click", () => {
    if(!videoTracks.length) return;
    videoTracks.forEach(track => track.enabled = !track.enabled);
    toggleCamBtn.textContent = videoTracks[0].enabled ? "إيقاف الكاميرا" : "تشغيل الكاميرا";
});

// تبديل الكاميرا
document.getElementById("switchCam").addEventListener("click", async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if(videoDevices.length < 2) return alert("كاميرا واحدة فقط متاحة");
    currentCamera = (currentCamera + 1) % videoDevices.length;
    if(localStream) localStream.getTracks().forEach(track => track.stop());
    await getCamera(currentCamera);
    if(peer) {
        const sender = peer._pc.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(localStream.getVideoTracks()[0]);
    }
});

// استقبال انضمام شخص جديد
socket.on("user-joined", userId => {
    createPeer(userId, true);
});

// استقبال الإشارات
socket.on("signal", data => {
    if(!peer) createPeer(data.from, false);
    peer.signal(data.signal);
});

// شخص ترك الغرفة
socket.on("user-left", () => {
    if(peer) {
        peer.destroy();
        peer = null;
        remoteVideo.srcObject = null;
    }
});

// إنشاء الـ Peer
function createPeer(userId, initiator) {
    peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: localStream,
        config: {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "turn:numb.viagenie.ca", username: "demo@demo.com", credential: "muazkh" }
            ]
        }
    });

    peer.on("signal", signal => {
        socket.emit("signal", { to: userId, signal });
    });

    peer.on("stream", stream => {
        remoteVideo.srcObject = stream;
    });

    peer.on("error", err => console.error("Peer error:", err));
}
